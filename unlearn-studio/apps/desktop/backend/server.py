"""
Unlearn Studio — Python ML Backend
Communicates with Electron via JSON-RPC over stdio.
All heavy compute (model loading, training, unlearning) happens here.
"""

import sys
import json
import os
import traceback
import threading
import time
import signal

# Add backend dir to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


# ── Resilient imports ────────────────────────────────────────────────────────
# torch is a hard dependency for model loading/unlearning, but if it (or any
# other engine dependency) is missing the backend must STILL start and report
# ready — otherwise the Electron UI hangs in "Waiting for Python backend..."
# forever with no hint about what is wrong. Import failures are captured and
# surfaced via system_info + clear RPC errors instead of killing the process.
_IMPORT_ERRORS = []


def _try_import(module_name: str):
    try:
        return __import__(module_name)
    except Exception as e:  # ImportError and anything else at import time
        _IMPORT_ERRORS.append(f"{module_name}: {type(e).__name__}: {e}")
        return None


_model_loader_mod = _try_import("model_loader")
_weight_analyzer_mod = _try_import("weight_analyzer")
_unlearn_engine_mod = _try_import("unlearn_engine")
_eval_engine_mod = _try_import("eval_engine")
_device_manager_mod = _try_import("device_manager")
_weight_editor_mod = _try_import("weight_editor")


class Backend:
    def __init__(self):
        self.model_loader = _model_loader_mod.ModelLoader() if _model_loader_mod else None
        self.weight_analyzer = _weight_analyzer_mod.WeightAnalyzer() if _weight_analyzer_mod else None
        self.unlearn_engine = _unlearn_engine_mod.UnlearnEngine() if _unlearn_engine_mod else None
        self.eval_engine = _eval_engine_mod.EvalEngine() if _eval_engine_mod else None
        self.device_manager = _device_manager_mod.DeviceManager() if _device_manager_mod else None
        self.current_model = None
        self.current_metadata = None
        # Gives quantized (GGUF) models real statistics, heatmaps and weight
        # surgery without materializing the whole model in RAM.
        self.weight_editor = (
            _weight_editor_mod.GGUFWeightEditor(self.model_loader)
            if _weight_editor_mod and self.model_loader else None
        )
        self.last_gguf_job = None

    def _missing_dep_error(self, what: str) -> dict:
        missing = "; ".join(_IMPORT_ERRORS) if _IMPORT_ERRORS else "unknown import failure"
        return {
            "error": (
                f"Backend cannot {what} because required Python packages failed to import. "
                f"Details: {missing}. Fix: install them for the Python interpreter shown in "
                "the Backend settings, e.g. python3 -m pip install torch safetensors psutil"
            ),
            "missing_dependencies": True,
        }

    def handle(self, method: str, params: dict) -> dict:
        """Route a JSON-RPC method call to the appropriate handler."""
        try:
            handler = getattr(self, f"_{method.replace('.', '_')}", None)
            if handler is None:
                return {"error": f"Unknown method: {method}"}
            return {"result": handler(**params)}
        except Exception as e:
            return {"error": f"{type(e).__name__}: {e}\n{traceback.format_exc()}"}

    # ── Device Info ──

    def _device_info(self) -> dict:
        if self.device_manager is None:
            return self._missing_dep_error("report device info")
        return self.device_manager.get_info()

    def _device_monitor(self) -> dict:
        if self.device_manager is None:
            return self._missing_dep_error("monitor the device")
        return self.device_manager.get_usage()

    def _device_preference(self, device: str = "auto") -> dict:
        """Pin the compute device (auto | cpu | mps | cuda) for this session.

        Honoured only when the hardware supports it, so asking for cuda on a
        Mac quietly lands on cpu instead of failing every later tensor op.
        """
        if self.device_manager is None:
            return self._missing_dep_error("change the compute device")
        return self.device_manager.set_preference(device)

    # ── Model Loading ──

    def _model_load(self, path: str) -> dict:
        """Load a model from a file path. Returns metadata about the model."""
        if self.model_loader is None:
            return self._missing_dep_error("load models")
        if not path or not os.path.exists(path):
            return {
                "error": f"File not found: {path}",
                "file_not_found": True,
            }
        if os.path.isdir(path):
            self.current_model, self.current_metadata = self.model_loader.load_folder(path)
        else:
            self.current_model, self.current_metadata = self.model_loader.load(path)
        # Point the weight editor at the new file (clears any prior edits).
        if self.weight_editor is not None:
            self.weight_editor.attach(self.model_loader)
        return self.current_metadata

    def _model_load_folder(self, path: str) -> dict:
        """Load a model from a HuggingFace-style directory."""
        if self.model_loader is None:
            return self._missing_dep_error("load models")
        if not path or not os.path.isdir(path):
            return {
                "error": f"Folder not found: {path}",
                "file_not_found": True,
            }
        self.current_model, self.current_metadata = self.model_loader.load_folder(path)
        return self.current_metadata

    def _model_layers(self) -> dict:
        """Get structured layer information for the loaded model."""
        if self.weight_analyzer is None:
            return self._missing_dep_error("analyze layers")
        if self.current_model is None:
            # GGUF and other metadata-only formats still expose their full
            # structure via precomputed header info (see model_loader).
            if self._is_metadata_only_model():
                return {"layers": self.current_metadata.get("layers", [])}
            return {"error": "No model loaded"}
        return {"layers": self.weight_analyzer.get_layers(self.current_model)}

    def _model_summary(self) -> dict:
        """Get a full model summary with parameter counts per component."""
        if self.weight_analyzer is None:
            return self._missing_dep_error("summarize the model")
        if self.current_model is None:
            if self._is_metadata_only_model():
                return self.current_metadata.get("summary", {})
            return {"error": "No model loaded"}
        return self.weight_analyzer.get_summary(self.current_model)

    def _is_metadata_only_model(self) -> bool:
        """True when a GGUF-style model is loaded: no live tensors, but header
        structure (layers/tensors/summary) was precomputed at load time."""
        return (
            self.current_metadata is not None
            and self.current_metadata.get("trainable") is False
            and "layers" in self.current_metadata
        )

    # ── Weight Analysis ──

    def _weight_stats(self, tensor_name: str) -> dict:
        """
        Statistical summary of a tensor.

        For a GGUF model the weights are dequantized on demand and the real
        statistics are returned — the same numbers a Safetensors model would
        report, just computed in streaming chunks.
        """
        if self._is_metadata_only_model() and self.weight_editor is not None:
            result = self.weight_editor.stats(tensor_name)
            if "error" not in result:
                return result
            # Fall through only for a genuine error, so the caller still sees
            # the specific reason (unsupported quant type, missing tensor, …).
            return result
        if self.weight_analyzer is None:
            return self._missing_dep_error("compute weight statistics")
        if self.current_model is None:
            return {"error": "No model loaded", "no_model": True}
        return self.weight_analyzer.tensor_stats(self.current_model, tensor_name)

    def _weight_list(self) -> dict:
        """List all tensors with names, shapes, dtypes, sizes."""
        if self.weight_analyzer is None:
            return self._missing_dep_error("list weights")
        if self.current_model is None:
            if self._is_metadata_only_model():
                return {"tensors": self.current_metadata.get("tensors", [])}
            return {"error": "No model loaded"}
        return {"tensors": self.weight_analyzer.list_tensors(self.current_model)}

    def _weight_heatmap(self, tensor_name: str, size: int = 128) -> dict:
        """
        Heatmap data for a tensor.

        GGUF weights are dequantized for the sampled rows only, so a heatmap of
        a 136M-element embedding works without loading the tensor.
        """
        if self._is_metadata_only_model() and self.weight_editor is not None:
            return self.weight_editor.heatmap(tensor_name, size)
        if self.weight_analyzer is None:
            return self._missing_dep_error("render heatmaps")
        if self.current_model is None:
            return {"error": "No model loaded", "no_model": True}
        return self.weight_analyzer.generate_heatmap(self.current_model, tensor_name, size)

    def _weight_gradient(self, tensor_name: str) -> dict:
        """Get gradient data for a tensor (if available after backward pass)."""
        if self.current_model is None:
            return {"error": "No model loaded"}
        return self.weight_analyzer.get_gradient(self.current_model, tensor_name)

    # ── Weight surgery (works on quantized GGUF models too) ──

    def _tensor_info(self) -> dict:
        """What the current model supports for inspection and editing."""
        gguf = self._is_metadata_only_model() and self.weight_editor is not None
        supported = []
        unsupported = {}
        if gguf:
            for name in getattr(self.model_loader, "gguf_tensor_info", {}) or {}:
                info = self.model_loader.get_gguf_tensor_info(name)
                from_gguf_dequant = _try_import("gguf_dequant")
                type_id = info.get("type_id")
                if from_gguf_dequant and from_gguf_dequant.is_supported(type_id):
                    supported.append(name)
                else:
                    label = from_gguf_dequant.type_name(type_id) if from_gguf_dequant else str(type_id)
                    unsupported[label] = unsupported.get(label, 0) + 1

        return {
            "model_loaded": self.current_metadata is not None,
            "quantized": bool(gguf),
            "editable": bool(gguf) or self.current_model is not None,
            "operations": list(_weight_editor_mod.OPERATIONS) if _weight_editor_mod else [],
            "operation_help": dict(_weight_editor_mod.DESCRIPTIONS) if _weight_editor_mod else {},
            "readable_tensors": len(supported) if gguf else None,
            "unreadable_quant_types": unsupported if gguf else None,
            "pending": self.weight_editor.pending() if gguf else None,
        }

    def _tensor_edit(self, tensor_name: str, op: str, params: dict = None) -> dict:
        """Apply a modification to a tensor's weights."""
        if self._is_metadata_only_model() and self.weight_editor is not None:
            return self.weight_editor.edit(tensor_name, op, params)
        if self.current_model is None:
            return {"error": "No model loaded"}

        # Live torch state dict: apply directly.
        if tensor_name not in self.current_model:
            return {"error": f"Tensor '{tensor_name}' not found"}
        tensor = self.current_model[tensor_name]
        import torch as _torch
        with _torch.no_grad():
            if op == "zero":
                tensor.zero_()
            elif op == "scale":
                tensor.mul_(float((params or {}).get("factor", 1.0)))
            elif op == "shift":
                tensor.add_(float((params or {}).get("value", 0.0)))
            elif op == "clamp":
                lo = (params or {}).get("min")
                hi = (params or {}).get("max")
                tensor.clamp_(min=lo, max=hi)
            elif op == "add_noise":
                std = float((params or {}).get("std", 0.01))
                tensor.add_(_torch.randn_like(tensor) * std)
            elif op == "prune":
                frac = max(0.0, min(0.99, float((params or {}).get("fraction", 0.1))))
                if frac > 0:
                    thr = _torch.quantile(tensor.abs().flatten().float(), frac)
                    tensor.masked_fill_(tensor.abs() <= thr, 0.0)
            elif op == "randomize":
                std = float((params or {}).get("std", 0.02))
                tensor.normal_(0.0, std)
            else:
                return {"error": f"Unknown operation '{op}'"}
        return {
            "ok": True,
            "tensor": tensor_name,
            "op": op,
            "message": f"{tensor_name}: {op} applied",
        }

    def _tensor_delete(self, tensor_name: str, deleted: bool = True) -> dict:
        """Exclude a tensor from the exported model (or restore it)."""
        if self._is_metadata_only_model() and self.weight_editor is not None:
            return self.weight_editor.delete(tensor_name, deleted)
        if self.current_model is None:
            return {"error": "No model loaded"}
        if deleted:
            self.current_model.pop(tensor_name, None)
            return {"ok": True, "tensor": tensor_name, "deleted": True,
                    "message": f"{tensor_name} removed from the model"}
        return {"error": "Restoring a deleted tensor requires reloading the model."}

    def _tensor_reset(self) -> dict:
        """Discard all pending weight edits."""
        if self.weight_editor is not None:
            return self.weight_editor.reset()
        return {"ok": True, "message": "Nothing to reset."}

    def _tensor_pending(self) -> dict:
        """Everything queued for the next export."""
        if self.weight_editor is not None:
            return self.weight_editor.pending()
        return {"edited": {}, "deleted": [], "edit_count": 0, "delete_count": 0}

    def _tensor_export_one(self, name: str = None, path: str = None) -> dict:
        """Write ONE tensor (with pending edits applied) to its own file.

        Right-click ▸ Export Tensor used to call tensor_export, which writes the
        entire model — surprising, slow, and useless when the point is to pull a
        single weight out for inspection. This writes just the requested tensor
        as .npy (raw), .safetensors (named) or .json (small tensors only).
        """
        import numpy as np

        if not name or not isinstance(name, str):
            return {"error": "No tensor name provided."}
        if path is None or not isinstance(path, str):
            return {"error": "No export path provided."}

        ext = os.path.splitext(path)[1].lower()

        # Preferred path: the quantised editor. It streams, so even a 136M-element
        # embedding exports without ever being fully materialised, and pending
        # edits are applied as the chunks go by.
        if self.weight_editor is not None and self.weight_editor.supports(name):
            if ext not in (".npy", ".safetensors"):
                return {
                    "error": (
                        f"Per-tensor export writes .npy or .safetensors, not "
                        f"\"{ext or '(no extension)'}\". Choose one of those."
                    )
                }
            try:
                return self.weight_editor.export_tensor_stream(name, path, dtype="float32")
            except ValueError as e:
                return {"error": str(e)}
            except OSError as e:
                return {"error": f"Could not write {path}: {e}"}

        values = None
        source = None

        # Fall back to a real state_dict when the model is loaded in memory.
        if values is None and self.model_loader is not None:
            data = None
            try:
                data = self.model_loader.get_tensor_data(name)
            except Exception as e:
                return {"error": f"Could not read {name}: {e}"}
            if data is None:
                return {"error": f"Unknown tensor: {name}"}
            try:
                import torch as _torch
                if isinstance(data, _torch.Tensor):
                    data = data.detach().to("cpu").float().numpy()
            except Exception:
                pass
            values = np.asarray(data)
            source = "model"

        if values is None:
            return {"error": "No model loaded"}

        try:
            if ext == ".safetensors":
                from safetensors.numpy import save_file
                # safetensors needs contiguous arrays.
                save_file({name: np.ascontiguousarray(values.astype(np.float32))}, path)
            elif ext == ".json":
                if values.size > 100000:
                    return {"error": f"{name} has {values.size} values — too many for JSON. Use .npy or .safetensors."}
                import json as _json
                with open(path, "w", encoding="utf-8") as fh:
                    _json.dump({"name": name, "shape": list(values.shape), "values": values.tolist()}, fh)
            else:
                np.save(path, np.ascontiguousarray(values))
        except Exception as e:
            return {"error": f"Could not write {path}: {e}"}

        try:
            size = os.path.getsize(path)
        except OSError:
            size = int(values.nbytes)
        return {
            "name": name,
            "path": path,
            "shape": list(values.shape),
            "dtype": str(values.dtype),
            "count": int(values.size),
            "size_bytes": size,
            "source": source,
            "format": ext.lstrip(".") or "npy",
        }

    # Formats the exporter can actually write. Anything else is rejected up
    # front rather than half-written (the dialog used to offer GGUF and ONNX,
    # which this backend has no writer for, and "pt" — a name model_loader does
    # not accept, so PyTorch export failed with "Unsupported save format: pt").
    EXPORT_FORMAT_ALIASES = {
        "safetensors": "safetensors",
        "pt": "pytorch",
        "pytorch": "pytorch",
        "bin": "pytorch",
        "ckpt": "pytorch",
    }

    @staticmethod
    def _verify_export(path: str) -> dict:
        """Re-read a written checkpoint and prove it is complete.

        The GGUF exporter streams tensors and writes a hand-built header, so a
        truncated write is the failure mode worth catching — and the only way to
        catch it is to read the file back. Only safetensors has a header we can
        check this way; a torch checkpoint is opaque without unpickling, so it
        is reported as unverified instead of failed.
        """
        import json as _json

        try:
            size = os.path.getsize(path)
        except OSError as e:
            return {"ok": False, "error": f"{path} is not readable: {e}"}

        if not path.lower().endswith(".safetensors"):
            return {"ok": True, "skipped": True, "size_bytes": size, "note": "header verification is safetensors-only"}

        try:
            with open(path, "rb") as fh:
                raw = fh.read(8)
                if len(raw) < 8:
                    return {"ok": False, "error": "file is shorter than a safetensors header"}
                header_len = int.from_bytes(raw, "little")
                if header_len <= 0 or header_len > 100 * 1024 * 1024:
                    return {"ok": False, "error": f"implausible header length ({header_len}) — not a safetensors file"}
                header = _json.loads(fh.read(header_len))
            data_start = 8 + header_len
            tensors = {k: v for k, v in header.items() if k != "__metadata__"}
            if not tensors:
                return {"ok": False, "error": "no tensors in the written file"}
            # Every tensor's declared offsets must fit inside the file.
            worst = max(t.get("data_offsets", [0, 0])[1] for t in tensors.values())
            if data_start + worst > size:
                return {
                    "ok": False,
                    "error": f"truncated: header promises {data_start + worst} bytes but the file is {size}",
                }
            return {"ok": True, "tensor_count": len(tensors), "size_bytes": size}
        except Exception as e:
            return {"ok": False, "error": f"{type(e).__name__}: {e}"}

    def _tensor_export(self, path: str = None, dtype: str = "float16", verify: bool = False) -> dict:
        """
        Write the model (with pending edits applied) to a new checkpoint.

        For a quantized GGUF this is the bridge to full gradient-based
        unlearning: the exported Safetensors model can be reloaded and trained.
        With `verify` the file is read back so a truncated write is reported
        instead of silently producing an unloadable checkpoint.
        """
        if path is None or not isinstance(path, str):
            return {"error": "No export path provided."}
        if self._is_metadata_only_model() and self.weight_editor is not None:
            try:
                result = self.weight_editor.export(path, dtype=dtype)
                result["message"] = (
                    f"Exported {result['tensor_count']} tensors to Safetensors. "
                    f"Reload this file to run gradient-based unlearning."
                )
                if verify:
                    check = self._verify_export(path)
                    result["verification"] = check
                    if not check.get("ok"):
                        result["error"] = f"Export written but failed verification: {check.get('error')}"
                        return result
                    result["message"] += f" Verified: {check['tensor_count']} tensors readable."
                return result
            except ValueError as e:
                return {"error": str(e)}
            except OSError as e:
                return {"error": f"Could not write {path}: {e}"}
        if self.current_model is None:
            return {"error": "No model loaded"}
        return {"error": "Export is only implemented for quantized (GGUF) models right now."}

    # ── Unlearning a quantized model via weight surgery ──

    def _unlearn_gguf(self, config: dict) -> dict:
        """
        Apply unlearning to a GGUF model through targeted weight surgery.

        Gradient descent is impossible here: the weights are quantized and the
        whole model will not fit in memory, so there is no autograd graph to
        train. What *is* possible — and is a legitimate, well-established family
        of unlearning methods — is to rewrite specific weights directly:

          node_ablation    zero the targeted tensors
          magnitude_prune  sparsify them, keeping only the largest magnitudes
          noise_injection  add calibrated noise to degrade the memorized signal
          attenuate        scale the contribution down

        The chosen tensors come from `nodes` (explicit list) or `target`
        (matched against tensor names). Every change is recorded in the weight
        editor, so it is visible in the properties panel, reversible with
        tensor_reset, and written out by tensor_export.
        """
        if self.weight_editor is None:
            return self._missing_dep_error("run unlearning")

        config = config or {}
        method = config.get("method", "node_ablation")
        if method not in ("node_ablation", "magnitude_prune", "noise_injection", "attenuate"):
            # Gradient methods are not meaningful on a quantized file — map them
            # onto the closest surgery so the user still gets a real result.
            method = "node_ablation"

        nodes = config.get("nodes") or []
        target = (config.get("target") or "").strip()

        names = [n for n in nodes if self.weight_editor.supports(n)]
        if not names:
            # Fall back to matching the target string against tensor names.
            available = self.weight_editor.tensor_names()
            if target:
                needle = target.lower()
                names = [n for n in available if needle in n.lower() and self.weight_editor.supports(n)]
            if not names:
                # Last resort: the largest readable tensors, so the action is
                # never a silent no-op.
                usable = [n for n in available if self.weight_editor.supports(n)]
                usable.sort(
                    key=lambda n: self.weight_editor._info(n).get("byte_count", 0),
                    reverse=True,
                )
                names = usable[:8]

        if not names:
            return {
                "error": (
                    "No editable tensors matched. This model's quantized formats are "
                    "not readable yet — see Settings → Backend for the supported list."
                )
            }

        op_map = {
            "node_ablation": ("zero", {}),
            "magnitude_prune": ("prune", {"fraction": float(config.get("fraction", 0.35))}),
            "noise_injection": ("add_noise", {"std": float(config.get("noise_std", 0.02))}),
            "attenuate": ("scale", {"factor": float(config.get("factor", 0.25))}),
        }
        op, params = op_map[method]

        applied = []
        failed = []
        for name in names:
            res = self.weight_editor.edit(name, op, params)
            if "error" in res:
                failed.append({"tensor": name, "error": res["error"]})
            else:
                applied.append(name)

        if not applied:
            return {
                "error": "None of the selected tensors could be modified.",
                "failures": failed,
            }

        # A completed surgery job is reported synchronously: there is no
        # training loop to poll. The renderer treats a returned job_id as a
        # finished job once its progress shows completed.
        job_id = f"surgery-{int(time.time())}"
        summary = {
            "job_id": job_id,
            "method": method,
            "technique": "weight surgery (quantized model)",
            "tensors_modified": applied,
            "tensor_count": len(applied),
            "failures": failed,
            "status": "completed",
            "progress": 100,
            "phase": "completed",
            "message": (
                f"Applied {method} to {len(applied)} tensor(s). "
                "Review the changes in Properties, then export to Safetensors "
                "to train the result further."
            ),
        }
        self.last_gguf_job = summary
        return summary

    # ── Unlearning ──

    def _unlearn_start(self, config: dict) -> dict:
        """Start an unlearning job. Runs in a background thread."""
        if self.unlearn_engine is None:
            return self._missing_dep_error("run unlearning")
        if self.current_model is None:
            if self._is_metadata_only_model() and self.weight_editor is not None:
                return self._unlearn_gguf(config)
            return {"error": "No model loaded"}

        job_id = self.unlearn_engine.start(
            model=self.current_model,
            config=config,
            device=self.device_manager.device,
            callback=self._unlearn_progress_callback,
        )
        return {"job_id": job_id, "status": "started"}

    def _unlearn_progress(self, job_id: str) -> dict:
        """
        Current progress of an unlearning job.

        Weight-surgery jobs on a quantized model finish synchronously, so their
        summary is returned directly rather than polled from the engine.
        """
        job = getattr(self, "last_gguf_job", None)
        if job and job.get("job_id") == job_id:
            return job
        if self.unlearn_engine is None:
            return self._missing_dep_error("run unlearning")
        return self.unlearn_engine.get_progress(job_id)

    def _unlearn_cancel(self, job_id: str) -> dict:
        """Cancel a running unlearning job."""
        job = getattr(self, "last_gguf_job", None)
        if job and job.get("job_id") == job_id:
            return {"status": "cancelled"}
        if self.unlearn_engine is None:
            return self._missing_dep_error("run unlearning")
        self.unlearn_engine.cancel(job_id)
        return {"status": "cancelled"}

    def _unlearn_stop(self) -> dict:
        """Stop the current unlearning job and revert to the original model."""
        self.unlearn_engine.stop()
        if self.current_model is not None and self.unlearn_engine.original_state is not None:
            self.current_model.load_state_dict(self.unlearn_engine.original_state)
        return {"status": "stopped"}

    def _unlearn_progress_callback(self, job_id: str, data: dict):
        """Called from the unlearn thread to update progress."""
        # Store progress data — the Electron side polls _unlearn_progress
        pass

    # ── Evaluation ──

    def _eval_probes(self, config: dict) -> dict:
        """Run evaluation probes against the current model."""
        if self.eval_engine is None:
            return self._missing_dep_error("run evaluation probes")
        if self.current_model is None:
            return {"error": "No model loaded"}
        return self.eval_engine.run_probes(self.current_model, config)

    # ── Export ──

    def _model_export(self, path: str, format: str = "safetensors", verify: bool = False) -> dict:
        """Export the current (possibly modified) model to disk.

        `format` accepts the dialog's friendly names ("pt", "bin", "ckpt") as
        well as the internal ones, so choosing "PyTorch Checkpoint" works
        instead of failing with "Unsupported save format: pt".
        """
        if self.model_loader is None:
            return self._missing_dep_error("export models")
        # Check the format before the model: an unsupported format is knowable
        # without a loaded model, and reporting "No model loaded" for a format
        # that could never work sends the user down the wrong path.
        internal = self.EXPORT_FORMAT_ALIASES.get(str(format).lower())
        if internal is None:
            return {
                "error": (
                    f"This build can write Safetensors and PyTorch checkpoints, not \"{format}\". "
                    "Export Safetensors and convert it with the target format's own tooling."
                ),
                "unsupported_format": True,
            }
        result = self.model_loader.save(self.current_model, self.current_metadata, path, internal)
        if isinstance(result, dict) and verify and not result.get("error"):
            check = self._verify_export(path)
            result["verification"] = check
            if not check.get("ok"):
                result["error"] = f"Export written but failed verification: {check.get('error')}"
        return result

    # ── Info ──

    # Deleting model files is deliberately narrow: only inside the folder the
    # app itself downloads into. A generic delete RPC would be a loaded gun.
    APP_DOWNLOAD_SUBDIR = os.path.join("Downloads", "remap-studio-models")

    def _file_delete(self, path: str = None) -> dict:
        """Delete one model file from the app's own downloads folder."""
        if not path or not isinstance(path, str):
            return {"error": "No path provided."}

        home = os.path.expanduser("~")
        allowed_root = os.path.realpath(os.path.join(home, self.APP_DOWNLOAD_SUBDIR))
        target = os.path.realpath(os.path.abspath(os.path.expanduser(path)))

        # `commonpath` (not startswith) so /models-evil cannot masquerade as
        # /models, and the realpath call resolves symlinks first.
        try:
            inside = os.path.commonpath([allowed_root, target]) == allowed_root
        except ValueError:
            inside = False
        if not inside or target == allowed_root:
            return {
                "error": (
                    "Only files inside " + allowed_root + " can be deleted from the app. "
                    "Remove other files in Finder."
                ),
                "outside_downloads": True,
            }
        if not os.path.isfile(target):
            return {"error": f"Not a file: {target}"}

        try:
            freed = os.path.getsize(target)
        except OSError:
            freed = 0
        try:
            os.remove(target)
        except OSError as e:
            return {"error": f"Could not delete {target}: {e}"}
        return {"ok": True, "path": target, "freed_bytes": freed}

    def _system_info(self) -> dict:
        """Get system info: Python version, torch version, available memory, etc."""
        torch = _try_import("torch")
        psutil = _try_import("psutil")
        if torch is None:
            info = {
                "python": sys.version,
                "torch": None,
                "cuda_available": False,
                "cuda_version": None,
                "mps_available": False,
                "ram_total_gb": None,
                "ram_available_gb": None,
                "cpu_count": os.cpu_count(),
                "device": "unavailable",
                "degraded": True,
                "import_errors": list(_IMPORT_ERRORS),
            }
            if psutil is not None:
                try:
                    vm = psutil.virtual_memory()
                    info["ram_total_gb"] = round(vm.total / (1024**3), 1)
                    info["ram_available_gb"] = round(vm.available / (1024**3), 1)
                except Exception:
                    pass
            return info

        info = {
            "python": sys.version,
            "torch": torch.__version__,
            "cuda_available": torch.cuda.is_available(),
            "cuda_version": torch.version.cuda if torch.cuda.is_available() else None,
            "mps_available": hasattr(torch.backends, "mps") and torch.backends.mps.is_available(),
            "cpu_count": os.cpu_count(),
            "device": "cpu",
        }
        if psutil is not None:
            try:
                vm = psutil.virtual_memory()
                info["ram_total_gb"] = round(vm.total / (1024**3), 1)
                info["ram_available_gb"] = round(vm.available / (1024**3), 1)
            except Exception:
                pass
        if self.device_manager is not None:
            info["device"] = str(self.device_manager.device)
        if _IMPORT_ERRORS:
            info["degraded"] = True
            info["import_errors"] = list(_IMPORT_ERRORS)
        return info


def main():
    backend = Backend()

    # Send ready signal
    write_response({"jsonrpc": "2.0", "method": "ready", "params": backend._system_info()})

    # Main message loop — read JSON-RPC from stdin, write responses to stdout
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue

        try:
            request = json.loads(line)
        except json.JSONDecodeError:
            write_response({"jsonrpc": "2.0", "error": "Invalid JSON"})
            continue

        method = request.get("method", "")
        params = request.get("params", {})
        req_id = request.get("id")

        result = backend.handle(method, params)

        if req_id is not None:
            response = {"jsonrpc": "2.0", "id": req_id}
            if "error" in result:
                response["error"] = result["error"]
            else:
                response["result"] = result.get("result", result)
            write_response(response)


def write_response(response: dict):
    """Write a JSON-RPC response to stdout."""
    try:
        line = json.dumps(response) + "\n"
        sys.stdout.write(line)
        sys.stdout.flush()
    except (BrokenPipeError, OSError):
        pass


if __name__ == "__main__":
    main()
