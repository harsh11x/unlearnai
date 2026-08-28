"""
Weight Analyzer — Compute real statistics, heatmaps, and gradient data from model tensors.
All operations work on actual tensor data, not synthetic/simulated values.
"""

import torch
import math
from typing import Optional


class WeightAnalyzer:
    def get_layers(self, state_dict: dict) -> list:
        """Get structured layer information from the state dict."""
        layer_map = {}

        for name, tensor in state_dict.items():
            if not isinstance(tensor, torch.Tensor):
                continue

            # Extract layer key: "model.layers.0.self_attn.q_proj.weight" → "model.layers.0.self_attn.q_proj"
            parts = name.split(".")
            if len(parts) >= 2:
                # Remove the last component (weight/bias) to get the layer name
                layer_key = ".".join(parts[:-1])
            else:
                layer_key = name

            if layer_key not in layer_map:
                layer_map[layer_key] = {
                    "name": layer_key,
                    "tensors": [],
                    "total_params": 0,
                    "total_bytes": 0,
                    "dtypes": set(),
                }

            param_count = tensor.nelement()
            byte_count = param_count * tensor.element_size()

            layer_map[layer_key]["tensors"].append(name)
            layer_map[layer_key]["total_params"] += param_count
            layer_map[layer_key]["total_bytes"] += byte_count
            layer_map[layer_key]["dtypes"].add(str(tensor.dtype).replace("torch.", ""))

        # Convert sets to lists for JSON serialization
        for layer in layer_map.values():
            layer["dtypes"] = list(layer["dtypes"])

        return list(layer_map.values())

    def get_summary(self, state_dict: dict) -> dict:
        """Get a comprehensive model summary."""
        total_params = 0
        total_bytes = 0
        dtype_counts = {}
        requires_grad_count = 0
        layer_count = 0

        for name, tensor in state_dict.items():
            if not isinstance(tensor, torch.Tensor):
                continue

            layer_count += 1
            total_params += tensor.nelement()
            total_bytes += tensor.nelement() * tensor.element_size()

            dtype = str(tensor.dtype).replace("torch.", "")
            dtype_counts[dtype] = dtype_counts.get(dtype, 0) + tensor.nelement()

            if tensor.requires_grad:
                requires_grad_count += 1

        # Group by depth
        depth_groups = {}
        for name in state_dict:
            depth = name.count(".")
            if depth not in depth_groups:
                depth_groups[depth] = 0
            depth_groups[depth] += 1

        return {
            "total_params": total_params,
            "total_bytes": total_bytes,
            "total_mb": round(total_bytes / (1024 * 1024), 2),
            "tensor_count": layer_count,
            "trainable_count": requires_grad_count,
            "frozen_count": layer_count - requires_grad_count,
            "dtype_distribution": dtype_counts,
            "depth_distribution": depth_groups,
            "format_params": self._format_params(total_params),
        }

    def list_tensors(self, state_dict: dict) -> list:
        """List all tensors with detailed info."""
        result = []
        for name, tensor in state_dict.items():
            if not isinstance(tensor, torch.Tensor):
                continue
            result.append({
                "name": name,
                "shape": list(tensor.shape),
                "dtype": str(tensor.dtype).replace("torch.", ""),
                "param_count": tensor.nelement(),
                "byte_count": tensor.nelement() * tensor.element_size(),
                "requires_grad": tensor.requires_grad,
            })
        return result

    def tensor_stats(self, state_dict: dict, tensor_name: str) -> dict:
        """Get detailed statistics for a specific tensor."""
        if tensor_name not in state_dict:
            return {"error": f"Tensor '{tensor_name}' not found"}

        tensor = state_dict[tensor_name]
        if not isinstance(tensor, torch.Tensor):
            return {"error": "Not a tensor"}

        flat = tensor.float().flatten()

        # Percentiles
        sorted_vals = flat.sort().values
        n = sorted_vals.numel()

        return {
            "name": tensor_name,
            "shape": list(tensor.shape),
            "dtype": str(tensor.dtype).replace("torch.", ""),
            "param_count": tensor.nelement(),
            "mean": float(flat.mean()),
            "std": float(flat.std()),
            "min": float(flat.min()),
            "max": float(flat.max()),
            "median": float(sorted_vals[n // 2]),
            "p1": float(sorted_vals[max(0, n // 100)]),
            "p5": float(sorted_vals[max(0, n * 5 // 100)]),
            "p25": float(sorted_vals[max(0, n // 4)]),
            "p75": float(sorted_vals[min(n - 1, n * 3 // 4)]),
            "p95": float(sorted_vals[min(n - 1, n * 95 // 100)]),
            "p99": float(sorted_vals[min(n - 1, n * 99 // 100)]),
            "norm": float(flat.norm()),
            "num_zeros": int((flat == 0).sum()),
            "zero_percent": float((flat == 0).float().mean() * 100),
            "num_negative": int((flat < 0).sum()),
            "num_positive": int((flat > 0).sum()),
            "skewness": float(self._skewness(flat)),
            "kurtosis": float(self._kurtosis(flat)),
        }

    def generate_heatmap(self, state_dict: dict, tensor_name: str, size: int = 128) -> dict:
        """Generate heatmap data from a real tensor.
        
        For 2D+ tensors: sample or reshape to (size, size).
        For 1D tensors: tile across a 2D grid.
        Returns flat array of normalized [0, 1] values.
        """
        if tensor_name not in state_dict:
            return {"error": f"Tensor '{tensor_name}' not found"}

        tensor = state_dict[tensor_name].float()

        if tensor.numel() == 0:
            return {"error": "Empty tensor"}

        # Resample to target size
        if tensor.dim() >= 2:
            # Use the first two dimensions
            h, w = tensor.shape[0], tensor.shape[1]

            if h == size and w == size:
                sampled = tensor[:size, :size]
            elif h >= size and w >= size:
                # Sample evenly
                row_idx = torch.linspace(0, h - 1, size, dtype=torch.long)
                col_idx = torch.linspace(0, w - 1, size, dtype=torch.long)
                sampled = tensor[row_idx][:, col_idx]
            else:
                # Tile smaller tensors
                repeats_h = math.ceil(size / h)
                repeats_w = math.ceil(size / w)
                tiled = tensor.repeat(repeats_h, repeats_w)
                sampled = tiled[:size, :size]
        elif tensor.dim() == 1:
            # Tile 1D tensor across 2D grid
            n = tensor.numel()
            row = tensor[:min(n, size)]
            if row.numel() < size:
                row = torch.cat([row, row.repeat(size // row.numel() + 1)[:size]])
            sampled = row.unsqueeze(0).repeat(size, 1)[:, :size]
        else:
            # Scalar or 0-d
            sampled = torch.full((size, size), float(tensor))

        # Normalize to [0, 1]
        t_min = float(sampled.min())
        t_max = float(sampled.max())
        if t_max - t_min < 1e-10:
            normalized = torch.full_like(sampled, 0.5)
        else:
            normalized = (sampled - t_min) / (t_max - t_min)

        return {
            "data": normalized.flatten().tolist(),
            "size": size,
            "min": t_min,
            "max": t_max,
            "mean": float(sampled.mean()),
            "std": float(sampled.std()),
        }

    def get_gradient(self, state_dict: dict, tensor_name: str) -> dict:
        """Get gradient data for a tensor (requires grad to be enabled)."""
        if tensor_name not in state_dict:
            return {"error": f"Tensor '{tensor_name}' not found"}

        tensor = state_dict[tensor_name]
        if not isinstance(tensor, torch.Tensor):
            return {"error": "Not a tensor"}

        if tensor.grad is None:
            return {
                "has_gradient": False,
                "message": "No gradient available. Run a backward pass first.",
            }

        grad = tensor.grad.float()
        return {
            "has_gradient": True,
            "mean": float(grad.mean()),
            "std": float(grad.std()),
            "min": float(grad.min()),
            "max": float(grad.max()),
            "norm": float(grad.norm()),
            "shape": list(grad.shape),
        }

    # ── Statistics helpers ──

    def _skewness(self, x: torch.Tensor) -> float:
        n = x.numel()
        if n < 3:
            return 0.0
        mean = x.mean()
        std = x.std()
        if std < 1e-10:
            return 0.0
        return float(((x - mean) ** 3).mean() / (std ** 3))

    def _kurtosis(self, x: torch.Tensor) -> float:
        n = x.numel()
        if n < 4:
            return 0.0
        mean = x.mean()
        std = x.std()
        if std < 1e-10:
            return 0.0
        return float(((x - mean) ** 4).mean() / (std ** 4) - 3.0)

    @staticmethod
    def _format_params(n: int) -> str:
        if n >= 1e9:
            return f"{n / 1e9:.1f}B"
        if n >= 1e6:
            return f"{n / 1e6:.1f}M"
        if n >= 1e3:
            return f"{n / 1e3:.1f}K"
        return str(n)
