"""
Weight editor — real inspection and surgery on quantized (GGUF) models.

Design constraints that shaped this module:

* The target machine has ~1.3 GB of free RAM, while a 0.5B-parameter Q4_K_M
  model expands to ~2.5 GB as float32. Nothing here may materialize a whole
  model, so every operation works in blocks and streams.

* Edits are recorded as an *edit log* rather than by rewriting files. Statistics
  and heatmaps apply the log to the values they read, and `export()` replays it
  while streaming a new checkpoint. That keeps every operation O(block) in
  memory no matter how large the model is.

* Export writes the safetensors container directly, one tensor at a time, so a
  converted model never has to exist in memory in full.
"""

import json
import math
import os
import struct
from typing import Optional

import numpy as np

import gguf_dequant as gq


# Supported per-tensor operations.
OPERATIONS = (
    "zero",        # set every weight to 0 (ablation / node deletion)
    "scale",       # multiply by a factor
    "clamp",       # clip to [min, max]
    "add_noise",   # add gaussian noise of a given std
    "prune",       # zero the smallest |w| fraction (sparsity)
    "randomize",   # re-initialize with a normal distribution
    "shift",       # add a constant
    "restore",     # discard the recorded edits for this tensor
)

DESCRIPTIONS = {
    "zero": "Zero every weight in this tensor. The layer stops contributing — the standard way to ablate/delete a node.",
    "scale": "Multiply all weights by a factor. Use < 1 to attenuate a layer, > 1 to amplify it.",
    "clamp": "Clip weights into a range, removing outliers.",
    "add_noise": "Add gaussian noise. A small amount degrades a capability gradually.",
    "prune": "Zero the smallest fraction of weights (structured sparsification).",
    "randomize": "Re-initialise the tensor from a normal distribution.",
    "shift": "Add a constant to every weight (bias shift).",
    "restore": "Discard all recorded edits for this tensor and return it to the original values.",
}


class TensorEdit:
    """One recorded modification to a tensor."""

    __slots__ = ("op", "params", "label")

    def __init__(self, op, params):
        self.op = op
        self.params = params or {}
        self.label = _describe(op, self.params)

    def apply(self, values: np.ndarray, flat_start: int, total: int) -> np.ndarray:
        """
        Apply the edit to a chunk of `values`.

        `flat_start`/`total` let fraction-based operations (prune) know where
        the chunk sits, though only exact/pass-independent ops are applied per
        chunk. Percentage operations are resolved in a pre-pass.
        """
        op = self.op
        p = self.params
        if op == "zero":
            return np.zeros_like(values)
        if op == "scale":
            return values * float(p.get("factor", 1.0))
        if op == "shift":
            return values + float(p.get("value", 0.0))
        if op == "clamp":
            lo = p.get("min")
            hi = p.get("max")
            if lo is not None and hi is not None:
                return np.clip(values, float(lo), float(hi))
            if lo is not None:
                return np.maximum(values, float(lo))
            if hi is not None:
                return np.minimum(values, float(hi))
            return values
        if op == "add_noise":
            std = float(p.get("std", 0.01))
            seed = int(p.get("seed", 0))
            rng = np.random.default_rng(seed + flat_start)
            return values + rng.normal(0.0, std, size=values.shape).astype(np.float32)
        if op == "randomize":
            std = float(p.get("std", 0.02))
            seed = int(p.get("seed", 0))
            rng = np.random.default_rng(seed + flat_start)
            return rng.normal(0.0, std, size=values.shape).astype(np.float32)
        if op == "prune":
            # `threshold` is resolved by _prune_threshold() before apply() is
            # called, so pruning is a pure elementwise mask here.
            thr = p.get("threshold")
            if thr is not None:
                mask = np.abs(values) <= float(thr)
                return np.where(mask, 0.0, values)
            return values
        return values


def _describe(op, params):
    if op == "zero":
        return "zeroed"
    if op == "scale":
        return f"×{params.get('factor', 1.0)}"
    if op == "shift":
        return f"{params.get('value', 0.0):+g}"
    if op == "clamp":
        return f"clamp[{params.get('min', '−∞')}, {params.get('max', '∞')}]"
    if op == "add_noise":
        return f"noise σ={params.get('std', 0.01)}"
    if op == "randomize":
        return f"randomized σ={params.get('std', 0.02)}"
    if op == "prune":
        return f"pruned {float(params.get('fraction', 0)) * 100:.0f}%"
    return op


class GGUFWeightEditor:
    """
    Inspect and modify the weights of a GGUF model without loading them all.

    A `None` loader means no GGUF is open; every method then returns an
    explanatory error dict rather than raising.
    """

    # Chunk size in elements for streaming passes. 2^20 elements of float32 is
    # 4 MB — small enough to be safe on a constrained machine, large enough
    # that numpy overhead is negligible.
    CHUNK_ELEMENTS = 1 << 20

    def __init__(self, loader=None):
        self.loader = loader
        self.edits = {}          # tensor name → [TensorEdit]
        self.deleted = set()     # tensor names excluded from export
        self._stats_cache = {}

    # ── setup ────────────────────────────────────────────────────────────

    def attach(self, loader):
        """Point the editor at a newly loaded GGUF model and clear state."""
        self.loader = loader
        self.edits = {}
        self.deleted = set()
        self._stats_cache = {}

    def _available(self):
        return (
            self.loader is not None
            and getattr(self.loader, "gguf_path", None) is not None
            and bool(getattr(self.loader, "gguf_tensor_info", None))
        )

    def _info(self, name):
        if not self._available():
            return None
        return self.loader.get_gguf_tensor_info(name)

    def tensor_names(self):
        if not self._available():
            return []
        return [n for n in self.loader.gguf_tensor_info if n not in self.deleted]

    def supports(self, name) -> bool:
        info = self._info(name)
        return bool(info) and gq.is_supported(info.get("type_id"))

    # ── streaming value access ───────────────────────────────────────────

    def _raw(self, name):
        return self.loader.get_tensor_data(name)

    def _dequant_chunk(self, name, elem_start, elem_count):
        """
        Dequantize `elem_count` elements starting at `elem_start`.

        Reads only the blocks that overlap the requested range, so a heatmap of
        a 136M-element embedding touches a few hundred KB rather than 545 MB.
        """
        info = self._info(name)
        if info is None:
            return None
        ggml_type = info.get("type_id")
        block_elems, block_bytes = gq.BLOCK_LAYOUT.get(ggml_type, (1, 4))

        first_block = elem_start // block_elems
        last_block = (elem_start + elem_count - 1) // block_elems
        n_blocks = last_block - first_block + 1

        raw = self._raw(name)
        if raw is None:
            return None

        byte_start = first_block * block_bytes
        byte_end = min(len(raw), (last_block + 1) * block_bytes)
        if byte_start >= byte_end:
            return None
        block_slice = raw[byte_start:byte_end]

        vals = gq.dequantize(block_slice, ggml_type, n_blocks * block_elems)

        # Trim to the exact requested window.
        offset = elem_start - first_block * block_elems
        return vals[offset:offset + elem_count]

    def _apply_edits(self, name, values, flat_start):
        for edit in self.edits.get(name, []):
            values = edit.apply(values, flat_start, 0)
        return values

    def _edited_flat(self, name):
        """
        Full tensor as float32, with edits applied.

        Only safe for tensors that fit the memory budget; callers must check
        `fits_in_memory()` first. Used for export and for exact percentiles on
        small tensors.
        """
        info = self._info(name)
        if info is None:
            return None
        n = self._element_count(info)
        if n > (1 << 26):  # ~67M elements ≈ 268 MB at float32
            return None
        vals = self._dequant_chunk(name, 0, n)
        if vals is None:
            return None
        return self._apply_edits(name, vals, 0)

    @staticmethod
    def _element_count(info):
        n = 1
        for d in info.get("shape", []):
            n *= int(d)
        return n

    # ── statistics ───────────────────────────────────────────────────────

    def stats(self, name, sample_percentiles=True):
        """
        Streaming statistics for one tensor, with edits applied.

        Pass 1 accumulates exact count/mean/std/min/max/norm/zeros/negatives and
        a sum of |x|. Percentiles and the histogram come from a *strided sample*
        of chunks — noted as `sampled: true` in the response so the UI can say
        so rather than implying exact values.
        """
        if not self._available():
            return {"error": "No GGUF model is loaded."}
        info = self._info(name)
        if info is None:
            return {"error": f"Tensor '{name}' not found in the GGUF file."}
        if not gq.is_supported(info.get("type_id")):
            return {
                "error": (
                    f"{gq.type_name(info.get('type_id'))} tensors cannot be read yet. "
                    f"Supported formats: {', '.join(gq.SUPPORTED_TYPE_NAMES)}."
                ),
                "unsupported_quant": gq.type_name(info.get("type_id")),
            }

        n = self._element_count(info)
        chunk = self.CHUNK_ELEMENTS

        count = 0
        total = 0.0
        total_sq = 0.0
        abs_total = 0.0
        vmin = math.inf
        vmax = -math.inf
        zeros = 0
        negatives = 0
        positives = 0

        for start in range(0, n, chunk):
            take = min(chunk, n - start)
            vals = self._dequant_chunk(name, start, take)
            if vals is None:
                continue
            vals = self._apply_edits(name, vals, start)
            vals = np.nan_to_num(vals, nan=0.0, posinf=0.0, neginf=0.0)
            if vals.size == 0:
                continue
            count += int(vals.size)
            total += float(vals.sum(dtype=np.float64))
            total_sq += float(np.square(vals, dtype=np.float64).sum())
            abs_total += float(np.abs(vals).sum(dtype=np.float64))
            vmin = min(vmin, float(vals.min()))
            vmax = max(vmax, float(vals.max()))
            zeros += int(np.count_nonzero(vals == 0))
            negatives += int(np.count_nonzero(vals < 0))
            positives += int(np.count_nonzero(vals > 0))

        if count == 0:
            return {"error": f"Could not read any data for '{name}'."}

        mean = total / count
        variance = max(0.0, total_sq / count - mean * mean)
        std = math.sqrt(variance)

        result = {
            "name": name,
            "shape": list(info.get("shape", [])),
            "dtype": info.get("dtype", "unknown"),
            "quant_type": gq.type_name(info.get("type_id")),
            "dequantized": True,
            "param_count": n,
            "byte_count": info.get("byte_count", 0),
            "mean": mean,
            "std": std,
            "min": vmin,
            "max": vmax,
            "norm": math.sqrt(total_sq),
            "l1_norm": abs_total,
            "num_zeros": zeros,
            "zero_percent": zeros / count * 100.0,
            "num_negative": negatives,
            "num_positive": positives,
            "sparsity": zeros / count,
            "edits": [e.label for e in self.edits.get(name, [])],
            "deleted": name in self.deleted,
        }

        # Percentiles + histogram from a strided sample of chunks.
        if sample_percentiles:
            sample = self._sample_values(name, n, want=1 << 20)
            if sample is not None and sample.size:
                result["sampled"] = bool(sample.size < count)
                result["sample_size"] = int(sample.size)
                for label, q in (("p1", 1), ("p5", 5), ("p25", 25),
                                 ("median", 50), ("p75", 75), ("p95", 95), ("p99", 99)):
                    result[label] = float(np.percentile(sample, q))
                hist, edges = np.histogram(sample, bins=48)
                result["histogram"] = {
                    "counts": [int(c) for c in hist],
                    "edges": [float(e) for e in edges],
                }
                # Skew/kurtosis from the sample — cheap and representative.
                s_mean = float(sample.mean())
                s_std = float(sample.std()) or 1e-12
                centred = (sample - s_mean) / s_std
                result["skewness"] = float(np.mean(centred ** 3))
                result["kurtosis"] = float(np.mean(centred ** 4) - 3.0)

        return result

    def _sample_values(self, name, n, want=1 << 20):
        """Read an evenly strided sample of the tensor (edits applied)."""
        if n <= want:
            vals = self._dequant_chunk(name, 0, n)
            if vals is None:
                return None
            return self._apply_edits(name, vals, 0)

        chunks = max(1, want // self.CHUNK_ELEMENTS)
        stride = n // chunks
        out = []
        for i in range(chunks):
            start = i * stride
            take = min(self.CHUNK_ELEMENTS, n - start)
            if take <= 0:
                break
            vals = self._dequant_chunk(name, start, take)
            if vals is None:
                continue
            out.append(self._apply_edits(name, vals, start))
        if not out:
            return None
        return np.concatenate(out)

    # ── heatmap ──────────────────────────────────────────────────────────

    def heatmap(self, name, size=128):
        """
        Real heatmap data for a tensor, sampled row-by-row.

        Only the blocks covering the sampled rows are read, so a huge tensor
        produces a heatmap without ever being materialized.
        """
        if not self._available():
            return {"error": "No GGUF model is loaded."}
        info = self._info(name)
        if info is None:
            return {"error": f"Tensor '{name}' not found in the GGUF file."}
        if not gq.is_supported(info.get("type_id")):
            return {
                "error": (
                    f"{gq.type_name(info.get('type_id'))} tensors cannot be read yet."
                ),
                "unsupported_quant": gq.type_name(info.get("type_id")),
            }

        dims = [int(d) for d in info.get("shape", [])]
        n = self._element_count(info)
        if n == 0:
            return {"error": "Empty tensor."}

        if len(dims) >= 2:
            # ggml lists dims fastest-first, so the contiguous row length is
            # dims[0] and the number of rows is the product of the rest.
            width = dims[0]
            height = n // max(width, 1)
        else:
            width = n
            height = 1

        grid = np.zeros((size, size), dtype=np.float32)
        row_idx = col_idx = None

        if height > 1:
            row_idx = np.linspace(0, height - 1, size).astype(np.int64)
            # Sample the columns of each chosen row too.
            if width <= size:
                col_idx = np.arange(width)
            else:
                col_idx = np.linspace(0, width - 1, size).astype(np.int64)

            # Read one row at a time — a row is contiguous in flat order.
            span_lo = int(row_idx.min()) * width
            span_hi = int(row_idx.max()) * width + width

            # Group the requested rows into a single contiguous window when it
            # is small enough, otherwise read per row.
            window = span_hi - span_lo
            if window <= (1 << 22):      # ≤ 16M elements ≈ 64 MB
                block = self._dequant_chunk(name, span_lo, window)
                if block is None:
                    return {"error": f"Could not read data for '{name}'."}
                block = self._apply_edits(name, block, span_lo)
                usable = (block.size // width) * width
                block = block[:usable].reshape(-1, width)
                rows = np.clip(row_idx - span_lo // width, 0, block.shape[0] - 1)
                sampled = block[rows][:, col_idx]
            else:
                rows_out = []
                for r in row_idx:
                    start = int(r) * width
                    vals = self._dequant_chunk(name, start, width)
                    if vals is None:
                        rows_out.append(np.zeros(len(col_idx), dtype=np.float32))
                        continue
                    vals = self._apply_edits(name, vals, start)
                    rows_out.append(vals[col_idx])
                sampled = np.vstack(rows_out)
        else:
            # 1-D tensor: reshape the strided sample into the grid.
            vals = self._sample_values(name, n, want=size * size)
            if vals is None:
                return {"error": f"Could not read data for '{name}'."}
            if vals.size < size * size:
                reps = int(math.ceil(size * size / max(vals.size, 1)))
                vals = np.tile(vals, reps)
            sampled = vals[: size * size].reshape(size, size)

        if sampled.size == 0:
            return {"error": f"Could not read data for '{name}'."}

        flat = sampled.reshape(-1).astype(np.float32, copy=False)
        lo = float(flat.min())
        hi = float(flat.max())

        # Min–max normalization collapses a weight tensor into one flat shade of
        # grey: ~95% of the values sit in a narrow band around zero while a
        # handful of outliers pin min/max, so the picture has almost no
        # contrast. Normalize on a robust percentile window instead and clamp
        # what falls outside it, so the visible gradient covers the bulk of the
        # data. The clipped tails are reported so the UI can say so.
        if hi - lo < 1e-12:
            dlo = dhi = lo
            normalized = np.full(sampled.shape, 0.5, dtype=np.float32)
        else:
            dlo = float(np.percentile(flat, 1.0))
            dhi = float(np.percentile(flat, 99.0))
            if dhi - dlo < 1e-12:
                dlo, dhi = lo, hi
            normalized = np.clip((flat - dlo) / (dhi - dlo), 0.0, 1.0).astype(np.float32)
        normalized = normalized.reshape(sampled.shape)

        clipped_below = float(np.count_nonzero(flat < dlo)) / max(flat.size, 1) * 100.0
        clipped_above = float(np.count_nonzero(flat > dhi)) / max(flat.size, 1) * 100.0

        # The largest magnitude is what people look for first, so locate it in
        # tensor coordinates (the grid is a sample, not a contiguous view).
        peak_idx = int(np.argmax(np.abs(flat)))
        grid_rows, grid_cols = sampled.shape
        peak_grid_row, peak_grid_col = divmod(peak_idx, grid_cols)
        if height > 1 and row_idx is not None and col_idx is not None:
            peak_row = int(row_idx[min(peak_grid_row, len(row_idx) - 1)])
            peak_col = int(col_idx[min(peak_grid_col, len(col_idx) - 1)])
        else:
            peak_row, peak_col = peak_grid_row, peak_grid_col

        return {
            "tensor": name,
            "size": size,
            "data": normalized.astype(np.float32).reshape(-1).tolist(),
            "min": lo,
            "max": hi,
            "mean": float(flat.mean()),
            "std": float(flat.std()),
            "median": float(np.median(flat)),
            "param_count": n,
            "shape": dims,
            "quant_type": gq.type_name(info.get("type_id")),
            "dequantized": True,
            # Display range actually used to paint (robust percentiles).
            "display_min": dlo,
            "display_max": dhi,
            "percentile_window": [1.0, 99.0],
            "clipped_below_pct": clipped_below,
            "clipped_above_pct": clipped_above,
            "robust": True,
            "grid": {"rows": int(grid_rows), "cols": int(grid_cols)},
            "peak": {"value": float(flat[peak_idx]), "row": peak_row, "col": peak_col},
            "edits": [e.label for e in self.edits.get(name, [])],
        }

    # ── editing ──────────────────────────────────────────────────────────

    def edit(self, name, op, params=None):
        """Record an edit for a tensor. Returns the new edit state."""
        if not self._available():
            return {"error": "No GGUF model is loaded."}
        if op not in OPERATIONS:
            return {"error": f"Unknown operation '{op}'. Supported: {', '.join(OPERATIONS)}"}
        info = self._info(name)
        if info is None:
            return {"error": f"Tensor '{name}' not found."}
        if not gq.is_supported(info.get("type_id")):
            return {
                "error": f"{gq.type_name(info.get('type_id'))} tensors cannot be edited yet.",
                "unsupported_quant": gq.type_name(info.get("type_id")),
            }

        params = dict(params or {})

        if op == "restore":
            self.edits.pop(name, None)
            self._stats_cache.pop(name, None)
            return {"ok": True, "tensor": name, "edits": [], "message": "Edits discarded."}

        # Percentage pruning needs the threshold, which depends on the tensor's
        # magnitude distribution — resolved once here so the elementwise apply
        # stays cheap.
        if op == "prune":
            fraction = float(params.get("fraction", 0.1))
            fraction = max(0.0, min(0.99, fraction))
            threshold = self._threshold_for_fraction(name, fraction)
            params["fraction"] = fraction
            params["threshold"] = threshold
            if threshold is None:
                return {"error": "Could not compute a pruning threshold for this tensor."}

        if op == "scale":
            params["factor"] = float(params.get("factor", 1.0))
        if op == "shift":
            params["value"] = float(params.get("value", 0.0))
        if op == "clamp":
            if params.get("min") is not None:
                params["min"] = float(params["min"])
            if params.get("max") is not None:
                params["max"] = float(params["max"])
        if op in ("add_noise", "randomize"):
            params["std"] = float(params.get("std", 0.01))
            params["seed"] = int(params.get("seed", 0))

        self.edits.setdefault(name, []).append(TensorEdit(op, params))
        self._stats_cache.pop(name, None)

        return {
            "ok": True,
            "tensor": name,
            "op": op,
            "edits": [e.label for e in self.edits[name]],
            "message": f"{name}: {self.edits[name][-1].label}",
        }

    def _threshold_for_fraction(self, name, fraction):
        """Magnitude threshold that zeroes approximately `fraction` of weights."""
        info = self._info(name)
        if info is None:
            return None
        n = self._element_count(info)
        # Sampling half a million values gives a stable quantile estimate.
        sample = self._sample_values(name, n, want=min(n, 1 << 19))
        if sample is None or sample.size == 0:
            return None
        return float(np.percentile(np.abs(sample), fraction * 100.0))

    def delete(self, name, deleted=True):
        """Mark a tensor as deleted (excluded from export)."""
        if not self._available():
            return {"error": "No GGUF model is loaded."}
        if self._info(name) is None:
            return {"error": f"Tensor '{name}' not found."}
        if deleted:
            self.deleted.add(name)
        else:
            self.deleted.discard(name)
        return {
            "ok": True,
            "tensor": name,
            "deleted": deleted,
            "message": (f"{name} will be removed from the exported model."
                        if deleted else f"{name} restored to the exported model."),
        }

    def reset(self):
        """Discard all edits and deletions."""
        self.edits = {}
        self.deleted = set()
        self._stats_cache = {}
        return {"ok": True, "message": "All pending edits discarded."}

    def pending(self):
        """Summary of everything queued for the next export."""
        return {
            "edited": {k: [e.label for e in v] for k, v in self.edits.items() if v},
            "deleted": sorted(self.deleted),
            "edit_count": sum(len(v) for v in self.edits.values()),
            "delete_count": len(self.deleted),
        }

    # ── export ───────────────────────────────────────────────────────────

    def export(self, path, dtype="float16", progress=None, on_tensor=None):
        """
        Stream every tensor into a new safetensors checkpoint with the recorded
        edits applied and deleted tensors omitted.

        The container is written by hand so tensors are produced and flushed one
        at a time — the model never has to exist in memory as a whole.

        Returns a summary dict. Raises ValueError on unusable input.
        """
        if not self._available():
            raise ValueError("No GGUF model is loaded.")

        np_dtype = np.float16 if dtype == "float16" else np.float32
        st_dtype = "F16" if dtype == "float16" else "F32"

        names = [n for n in self.loader.gguf_tensor_info if n not in self.deleted]
        if not names:
            raise ValueError("Every tensor was deleted — nothing to export.")

        # Pre-compute shapes (torch order) and byte sizes for the header.
        entries = []
        for name in names:
            info = self.loader.gguf_tensor_info[name]
            if not gq.is_supported(info.get("type_id")):
                # Skip rather than emit garbage for a format we cannot read.
                continue
            ggml_dims = [int(d) for d in info.get("shape", [])]
            torch_shape = list(reversed(ggml_dims))
            count = 1
            for d in torch_shape:
                count *= d
            entries.append({
                "name": name,
                "shape": torch_shape,
                "ggml_dims": ggml_dims,
                "count": count,
                "nbytes": count * np.dtype(np_dtype).itemsize,
            })

        if not entries:
            raise ValueError("No exportable tensors (all were in unsupported formats).")

        header = {}
        offset = 0
        for e in entries:
            header[e["name"]] = {
                "dtype": st_dtype,
                "shape": e["shape"],
                "data_offsets": [offset, offset + e["nbytes"]],
            }
            offset += e["nbytes"]

        header_bytes = json.dumps(header, separators=(",", ":")).encode("utf-8")
        # safetensors requires the header to start 8-byte aligned.
        pad = (-len(header_bytes)) % 8
        header_bytes += b" " * pad

        tmp_path = path + ".part"
        written = 0
        with open(tmp_path, "wb") as f:
            f.write(struct.pack("<Q", len(header_bytes)))
            f.write(header_bytes)

            for i, e in enumerate(entries):
                name = e["name"]
                info = self.loader.gguf_tensor_info[name]
                flat = self._dequant_whole(name, e["count"])
                if flat is None:
                    raise ValueError(f"Could not read tensor '{name}' during export.")

                flat = self._apply_edits(name, flat, 0)
                # ggml order is fastest-first; numpy wants slowest-first.
                tensor = gq.reshape_to_torch(flat, e["ggml_dims"]).astype(np_dtype)
                tensor = np.ascontiguousarray(tensor)
                f.write(tensor.tobytes())
                written += tensor.nbytes

                if on_tensor:
                    on_tensor(name)
                if progress:
                    progress(i + 1, len(entries), name)

            f.flush()
            os.fsync(f.fileno())

        os.replace(tmp_path, path)

        return {
            "path": path,
            "format": "safetensors",
            "dtype": st_dtype,
            "tensor_count": len(entries),
            "skipped": len(names) - len(entries),
            "bytes": written + len(header_bytes) + 8,
            "edits_applied": sum(len(v) for v in self.edits.values()),
            "deleted_omitted": len(self.deleted),
        }

    def export_tensor_stream(self, name, path, dtype="float32", progress=None):
        """
        Write ONE tensor (edits applied) to its own file, chunk by chunk.

        The whole-tensor helper `_edited_flat` refuses anything over ~67M
        elements, which excludes exactly the tensors people most want to pull
        out on their own — embeddings and output projections. This streams, so
        peak memory is one chunk regardless of tensor size.

        Writes .npy (header then raw chunks) or .safetensors (header with
        precomputed offsets, then the same chunks). Returns a summary dict.
        """
        import json as _json
        import struct

        if not self.supports(name):
            raise ValueError(f"Tensor is not readable in this format: {name}")
        info = self._info(name)
        if info is None:
            raise ValueError(f"Unknown tensor: {name}")

        torch_shape = [int(d) for d in info.get("shape", [])]
        n = self._element_count(info)
        if n <= 0:
            raise ValueError(f"Tensor {name} has no elements.")
        # GGUF stores dims in ggml order (reversed from torch); the export must
        # present them the way every other tool reads them.
        torch_shape = list(reversed(torch_shape))

        np_dtype = np.float16 if dtype == "float16" else np.float32
        st_dtype = "F16" if dtype == "float16" else "F32"
        itemsize = np.dtype(np_dtype).itemsize
        total_bytes = n * itemsize
        ext = os.path.splitext(path)[1].lower()
        tmp_path = path + ".part"

        def chunks():
            """Yield (start, float32 array) covering the tensor in order."""
            step = self.CHUNK_ELEMENTS
            for start in range(0, n, step):
                take = min(step, n - start)
                vals = self._dequant_chunk(name, start, take)
                if vals is None:
                    raise ValueError(f"Could not read {name} at element {start}.")
                vals = self._apply_edits(name, vals[:take], start)
                yield start, np.asarray(vals, dtype=np_dtype)

        written = 0
        try:
            with open(tmp_path, "wb") as fh:
                if ext == ".safetensors":
                    header = {
                        name: {"dtype": st_dtype, "shape": torch_shape, "data_offsets": [0, total_bytes]}
                    }
                    header_bytes = _json.dumps(header, separators=(",", ":")).encode("utf-8")
                    header_bytes += b" " * ((-len(header_bytes)) % 8)
                    fh.write(struct.pack("<Q", len(header_bytes)))
                    fh.write(header_bytes)
                elif ext == ".npy":
                    # .npy v1.0: magic, version, uint16 header length, then an
                    # ASCII dict padded so the whole header is 64-byte aligned.
                    shape_str = "(" + ",".join(str(d) for d in torch_shape)
                    shape_str += ",)" if len(torch_shape) == 1 else ")"
                    dict_str = (
                        "{'descr': '%s', 'fortran_order': False, 'shape': %s, }"
                        % (np.dtype(np_dtype).str, shape_str)
                    )
                    # 10 bytes of preamble + dict + newline must be a multiple of 64.
                    pad = 64 - ((10 + len(dict_str) + 1) % 64)
                    if pad == 64:
                        pad = 0
                    dict_str += " " * pad + "\n"
                    fh.write(b"\x93NUMPY")
                    fh.write(struct.pack("<BBH", 1, 0, len(dict_str)))
                    fh.write(dict_str.encode("latin1"))
                else:
                    raise ValueError(f"Unsupported per-tensor export format: {ext or '(none)'}")

                for _start, arr in chunks():
                    fh.write(arr.tobytes(order="C"))
                    written += arr.size
                    if progress is not None:
                        progress(written, n)

            os.replace(tmp_path, path)
        except Exception:
            try:
                if os.path.exists(tmp_path):
                    os.remove(tmp_path)
            except OSError:
                pass
            raise

        return {
            "name": name,
            "path": path,
            "shape": torch_shape,
            "dtype": np.dtype(np_dtype).name,
            "count": int(written),
            "size_bytes": os.path.getsize(path),
            "format": ext.lstrip("."),
            "streamed": True,
        }

    def _dequant_whole(self, name, n):
        """
        Dequantize an entire tensor.

        Streams through the tensor in chunks and writes into one pre-allocated
        output array, so peak extra memory stays at one chunk. Falls back to a
        single big call only for tensors that comfortably fit.
        """
        out = np.empty(n, dtype=np.float32)
        chunk = self.CHUNK_ELEMENTS
        got_any = False
        for start in range(0, n, chunk):
            take = min(chunk, n - start)
            vals = self._dequant_chunk(name, start, take)
            if vals is None:
                continue
            out[start:start + vals.size] = vals[:take]
            got_any = True
        return out if got_any else None
