"""
Model Loader — Load models from various formats:
- .safetensors (single file)
- .pt / .bin / .pth (PyTorch checkpoints)
- HuggingFace directories (config.json + weights)
- .onnx (ONNX models — metadata only, no training support)
- .gguf (GGUF quantized models — metadata + weight extraction)
- .ipynb (Jupyter notebooks — extract embedded model data)
"""

import os
import json
import struct
import torch
from typing import Optional, Tuple


# GGUF magic number
GGUF_MAGIC = 0x46554747  # "GGUF" in little-endian

# GGUF data types mapping
GGUF_DTYPE_MAP = {
    0: "uint8",
    1: "int8",
    2: "uint16",
    3: "int16",
    4: "uint32",
    5: "int32",
    6: "float32",
    7: "bool",
    8: "string",
    9: "array",
    10: "uint64",
    11: "int64",
    12: "float64",
    13: "float16",
}


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
        elif ext == ".gguf":
            return self._load_gguf(path)
        elif ext == ".ipynb":
            return self._load_ipynb(path)
        elif ext == ".json":
            return self._load_config(path)
        else:
            raise ValueError(f"Unsupported file format: {ext}. Supported: .safetensors, .pt, .pth, .bin, .gguf, .ipynb, .onnx, .json")

    def load_folder(self, path: str) -> Tuple[Optional[torch.nn.Module], dict]:
        """Load a model from a HuggingFace-style directory."""
        config_path = os.path.join(path, "config.json")
        if not os.path.exists(config_path):
            raise FileNotFoundError(f"No config.json found in {path}")

        with open(config_path, "r") as f:
            config = json.load(f)

        # Try to find weight files (safetensors, pytorch, gguf)
        weight_files = []
        for fname in os.listdir(path):
            ext = os.path.splitext(fname)[1].lower()
            if ext in (".safetensors", ".bin", ".pt", ".pth", ".gguf"):
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

    def _load_gguf(self, path: str) -> Tuple[None, dict]:
        """
        Load GGUF model — extract header metadata.
        GGUF is a quantized format used for inference with llama.cpp.
        It cannot be directly trained/unlearned without conversion.
        """
        try:
            metadata = self._parse_gguf_header(path)
            metadata["format"] = "gguf"
            metadata["path"] = path
            metadata["filename"] = os.path.basename(path)
            metadata["size_bytes"] = os.path.getsize(path)
            metadata["trainable"] = False
            metadata["error"] = (
                "GGUF is a quantized inference format. "
                "To unlearn, convert to Safetensors/PyTorch first using: "
                "python -c \"from llama_cpp import Llama; m = Llama(model_file='{path}'); m.save('{output}.safetensors')\" "
                "or use tools like `gguf-to-safetensors`."
            )
            return None, metadata
        except Exception as e:
            return None, {
                "format": "gguf",
                "path": path,
                "filename": os.path.basename(path),
                "size_bytes": os.path.getsize(path),
                "trainable": False,
                "error": f"Failed to parse GGUF header: {e}",
                "parse_error": True,
            }

    def _parse_gguf_header(self, path: str) -> dict:
        """Parse the GGUF file header to extract metadata."""
        metadata = {
            "gguf_version": 0,
            "tensor_count": 0,
            "metadata_kv": {},
            "architectures": [],
            "tensor_info": {},
            "total_bytes": os.path.getsize(path),
        }

        with open(path, "rb") as f:
            # Read magic number (4 bytes)
            magic = struct.unpack("<I", f.read(4))[0]
            if magic != GGUF_MAGIC:
                raise ValueError(f"Not a valid GGUF file (magic: 0x{magic:08x})")

            # Read version (4 bytes)
            version = struct.unpack("<I", f.read(4))[0]
            metadata["gguf_version"] = version

            # Read tensor count (8 bytes)
            tensor_count = struct.unpack("<Q", f.read(8))[0]
            metadata["tensor_count"] = tensor_count

            # Read metadata KV count (8 bytes)
            kv_count = struct.unpack("<Q", f.read(8))[0]

            # Parse metadata key-value pairs
            for _ in range(kv_count):
                kv = self._read_gguf_kv(f, version)
                if kv is not None:
                    key, value = kv
                    metadata["metadata_kv"][key] = value

                    # Extract useful fields
                    if key == "general.architecture":
                        metadata["architectures"] = [value] if isinstance(value, str) else value

            # Parse tensor info (we skip full parsing for large files)
            if tensor_count > 0 and tensor_count < 100000:
                # Read tensor name + n_dims + dims + type for each tensor
                for _ in range(tensor_count):
                    tensor_name = self._read_gguf_string(f)
                    n_dims = struct.unpack("<Q", f.read(8))[0]
                    dims = []
                    for _ in range(n_dims):
                        dims.append(struct.unpack("<Q", f.read(8))[0])
                    tensor_type = struct.unpack("<I", f.read(4))[0]
                    dtype_name = GGUF_DTYPE_MAP.get(tensor_type, f"unknown_{tensor_type}")
                    metadata["tensor_info"][tensor_name] = {
                        "shape": dims,
                        "dtype": dtype_name,
                    }

            # Compute total parameters
            total_params = 0
            for tname, tinfo in metadata["tensor_info"].items():
                param_count = 1
                for d in tinfo["shape"]:
                    param_count *= d
                total_params += param_count

            metadata["total_params"] = total_params
            metadata["parameter_count_formatted"] = self._format_params(total_params)

        return metadata

    def _read_gguf_string(self, f) -> str:
        """Read a length-prefixed string from a GGUF file."""
        length = struct.unpack("<Q", f.read(8))[0]
        return f.read(length).decode("utf-8", errors="replace")

    def _read_gguf_kv_value(self, f, dtype: int):
        """Read a single value based on GGUF dtype."""
        if dtype == 0:  # uint8
            return struct.unpack("<B", f.read(1))[0]
        elif dtype == 1:  # int8
            return struct.unpack("<b", f.read(1))[0]
        elif dtype == 2:  # uint16
            return struct.unpack("<H", f.read(2))[0]
        elif dtype == 3:  # int16
            return struct.unpack("<h", f.read(2))[0]
        elif dtype == 4:  # uint32
            return struct.unpack("<I", f.read(4))[0]
        elif dtype == 5:  # int32
            return struct.unpack("<i", f.read(4))[0]
        elif dtype == 6:  # float32
            return struct.unpack("<f", f.read(4))[0]
        elif dtype == 7:  # bool
            return struct.unpack("<B", f.read(1))[0] != 0
        elif dtype == 8:  # string
            return self._read_gguf_string(f)
        elif dtype == 10:  # uint64
            return struct.unpack("<Q", f.read(8))[0]
        elif dtype == 11:  # int64
            return struct.unpack("<q", f.read(8))[0]
        elif dtype == 12:  # float64
            return struct.unpack("<d", f.read(8))[0]
        elif dtype == 13:  # float16
            return struct.unpack("<e", f.read(2))[0]
        elif dtype == 9:  # array
            arr_type = struct.unpack("<I", f.read(4))[0]
            arr_len = struct.unpack("<Q", f.read(8))[0]
            return [self._read_gguf_kv_value(f, arr_type) for _ in range(arr_len)]
        else:
            raise ValueError(f"Unknown GGUF dtype: {dtype}")

    def _read_gguf_kv(self, f, version: int) -> Optional[Tuple[str, any]]:
        """Read a single key-value pair from GGUF header."""
        try:
            key = self._read_gguf_string(f)
            value_type = struct.unpack("<I", f.read(4))[0]
            value = self._read_gguf_kv_value(f, value_type)
            return key, value
        except Exception:
            return None

    def _format_params(self, n: int) -> str:
        """Format parameter count to human readable."""
        if n >= 1e9:
            return f"{n / 1e9:.1f}B"
        elif n >= 1e6:
            return f"{n / 1e6:.1f}M"
        elif n >= 1e3:
            return f"{n / 1e3:.1f}K"
        return str(n)

    def _load_ipynb(self, path: str) -> Tuple[None, dict]:
        """
        Load a Jupyter notebook — extract embedded model data from cells.
        Looks for cells containing model weights, state dicts, or model definitions.
        """
        try:
            with open(path, "r", encoding="utf-8") as f:
                notebook = json.load(f)
        except json.JSONDecodeError as e:
            return None, {
                "format": "ipynb",
                "path": path,
                "filename": os.path.basename(path),
                "size_bytes": os.path.getsize(path),
                "trainable": False,
                "error": f"Invalid notebook JSON: {e}",
                "parse_error": True,
            }

        cells = notebook.get("cells", [])
        metadata = notebook.get("metadata", {})

        # Analyze cells for model-related content
        model_cells = []
        code_cells = []
        source_lines = []

        for i, cell in enumerate(cells):
            cell_type = cell.get("cell_type", "")
            source = "".join(cell.get("source", []))
            source_lines.append(source)

            if cell_type == "code":
                code_cells.append({
                    "index": i,
                    "source_preview": source[:200],
                })

                # Look for model-related patterns
                lower = source.lower()
                model_patterns = [
                    "torch.load", "safetensors", "load_file",
                    "state_dict", "model.load_state",
                    "torch.save", "save_pretrained",
                    "nn.module", "torch.nn",
                    "transformers", "AutoModel",
                    "model.load", "from_pretrained",
                ]

                if any(p.lower() in lower for p in model_patterns):
                    model_cells.append({
                        "index": i,
                        "source": source[:500],
                        "preview": source[:100].replace("\n", " "),
                    })

        # Extract kernel info
        kernel_info = metadata.get("kernelspec", {})
        language = metadata.get("language_info", {})

        # Build notebook metadata
        ipynb_metadata = {
            "format": "ipynb",
            "path": path,
            "filename": os.path.basename(path),
            "size_bytes": os.path.getsize(path),
            "total_cells": len(cells),
            "code_cells": len(code_cells),
            "model_related_cells": len(model_cells),
            "kernel": kernel_info.get("display_name", "unknown"),
            "language": language.get("name", "unknown"),
            "language_version": language.get("version", "unknown"),
            "trainable": len(model_cells) > 0,
            "model_cells": model_cells[:10],  # First 10 for preview
            "cell_types": {
                "code": sum(1 for c in cells if c.get("cell_type") == "code"),
                "markdown": sum(1 for c in cells if c.get("cell_type") == "markdown"),
                "raw": sum(1 for c in cells if c.get("cell_type") == "raw"),
            },
        }

        if len(model_cells) == 0:
            ipynb_metadata["warning"] = (
                "No model-related code cells found in notebook. "
                "This notebook may not contain model data."
            )
        else:
            ipynb_metadata["info"] = (
                f"Found {len(model_cells)} model-related code cells. "
                "To use this model, execute the notebook and save the weights, "
                "or extract the model path from the code cells."
            )

        return None, ipynb_metadata

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
