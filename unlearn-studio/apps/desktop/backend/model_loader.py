"""
Model Loader — Load models from various formats:
- .safetensors (single file)
- .pt / .bin / .pth (PyTorch checkpoints)
- HuggingFace directories (config.json + weights)
- .onnx (ONNX models — metadata only, no training support)
"""

import os
import json
import torch
from typing import Optional, Tuple


class ModelLoader:
    def load(self, path: str) -> Tuple[Optional[torch.nn.Module], dict]:
        """Load a model from a file. Returns (model, metadata)."""
        ext = os.path.splitext(path)[1].lower()

        if ext == ".safetensors":
            return self._load_safetensors(path)
        elif ext in (".pt", ".pth", ".bin"):
            return self._load_pytorch(path)
        elif ext == ".onnx":
            return self._load_onnx(path)
        elif ext == ".json":
            return self._load_config(path)
        else:
            raise ValueError(f"Unsupported file format: {ext}")

    def load_folder(self, path: str) -> Tuple[Optional[torch.nn.Module], dict]:
        """Load a model from a HuggingFace-style directory."""
        config_path = os.path.join(path, "config.json")
        if not os.path.exists(config_path):
            raise FileNotFoundError(f"No config.json found in {path}")

        with open(config_path, "r") as f:
            config = json.load(f)

        # Try to find weight files
        weight_files = []
        for fname in os.listdir(path):
            ext = os.path.splitext(fname)[1].lower()
            if ext in (".safetensors", ".bin", ".pt", ".pth"):
                weight_files.append(os.path.join(path, fname))

        if not weight_files:
            raise FileNotFoundError(f"No weight files found in {path}")

        # Load the first weight file
        weight_path = weight_files[0]
        model, meta = self.load(weight_path)
        meta["config"] = config
        meta["source_dir"] = path
        meta["weight_files"] = [os.path.basename(f) for f in weight_files]

        return model, meta

    def _load_safetensors(self, path: str) -> Tuple[dict, dict]:
        """Load safetensors file — extract tensor data as a state dict."""
        from safetensors.torch import load_file

        state_dict = load_file(path)
        metadata = self._build_metadata(state_dict, path, "safetensors")

        # We return state_dict as a "model" — for unlearning we work with state_dict directly
        # Wrap in a simple container for compatibility
        return state_dict, metadata

    def _load_pytorch(self, path: str) -> Tuple[dict, dict]:
        """Load PyTorch checkpoint."""
        checkpoint = torch.load(path, map_location="cpu", weights_only=False)

        # Handle different checkpoint formats
        if isinstance(checkpoint, dict):
            if "state_dict" in checkpoint:
                state_dict = checkpoint["state_dict"]
            elif "model" in checkpoint:
                state_dict = checkpoint["model"]
            else:
                state_dict = checkpoint
        else:
            state_dict = checkpoint

        metadata = self._build_metadata(state_dict, path, "pytorch")
        return state_dict, metadata

    def _load_onnx(self, path: str) -> Tuple[None, dict]:
        """Load ONNX model metadata (can't train/unlearn ONNX models)."""
        metadata = {
            "format": "onnx",
            "path": path,
            "filename": os.path.basename(path),
            "size_bytes": os.path.getsize(path),
            "error": "ONNX models are read-only. Cannot train or unlearn. Convert to PyTorch/Safetensors first.",
            "trainable": False,
        }
        return None, metadata

    def _load_config(self, path: str) -> Tuple[None, dict]:
        """Load a JSON config file."""
        with open(path, "r") as f:
            config = json.load(f)
        return None, {
            "format": "config",
            "path": path,
            "filename": os.path.basename(path),
            "config": config,
            "trainable": False,
        }

    def _build_metadata(self, state_dict: dict, path: str, fmt: str) -> dict:
        """Build comprehensive metadata from a state dict."""
        tensors = {}
        total_params = 0
        total_bytes = 0

        # Group by layer
        layer_groups = {}

        for name, tensor in state_dict.items():
            if not isinstance(tensor, torch.Tensor):
                continue

            shape = list(tensor.shape)
            dtype = str(tensor.dtype).replace("torch.", "")
            param_count = 1
            for s in shape:
                param_count *= s

            byte_count = tensor.nelement() * tensor.element_size()

            tensors[name] = {
                "shape": shape,
                "dtype": dtype,
                "param_count": param_count,
                "byte_count": byte_count,
                "min": float(tensor.min()) if tensor.numel() > 0 else 0,
                "max": float(tensor.max()) if tensor.numel() > 0 else 0,
                "mean": float(tensor.mean()) if tensor.numel() > 0 else 0,
                "std": float(tensor.std()) if tensor.numel() > 1 else 0,
                "requires_grad": tensor.requires_grad,
            }

            total_params += param_count
            total_bytes += byte_count

            # Extract layer group
            parts = name.split(".")
            if len(parts) >= 2:
                group = parts[0]
                if group not in layer_groups:
                    layer_groups[group] = {"name": group, "param_count": 0, "tensor_count": 0}
                layer_groups[group]["param_count"] += param_count
                layer_groups[group]["tensor_count"] += 1

        return {
            "format": fmt,
            "path": path,
            "filename": os.path.basename(path),
            "size_bytes": os.path.getsize(path),
            "tensor_count": len(tensors),
            "total_params": total_params,
            "total_bytes": total_bytes,
            "tensors": tensors,
            "layer_groups": list(layer_groups.values()),
            "trainable": True,
            "dtypes": list(set(t["dtype"] for t in tensors.values())),
        }

    def save(self, state_dict: dict, metadata: dict, path: str, fmt: str = "safetensors") -> dict:
        """Save the model to disk."""
        os.makedirs(os.path.dirname(path) or ".", exist_ok=True)

        if fmt == "safetensors":
            from safetensors.torch import save_file
            # Filter to only tensors
            tensor_dict = {k: v for k, v in state_dict.items() if isinstance(v, torch.Tensor)}
            save_file(tensor_dict, path)
        elif fmt == "pytorch":
            torch.save(state_dict, path)
        else:
            raise ValueError(f"Unsupported save format: {fmt}")

        return {
            "path": path,
            "size_bytes": os.path.getsize(path),
            "format": fmt,
        }
