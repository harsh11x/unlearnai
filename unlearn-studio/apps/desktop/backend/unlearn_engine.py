"""
Unlearn Engine — real, reversible weight surgery on a loaded state dict.

What this engine used to do
---------------------------
The previous implementation presented itself as gradient-based unlearning but
never ran a forward pass: its "forget loss" was ``-||W|| * 0.001`` applied to raw
weights, its "retain loss" was an L2 penalty, and its targets were selected by
matching keywords in tensor *names*, falling back to "the first half of the
tensors". Fake loss curves were then animated with ``time.sleep`` so the UI
looked like training. None of that measures or changes a capability.

What it does now
----------------
The same primitive the quantized path already uses: exact tensor edits, applied
to tensors the caller selected, recorded as real before/after statistics.

    node_ablation    zero the targeted tensors
    magnitude_prune  zero the smallest magnitudes (sparsify)
    noise_injection  add calibrated gaussian noise
    attenuate        scale the contribution down

This is a legitimate and well-established family of editing operations. It is
*not* gradient-based unlearning, and the engine says so in its own result rather
than implying otherwise.

Honesty rules enforced here
---------------------------
* No fabricated metrics. There is no loss curve because no training happens.
* No arbitrary tensor selection. If the target cannot be matched to tensors, the
  job fails with an explanation instead of quietly editing something unrelated.
* Every change is reversible: originals of exactly the touched tensors are kept
  and ``restore()`` puts them back in place.
"""

import threading
import time
import uuid
from typing import Any, Callable, Optional

# Methods that are meaningful on a state dict with no autograd graph.
SURGERY_METHODS = ("node_ablation", "magnitude_prune", "noise_injection", "attenuate")

# Gradient methods are accepted from the UI but cannot be honoured here; they are
# mapped onto the closest real operation and reported as such.
GRADIENT_ALIASES = {
    "gradient_forgetting": "node_ablation",
    "gradient_baseline": "node_ablation",
    "retain_aware": "attenuate",
    "knowledge_distill": "attenuate",
}

METHOD_DESCRIPTIONS = {
    "node_ablation": "zeroed",
    "magnitude_prune": "pruned",
    "noise_injection": "noised",
    "attenuate": "attenuated",
}


class UnlearnEngine:
    """
    Applies reversible tensor surgery to a model's state dict.

    ``original_state`` holds clones of only the tensors that were modified, which
    is what ``restore()`` needs and is far smaller than a full model copy.
    """

    def __init__(self):
        self.jobs: dict[str, dict] = {}
        self.original_state: dict[str, Any] = {}
        self.current_job: Optional[str] = None
        self._model: Optional[dict] = None
        self._lock = threading.Lock()

    # ── public API (unchanged names: server.py calls these) ──────────────

    def start(self, model: dict, config: dict, device, callback: Callable) -> str:
        """
        Run an edit job synchronously and return its id.

        Surgery on an in-memory state dict is fast and deterministic, so there is
        no worker thread to poll. The id is returned for the UI's polling loop,
        which will immediately see the finished job.
        """
        job_id = uuid.uuid4().hex[:8]
        config = dict(config or {})

        job = {
            "id": job_id,
            "job_id": job_id,
            "config": config,
            "status": "running",
            "phase": "preparing",
            "progress": 0,
            "metrics": {},
            "start_time": time.time(),
            "elapsed": 0,
            "nodes_erased": 0,
            "total_nodes": 0,
            "tensors_modified": [],
            "tensor_count": 0,
            "params_modified": 0,
            "failures": [],
            "cancelled": False,
        }
        with self._lock:
            self.jobs[job_id] = job
            self.current_job = job_id

        try:
            self._apply(model, config, job)
        except Exception as exc:  # never leave the UI polling a dead job
            job["status"] = "failed"
            job["phase"] = "error"
            job["error"] = str(exc)
            job["progress"] = 100
        job["elapsed"] = round(time.time() - job["start_time"], 2)

        if callback:
            try:
                callback(job_id, job)
            except Exception:
                pass
        return job_id

    def get_progress(self, job_id: str) -> dict:
        job = self.jobs.get(job_id)
        if job is None:
            return {"error": "Job not found"}
        job["elapsed"] = round(time.time() - job["start_time"], 2)
        return job

    def cancel(self, job_id: str) -> None:
        job = self.jobs.get(job_id)
        if job is not None:
            job["cancelled"] = True

    def stop(self) -> None:
        """Stop the current job and put the modified tensors back."""
        self.restore()

    def restore(self) -> int:
        """
        Undo every recorded edit, in place.

        Returns the number of tensors restored. The base model is never
        rewritten to disk, so this is exact rather than approximate.
        """
        restored = 0
        with self._lock:
            if self._model is None:
                self.original_state = {}
                return 0
            for name, original in self.original_state.items():
                tensor = self._model.get(name)
                if tensor is None:
                    continue
                try:
                    tensor.copy_(original)
                    restored += 1
                except Exception:
                    continue
            self.original_state = {}
        return restored

    # ── implementation ──────────────────────────────────────────────────

    def _apply(self, model, config: dict, job: dict) -> None:
        if not isinstance(model, dict) or not model:
            raise ValueError("no model weights are loaded")

        import torch  # local import keeps this module importable without torch

        self._model = model
        job["total_nodes"] = len(model)

        requested_method = str(config.get("method", "node_ablation"))
        method = requested_method
        remapped = False
        if method not in SURGERY_METHODS:
            method = GRADIENT_ALIASES.get(method, "node_ablation")
            remapped = True
        job["method"] = method
        job["technique"] = "weight surgery on a loaded state dict"
        if remapped:
            job["method_remapped_from"] = requested_method

        names, targeting = self._select_tensors(model, config, torch)
        if not names:
            target = str(config.get("target") or "(none)").strip()
            available = [n for n in model if hasattr(model[n], "shape")]
            sample = ", ".join(available[:8]) if available else "none"
            job["status"] = "failed"
            job["phase"] = "error"
            job["progress"] = 100
            job["error"] = (
                f"No tensors matched target '{target}'. This engine will not pick "
                f"tensors arbitrarily, because editing unrelated weights would not "
                f"do what the target implies. Pass explicit tensor names via "
                f"config['nodes']. Available tensors include: {sample}"
            )
            return
        job["targeting"] = targeting

        op, params = self._operation_for(method, config, torch)

        details = []
        failures = []
        params_modified = 0

        for index, name in enumerate(names):
            tensor = model.get(name)
            if tensor is None or not hasattr(tensor, "float"):
                failures.append(f"{name}: not a tensor")
                continue
            try:
                before = tensor.detach().float()
                prior_zeros = int((before == 0).sum())
                prior_abs_mean = float(before.abs().mean()) if before.numel() else 0.0

                if name not in self.original_state:
                    self.original_state[name] = tensor.detach().clone()

                with torch.no_grad():
                    edited = op(before, params)

                tensor.copy_(edited.to(tensor.dtype))

                after = tensor.detach().float()
                changed = int((after != before).sum())
                zeros_after = int((after == 0).sum())
                params_modified += changed

                details.append(
                    {
                        "tensor": name,
                        "shape": list(tensor.shape),
                        "params": int(before.numel()),
                        "changed": changed,
                        "zero_delta": zeros_after - prior_zeros,
                        "abs_mean_before": round(prior_abs_mean, 6),
                        "abs_mean_after": round(
                            float(after.abs().mean()) if after.numel() else 0.0, 6
                        ),
                    }
                )
            except Exception as exc:
                failures.append(f"{name}: {exc}")

            job["progress"] = round((index + 1) / len(names) * 100, 1)

        if not details:
            job["status"] = "failed"
            job["phase"] = "error"
            job["progress"] = 100
            job["error"] = "None of the selected tensors could be modified."
            job["failures"] = failures
            return

        job["tensors_modified"] = [d["tensor"] for d in details]
        job["tensor_count"] = len(details)
        job["params_modified"] = int(params_modified)
        job["nodes_erased"] = int(params_modified)
        job["details"] = details
        job["failures"] = failures
        job["status"] = "completed"
        job["phase"] = "completed"
        job["progress"] = 100

        verb = METHOD_DESCRIPTIONS.get(method, "modified")
        note = ""
        if remapped:
            note = (
                f" (requested '{requested_method}', which needs gradients; applied "
                f"'{method}' instead — this model was loaded as weights only)"
            )
        job["message"] = (
            f"{verb} {len(details)} tensor(s), {int(params_modified):,} parameters "
            f"changed{note}. Review the changes in Properties, then export to "
            f"Safetensors. Edit → Restore undoes this exactly."
        )

    def _select_tensors(self, model: dict, config: dict, torch) -> tuple[list[str], str]:
        """
        Choose tensors from an explicit list or a name match. Never guesses.

        Returns ``(names, how_the_selection_was_made)``.
        """
        nodes = [n for n in (config.get("nodes") or []) if n in model]
        if nodes:
            return nodes, "explicit tensor list"

        target = str(config.get("target") or "").strip().lower()
        if not target:
            return [], "no target"

        # Match on the tensor name only. A name containing "python" is a weak
        # signal at best, so the result records that this is a heuristic.
        matches = [name for name in model if target in name.lower()]
        if matches:
            return matches, f"heuristic name match on '{target}'"

        return [], "no match"

    def _operation_for(self, method: str, config: dict, torch):
        """Return ``(callable, params)`` for one surgery method."""
        if method == "node_ablation":
            return (lambda values, _p: torch.zeros_like(values)), {}

        if method == "attenuate":
            factor = float(config.get("factor", config.get("retain_weight", 0.25) or 0.25))
            factor = max(0.0, min(1.0, factor))
            return (lambda values, p: values * p["factor"]), {"factor": factor}

        if method == "noise_injection":
            std = float(config.get("noise_std", 0.02))

            def add_noise(values, p):
                generator = torch.Generator(device="cpu").manual_seed(
                    int(config.get("seed", 42))
                )
                noise = torch.randn(values.shape, generator=generator) * p["std"]
                return values + noise.to(values.dtype)

            return add_noise, {"std": std}

        # magnitude_prune: keep the largest magnitudes, zero the rest.
        fraction = float(config.get("fraction", 0.35))

        def prune(values, p):
            if values.numel() == 0:
                return values
            threshold = torch.quantile(values.abs().flatten().float(), p["fraction"])
            return torch.where(values.abs() <= threshold, torch.zeros_like(values), values)

        return prune, {"fraction": max(0.0, min(0.99, fraction))}
