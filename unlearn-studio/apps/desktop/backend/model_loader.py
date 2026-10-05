"""
Model Loader — Load models from various formats:
- .safetensors (single file)
- .pt / .bin / .pth / .ckpt (PyTorch checkpoints)
- HuggingFace directories (config.json + weights)
- .onnx (ONNX models — metadata only, no training support)
- .gguf (GGUF quantized models — metadata + weight extraction)
- .ipynb (Jupyter notebooks — extract embedded model data)
- .h5 / .hdf5 (Keras/HDF5 models)
- .pkl / .pickle / .joblib (Pickle/joblib serialized models)
- .npy / .npz (NumPy arrays)
- .pb / .tflite (TensorFlow models)
- .mlmodel / .mlpackage (CoreML models)
- .weights / .dat / .model / .caffemodel (generic weight files)
- .yaml / .yml (model config files)
"""

import os
import json
import struct
import torch
from typing import Optional, Tuple


# GGUF magic number
GGUF_MAGIC = 0x46554747  # "GGUF" in little-endian

# GGUF header KV value types (used in metadata section)
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

# Per-tensor ggml type ids — the authoritative `enum ggml_type` from ggml.h.
#
# NOTE: this must stay aligned with the spec. An earlier version of this table
# omitted the IQ* entries, which shifted every id from 11 onward and made the
# UI mislabel weights (e.g. Q4_K tensors displayed as "q3_k_m"). Verify any
# change against ggml's enum before editing.
GGUF_TENSOR_TYPE_MAP = {
    0: "float32",    # GGML_TYPE_F32
    1: "float16",    # GGML_TYPE_F16
    2: "q4_0",       # GGML_TYPE_Q4_0
    3: "q4_1",       # GGML_TYPE_Q4_1
    6: "q5_0",       # GGML_TYPE_Q5_0
    7: "q5_1",       # GGML_TYPE_Q5_1
    8: "q8_0",       # GGML_TYPE_Q8_0
    9: "q8_1",       # GGML_TYPE_Q8_1
    10: "q2_k",      # GGML_TYPE_Q2_K
    11: "q3_k",      # GGML_TYPE_Q3_K
    12: "q4_k",      # GGML_TYPE_Q4_K
    13: "q5_k",      # GGML_TYPE_Q5_K
    14: "q6_k",      # GGML_TYPE_Q6_K
    15: "q8_k",      # GGML_TYPE_Q8_K
    16: "iq2_xxs",   # GGML_TYPE_IQ2_XXS
    17: "iq2_xs",    # GGML_TYPE_IQ2_XS
    18: "iq3_xxs",   # GGML_TYPE_IQ3_XXS
    19: "iq1_s",     # GGML_TYPE_IQ1_S
    20: "iq4_nl",    # GGML_TYPE_IQ4_NL
    21: "iq3_s",     # GGML_TYPE_IQ3_S
    22: "iq2_s",     # GGML_TYPE_IQ2_S
    23: "iq4_xs",    # GGML_TYPE_IQ4_XS
    24: "int8",      # GGML_TYPE_I8
    25: "int16",     # GGML_TYPE_I16
    26: "int32",     # GGML_TYPE_I32
    27: "int64",     # GGML_TYPE_I64
    28: "float64",   # GGML_TYPE_F64
    29: "iq1_m",     # GGML_TYPE_IQ1_M
    30: "bfloat16",  # GGML_TYPE_BF16
    34: "tq1_0",     # GGML_TYPE_TQ1_0
    35: "tq2_0",     # GGML_TYPE_TQ2_0
}


class ModelLoader:
    def __init__(self):
        # State for on-demand GGUF tensor access (see get_tensor_data).
        self.gguf_path = None
        self.gguf_tensor_info = {}
        self.gguf_data_offset = None

    def load(self, path: str) -> Tuple[Optional[torch.nn.Module], dict]:
        """Load a model from a file. Returns (model, metadata)."""
        ext = os.path.splitext(path)[1].lower()

        if ext == ".safetensors":
            return self._load_safetensors(path)
        elif ext in (".pt", ".pth", ".bin", ".ckpt"):
            return self._load_pytorch(path)
        elif ext == ".onnx":
            return self._load_onnx(path)
        elif ext == ".gguf":
            return self._load_gguf(path)
        elif ext == ".ipynb":
            return self._load_ipynb(path)
        elif ext in (".h5", ".hdf5"):
            return self._load_h5(path)
        elif ext in (".pkl", ".pickle", ".joblib"):
            return self._load_pickle(path)
        elif ext in (".npy", ".npz"):
            return self._load_numpy(path)
        elif ext in (".pb", ".tflite"):
            return self._load_tensorflow(path)
        elif ext in (".mlmodel", ".mlpackage"):
            return self._load_coreml(path)
        elif ext in (".weights", ".dat", ".model", ".caffemodel"):
            return self._load_generic_weights(path)
        elif ext in (".json", ".yaml", ".yml"):
            return self._load_config(path)
        else:
            # Try to load as PyTorch checkpoint (many formats use .bin, .pt, etc.)
            return self._try_load_as_pytorch(path)

    def load_folder(self, path: str) -> Tuple[Optional[torch.nn.Module], dict]:
        """Load a model from a HuggingFace-style directory."""
        config_path = os.path.join(path, "config.json")
        if not os.path.exists(config_path):
            raise FileNotFoundError(f"No config.json found in {path}")

        with open(config_path, "r") as f:
            config = json.load(f)

        # Try to find weight files (all supported formats)
        weight_files = []
        _weight_exts = {
            ".safetensors", ".bin", ".pt", ".pth", ".ckpt",
            ".gguf", ".onnx", ".h5", ".hdf5",
            ".pkl", ".pickle", ".joblib",
            ".npy", ".npz", ".pb", ".tflite",
            ".weights", ".dat", ".model",
        }
        for fname in os.listdir(path):
            ext = os.path.splitext(fname)[1].lower()
            if ext in _weight_exts:
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

        The full graph structure (layers, tensors, summary) is derived from the
        GGUF header so the UI can visualize every node even though no live
        torch tensors exist. Raw tensor bytes stay untouched (read-only).
        """
        try:
            metadata = self._parse_gguf_header(path)
            metadata["format"] = "gguf"
            metadata["path"] = path
            metadata["filename"] = os.path.basename(path)
            metadata["size_bytes"] = os.path.getsize(path)
            metadata["trainable"] = False

            # Remember where the weights live so individual tensors can be
            # dequantized on demand (statistics, heatmaps, weight surgery).
            self.gguf_path = path
            self.gguf_tensor_info = metadata.get("tensor_info", {})
            self.gguf_data_offset = metadata.get("data_offset")

            metadata["error"] = (
                "GGUF is a quantized inference format — visualization, statistics, "
                "heatmaps and weight surgery all work because tensors are "
                "dequantized on demand. Gradient training does not: export to "
                "Safetensors (File → Export) to fine-tune the result further."
            )
            # Compact the KV metadata: huge arrays (tokenizer vocab can exceed
            # 100k entries) must never travel over stdio JSON-RPC.
            metadata["metadata_kv"] = self._compact_gguf_kv(metadata.get("metadata_kv", {}))
            # Build the UI-facing structure the same way WeightAnalyzer does for
            # real state dicts, so the renderer needs zero special-casing.
            self._attach_gguf_structure(metadata)
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

    @staticmethod
    def _compact_gguf_kv(kv: dict, max_arr: int = 8) -> dict:
        """Truncate large arrays in GGUF KV metadata for transport."""
        compact = {}
        for key, value in kv.items():
            if isinstance(value, list):
                if len(value) > max_arr:
                    compact[key] = {
                        "_truncated": True,
                        "length": len(value),
                        "preview": value[:max_arr],
                    }
                else:
                    compact[key] = value
            elif isinstance(value, dict):
                compact[key] = ModelLoader._compact_gguf_kv(value, max_arr)
            else:
                compact[key] = value
        return compact

    @staticmethod
    def _dtype_gguf_to_torch(dtype_name: str) -> str:
        """Map a GGUF dtype name to the torch-style dtype label used by the UI."""
        if dtype_name.startswith("q") or dtype_name.startswith("iq"):
            return f"quantized({dtype_name})"
        return dtype_name

    def _attach_gguf_structure(self, metadata: dict) -> None:
        """Derive layers/tensors/summary from GGUF tensor_info so the renderer
        can visualize the model exactly like a safetensors model."""
        tensor_info = metadata.get("tensor_info", {})
        if not tensor_info:
            return

        # Estimate bytes-per-element per GGUF quant type (file bytes / params
        # would double-count embeddings; per-type sizes are accurate enough).
        _QUANT_BPE = {
            "q4_0": 0.56, "q4_1": 0.62, "q4_k": 0.58, "q5_0": 0.69,
            "q5_1": 0.75, "q5_k": 0.69, "q6_k": 0.82, "q8_0": 1.06,
            "q8_1": 1.06, "iq1": 0.25, "iq2": 0.28, "iq3": 0.41,
            "iq4": 0.53, "tq1": 0.25, "tq2": 0.5,
        }

        def _bpe(dtype: str) -> float:
            base = dtype.split("_k")[0] if "_k" in dtype else dtype
            for prefix, bpe in _QUANT_BPE.items():
                if base.startswith(prefix):
                    return bpe
            if dtype in ("float16",): return 2.0
            if dtype in ("bfloat16",): return 2.0
            if dtype in ("float32",): return 4.0
            if dtype in ("float64",): return 8.0
            if dtype in ("int8", "uint8"): return 1.0
            return 2.0  # default: assume 16-bit

        layer_map = {}
        tensors = []
        dtype_counts = {}
        total_params = 0
        total_bytes = 0

        for name, info in tensor_info.items():
            shape = info.get("shape", [])
            dtype_name = info.get("dtype", "unknown")
            dtype_label = self._dtype_gguf_to_torch(dtype_name)
            param_count = 1
            for d in shape:
                param_count *= d
            byte_count = int(param_count * _bpe(dtype_name))

            parts = name.split(".")
            layer_key = ".".join(parts[:-1]) if len(parts) >= 2 else name
            if layer_key not in layer_map:
                layer_map[layer_key] = {
                    "name": layer_key,
                    "tensors": [],
                    "total_params": 0,
                    "total_bytes": 0,
                    "dtypes": [],
                }
            layer_map[layer_key]["tensors"].append(name)
            layer_map[layer_key]["total_params"] += param_count
            layer_map[layer_key]["total_bytes"] += byte_count
            if dtype_label not in layer_map[layer_key]["dtypes"]:
                layer_map[layer_key]["dtypes"].append(dtype_label)

            tensors.append({
                "name": name,
                "shape": shape,
                "dtype": dtype_label,
                "param_count": param_count,
                "byte_count": byte_count,
                "requires_grad": False,
            })

            total_params += param_count
            total_bytes += byte_count
            dtype_counts[dtype_label] = dtype_counts.get(dtype_label, 0) + param_count

        depth_groups = {}
        for name in tensor_info:
            depth = name.count(".")
            depth_groups[depth] = depth_groups.get(depth, 0) + 1

        metadata["layers"] = list(layer_map.values())
        metadata["tensors"] = tensors
        metadata["summary"] = {
            "total_params": total_params,
            "total_bytes": total_bytes,
            "total_mb": round(total_bytes / (1024 * 1024), 2),
            "tensor_count": len(tensors),
            "trainable_count": 0,
            "frozen_count": len(tensors),
            "dtype_distribution": dtype_counts,
            "depth_distribution": depth_groups,
            "format_params": self._format_params(total_params),
            "quantized": True,
            "quantization": metadata.get("file_type_name") or metadata.get("metadata_kv", {}).get("general.file_type"),
            "architecture": (metadata.get("architectures") or [None])[0],
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
            file_size = os.path.getsize(path)
            if file_size < 24:
                raise ValueError(f"File too small to be GGUF ({file_size} bytes)")

            # Read magic number (4 bytes)
            raw = f.read(4)
            if len(raw) < 4:
                raise ValueError("File too short to contain GGUF magic")
            magic = struct.unpack("<I", raw)[0]
            if magic != GGUF_MAGIC:
                raise ValueError(f"Not a valid GGUF file (magic: 0x{magic:08x})")

            # Read version (4 bytes)
            raw = f.read(4)
            if len(raw) < 4:
                raise ValueError("Truncated GGUF header: cannot read version")
            version = struct.unpack("<I", raw)[0]
            metadata["gguf_version"] = version

            # Read tensor count (8 bytes)
            raw = f.read(8)
            if len(raw) < 8:
                raise ValueError("Truncated GGUF header: cannot read tensor count")
            tensor_count = struct.unpack("<Q", raw)[0]
            metadata["tensor_count"] = tensor_count

            # Read metadata KV count (8 bytes)
            raw = f.read(8)
            if len(raw) < 8:
                raise ValueError("Truncated GGUF header: cannot read KV count")
            kv_count = struct.unpack("<Q", raw)[0]

            # Sanity check: kv_count and tensor_count should be reasonable
            if kv_count > 100000 or tensor_count > 1000000:
                raise ValueError(
                    f"Suspicious GGUF header: {kv_count} KV pairs, {tensor_count} tensors. "
                    "File may be corrupted or format version unsupported."
                )

            # Parse metadata key-value pairs
            for _ in range(kv_count):
                kv = self._read_gguf_kv(f, version)
                if kv is not None:
                    key, value = kv
                    metadata["metadata_kv"][key] = value

                    # Extract useful fields
                    if key == "general.architecture":
                        metadata["architectures"] = [value] if isinstance(value, str) else value
                    elif key == "general.file_type":
                        metadata["file_type_id"] = value

            # Human-readable quantization name (GGUF spec llm_ftype enum)
            _FILE_TYPES = {
                0: "F32", 1: "F16", 2: "Q4_0", 3: "Q4_1", 4: "Q4_1_SOME_F16",
                7: "Q8_0", 8: "Q5_0", 9: "Q5_1", 10: "Q2_K",
                11: "Q3_K_S", 12: "Q3_K_M", 13: "Q3_K_L",
                14: "Q4_K_S", 15: "Q4_K_M", 16: "Q5_K_S", 17: "Q5_K_M", 18: "Q6_K",
                19: "IQ2_XXS", 20: "IQ2_XS", 21: "Q2_K_S", 22: "IQ3_XS",
                23: "IQ3_XXS", 24: "IQ1_S", 25: "IQ4_NL", 26: "IQ3_S",
                27: "IQ3_M", 28: "IQ2_S", 29: "IQ2_M", 30: "IQ4_XS",
                31: "IQ1_M", 32: "BF16",
            }
            ft = metadata.get("file_type_id")
            if isinstance(ft, int):
                metadata["file_type_name"] = _FILE_TYPES.get(ft, f"type_{ft}")

            # Huge raw arrays (full tokenizer vocab: 100k+ strings) would make
            # the JSON-RPC response megabytes wide and can choke the IPC layer.
            # They are dropped here; _load_gguf re-adds compact previews later.
            for _big in ("tokenizer.ggml.tokens", "tokenizer.ggml.scores", "tokenizer.ggml.token_type"):
                metadata["metadata_kv"].pop(_big, None)

            # Parse tensor info (we skip full parsing for large files)
            if tensor_count > 0 and tensor_count < 100000:
                # Read tensor name + n_dims + dims + type for each tensor
                for _ in range(tensor_count):
                    # Check we haven't hit EOF
                    pos = f.tell()
                    if pos >= file_size:
                        break
                    try:
                        # GGUF v2/v3 tensor info layout:
                        #   name (string), n_dims (u32), dims[n_dims] (u64 each),
                        #   type (u32), offset (u64)
                        tensor_name = self._read_gguf_string(f)
                        raw = f.read(4)
                        if len(raw) < 4:
                            break
                        n_dims = struct.unpack("<I", raw)[0]
                        if n_dims > 100:  # sanity check
                            break
                        dims = []
                        for _ in range(n_dims):
                            raw = f.read(8)
                            if len(raw) < 8:
                                break
                            dims.append(struct.unpack("<Q", raw)[0])
                        if len(dims) < n_dims:
                            break
                        raw = f.read(4)
                        if len(raw) < 4:
                            break
                        tensor_type = struct.unpack("<I", raw)[0]
                        raw = f.read(8)  # per-tensor data offset (relative to data section)
                        if len(raw) < 8:
                            break
                        tensor_offset = struct.unpack("<Q", raw)[0]
                        dtype_name = GGUF_TENSOR_TYPE_MAP.get(tensor_type, f"q{tensor_type}")
                        metadata["tensor_info"][tensor_name] = {
                            "shape": dims,
                            "dtype": dtype_name,
                            "type_id": tensor_type,
                            # Kept so the tensor's bytes can be located later for
                            # dequantization (statistics, heatmaps, weight edits).
                            "offset": tensor_offset,
                        }
                    except (struct.error, OSError):
                        break  # Partial parse is OK — we still have metadata

            # The tensor data section starts after the (alignment-padded) end of
            # the tensor-info block. Needed for get_tensor_data().
            alignment = metadata["metadata_kv"].get("general.alignment", 32)
            try:
                alignment = int(alignment)
            except (TypeError, ValueError):
                alignment = 32
            if alignment <= 0 or alignment > 1 << 20:
                alignment = 32
            aligned = ((f.tell() + alignment - 1) // alignment) * alignment
            metadata["data_offset"] = aligned
            metadata["alignment"] = alignment

            # Exact on-disk size per tensor, derived from the ggml block
            # layout. Callers use this to read precisely the right byte range.
            for tname, tinfo in metadata["tensor_info"].items():
                tinfo["byte_count"] = self._gguf_tensor_byte_size(
                    tinfo.get("type_id"), tinfo.get("shape", [])
                )

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

    @staticmethod
    def _gguf_tensor_byte_size(ggml_type, shape) -> int:
        """On-disk size of a GGUF tensor, using the ggml block layout."""
        try:
            from gguf_dequant import BLOCK_LAYOUT
        except Exception:
            BLOCK_LAYOUT = {}

        param_count = 1
        for d in shape or []:
            param_count *= int(d)
        if param_count <= 0:
            return 0

        layout = BLOCK_LAYOUT.get(ggml_type)
        if layout is None:
            # Unknown/fp type: assume 1-2 bytes per element so we never
            # over-allocate. Only used for display when the real layout is
            # unavailable.
            return param_count
        block_elems, block_bytes = layout
        n_blocks = (param_count + block_elems - 1) // block_elems
        return n_blocks * block_bytes

    def get_tensor_data(self, name: str):
        """
        Read the raw (still packed) bytes of one GGUF tensor.

        Returns None when the tensor is unknown or the file/data offset is not
        available, so callers can degrade instead of raising.
        """
        info = (self.gguf_tensor_info or {}).get(name)
        if not info:
            return None
        data_offset = self.gguf_data_offset
        path = self.gguf_path
        if data_offset is None or not path:
            return None

        byte_count = info.get("byte_count")
        if not byte_count:
            return None

        # Guard against reading past EOF on a truncated file.
        try:
            file_size = os.path.getsize(path)
        except OSError:
            return None
        absolute = data_offset + int(info.get("offset", 0))
        if absolute < 0 or absolute + byte_count > file_size:
            available = max(0, file_size - absolute)
            if available <= 0:
                return None
            byte_count = available

        try:
            with open(path, "rb") as f:
                f.seek(absolute)
                return f.read(byte_count)
        except OSError:
            return None

    def get_gguf_tensor_info(self, name: str):
        """Metadata (shape/type_id/dtype/offset) for one GGUF tensor."""
        return (self.gguf_tensor_info or {}).get(name)

    def _read_gguf_string(self, f) -> str:
        """Read a length-prefixed string from a GGUF file."""
        raw = f.read(8)
        if len(raw) < 8:
            raise ValueError("Unexpected EOF reading GGUF string length")
        length = struct.unpack("<Q", raw)[0]
        if length > 10_000_000:  # sanity: no string should be >10MB
            raise ValueError(f"GGUF string too long: {length} bytes")
        data = f.read(length)
        return data.decode("utf-8", errors="replace")

    def _read_gguf_kv_value(self, f, dtype: int):
        """Read a single value based on GGUF dtype."""
        # Map dtype to (struct format, byte count)
        _dtype_sizes = {
            0: ("<B", 1),   # uint8
            1: ("<b", 1),   # int8
            2: ("<H", 2),   # uint16
            3: ("<h", 2),   # int16
            4: ("<I", 4),   # uint32
            5: ("<i", 4),   # int32
            6: ("<f", 4),   # float32
            7: ("<B", 1),   # bool (stored as uint8)
            10: ("<Q", 8),  # uint64
            11: ("<q", 8),  # int64
            12: ("<d", 8),  # float64
            13: ("<e", 2),  # float16
        }

        if dtype == 8:  # string
            return self._read_gguf_string(f)
        elif dtype == 9:  # array
            raw = f.read(4)
            if len(raw) < 4:
                raise ValueError("Unexpected EOF reading array element type")
            arr_type = struct.unpack("<I", raw)[0]
            raw = f.read(8)
            if len(raw) < 8:
                raise ValueError("Unexpected EOF reading array length")
            arr_len = struct.unpack("<Q", raw)[0]
            if arr_len > 10_000_000:  # sanity check
                raise ValueError(f"Array too long: {arr_len}")
            return [self._read_gguf_kv_value(f, arr_type) for _ in range(arr_len)]
        elif dtype in _dtype_sizes:
            fmt, size = _dtype_sizes[dtype]
            raw = f.read(size)
            if len(raw) < size:
                raise ValueError(
                    f"Unexpected EOF reading GGUF value: expected {size} bytes, "
                    f"got {len(raw)} (dtype={dtype})"
                )
            value = struct.unpack(fmt, raw)[0]
            if dtype == 7:  # bool
                return value != 0
            return value
        else:
            raise ValueError(f"Unknown GGUF dtype: {dtype}")

    def _read_gguf_kv(self, f, version: int) -> Optional[Tuple[str, any]]:
        """Read a single key-value pair from GGUF header."""
        try:
            key = self._read_gguf_string(f)
            raw = f.read(4)
            if len(raw) < 4:
                raise ValueError("Unexpected EOF reading KV value type")
            value_type = struct.unpack("<I", raw)[0]
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
        """Load a JSON/YAML config file."""
        import yaml
        with open(path, "r") as f:
            if path.endswith((".yaml", ".yml")):
                config = yaml.safe_load(f)
            else:
                config = json.load(f)
        return None, {
            "format": "config",
            "path": path,
            "filename": os.path.basename(path),
            "size_bytes": os.path.getsize(path),
            "config": config,
            "trainable": False,
        }

    def _load_h5(self, path: str) -> Tuple[Optional[dict], dict]:
        """Load Keras/HDF5 model."""
        try:
            import h5py
            with h5py.File(path, "r") as f:
                # Extract metadata from HDF5 file structure
                attrs = dict(f.attrs) if hasattr(f, "attrs") else {}
                model_config = attrs.get("model_config", None)
                if isinstance(model_config, str):
                    try:
                        model_config = json.loads(model_config)
                    except (json.JSONDecodeError, TypeError):
                        pass

                # List weight datasets
                weight_names = []
                def _visit(name, obj):
                    if isinstance(obj, h5py.Dataset):
                        weight_names.append(name)
                f.visititems(_visit)

                metadata = {
                    "format": "h5",
                    "path": path,
                    "filename": os.path.basename(path),
                    "size_bytes": os.path.getsize(path),
                    "trainable": True,
                    "weight_count": len(weight_names),
                    "weight_names": weight_names[:50],
                    "model_config": model_config,
                    "attributes": {k: str(v)[:200] for k, v in attrs.items() if k != "model_config"},
                }
                return None, metadata
        except ImportError:
            return None, {
                "format": "h5",
                "path": path,
                "filename": os.path.basename(path),
                "size_bytes": os.path.getsize(path),
                "trainable": False,
                "error": "h5py not installed. Install with: pip install h5py",
            }
        except Exception as e:
            return None, {
                "format": "h5",
                "path": path,
                "filename": os.path.basename(path),
                "size_bytes": os.path.getsize(path),
                "trainable": False,
                "error": f"Failed to parse H5 file: {e}",
            }

    def _load_pickle(self, path: str) -> Tuple[Optional[dict], dict]:
        """Load pickle/joblib serialized model."""
        try:
            import pickle
            with open(path, "rb") as f:
                data = pickle.load(f)

            metadata = {
                "format": "pickle",
                "path": path,
                "filename": os.path.basename(path),
                "size_bytes": os.path.getsize(path),
                "python_type": type(data).__name__,
                "python_module": type(data).__module__,
                "trainable": hasattr(data, "fit") or hasattr(data, "parameters"),
            }

            # If it's a dict with state_dict, treat as model checkpoint
            if isinstance(data, dict):
                if "state_dict" in data:
                    state_dict = data["state_dict"]
                    metadata.update(self._build_metadata(state_dict, path, "pickle"))
                    return state_dict, metadata
                elif "model" in data and isinstance(data["model"], dict):
                    metadata.update(self._build_metadata(data["model"], path, "pickle"))
                    return data["model"], metadata
                metadata["keys"] = list(data.keys())[:20]

            # If it's a torch model
            if hasattr(data, "state_dict"):
                state_dict = data.state_dict()
                metadata.update(self._build_metadata(state_dict, path, "pickle"))
                return state_dict, metadata

            # If it's a sklearn model
            if hasattr(data, "get_params"):
                try:
                    metadata["sklearn_params"] = str(data.get_params())[:500]
                except Exception:
                    pass

            return None, metadata
        except Exception as e:
            return None, {
                "format": "pickle",
                "path": path,
                "filename": os.path.basename(path),
                "size_bytes": os.path.getsize(path),
                "trainable": False,
                "error": f"Failed to load pickle file: {e}",
            }

    def _load_numpy(self, path: str) -> Tuple[Optional[dict], dict]:
        """Load NumPy array file."""
        try:
            import numpy as np
            if path.endswith(".npz"):
                data = np.load(path, allow_pickle=True)
                arrays = {k: data[k] for k in data.files}
                total_params = sum(a.size for a in arrays.values())
                total_bytes = sum(a.nbytes for a in arrays.values())
                metadata = {
                    "format": "numpy",
                    "path": path,
                    "filename": os.path.basename(path),
                    "size_bytes": os.path.getsize(path),
                    "trainable": False,
                    "array_count": len(arrays),
                    "arrays": {k: {"shape": list(v.shape), "dtype": str(v.dtype)} for k, v in arrays.items()},
                    "total_params": total_params,
                    "total_bytes": total_bytes,
                }
                # Wrap as state_dict for compatibility
                state_dict = {k: torch.from_numpy(v) if v.dtype.kind in ("f", "i", "u") else torch.tensor(v) for k, v in arrays.items()}
                return state_dict, metadata
            else:
                arr = np.load(path, allow_pickle=True)
                metadata = {
                    "format": "numpy",
                    "path": path,
                    "filename": os.path.basename(path),
                    "size_bytes": os.path.getsize(path),
                    "trainable": False,
                    "shape": list(arr.shape),
                    "dtype": str(arr.dtype),
                    "total_params": arr.size,
                    "total_bytes": arr.nbytes,
                }
                tensor = torch.from_numpy(arr) if arr.dtype.kind in ("f", "i", "u") else torch.tensor(arr)
                state_dict = {"array": tensor}
                return state_dict, metadata
        except ImportError:
            return None, {
                "format": "numpy",
                "path": path,
                "filename": os.path.basename(path),
                "size_bytes": os.path.getsize(path),
                "trainable": False,
                "error": "numpy not installed. Install with: pip install numpy",
            }
        except Exception as e:
            return None, {
                "format": "numpy",
                "path": path,
                "filename": os.path.basename(path),
                "size_bytes": os.path.getsize(path),
                "trainable": False,
                "error": f"Failed to load NumPy file: {e}",
            }

    def _load_tensorflow(self, path: str) -> Tuple[None, dict]:
        """Load TensorFlow model (metadata only — no training in this app)."""
        ext = os.path.splitext(path)[1].lower()
        fmt = "tflite" if ext == ".tflite" else "tensorflow_pb"
        metadata = {
            "format": fmt,
            "path": path,
            "filename": os.path.basename(path),
            "size_bytes": os.path.getsize(path),
            "trainable": False,
            "error": (
                f"TensorFlow {fmt} models are read-only in this app. "
                "Convert to PyTorch/Safetensors first for training and unlearning."
            ),
        }
        # Try to extract some metadata from TFLite flatbuffer
        if ext == ".tflite":
            try:
                with open(path, "rb") as f:
                    header = f.read(8)
                    if len(header) >= 4:
                        metadata["tflite_version"] = header[1] if len(header) > 1 else "unknown"
            except Exception:
                pass
        return None, metadata

    def _load_coreml(self, path: str) -> Tuple[None, dict]:
        """Load CoreML model (metadata only)."""
        ext = os.path.splitext(path)[1].lower()
        metadata = {
            "format": "coreml",
            "path": path,
            "filename": os.path.basename(path),
            "size_bytes": os.path.getsize(path),
            "trainable": False,
            "error": (
                "CoreML models are read-only in this app. "
                "Convert to PyTorch/Safetensors first for training and unlearning."
            ),
        }
        # Try to read CoreML protobuf header for model type
        if ext == ".mlmodel":
            try:
                with open(path, "rb") as f:
                    header = f.read(100)
                    metadata["file_preview_hex"] = header[:20].hex()
            except Exception:
                pass
        return None, metadata

    def _load_generic_weights(self, path: str) -> Tuple[None, dict]:
        """Load generic weight file — try to detect format."""
        size = os.path.getsize(path)
        metadata = {
            "format": "unknown_weights",
            "path": path,
            "filename": os.path.basename(path),
            "size_bytes": size,
            "trainable": False,
        }

        # Try to detect if it's a PyTorch checkpoint (starts with PK zip)
        try:
            with open(path, "rb") as f:
                header = f.read(10)
                if header[:2] == b"PK":
                    # Likely a PyTorch checkpoint (ZIP format)
                    metadata["error"] = "Appears to be a PyTorch checkpoint. Try renaming to .pt or .pth."
                    return self._load_pytorch(path)
                elif header[:4] == b"\x89HDF" or header[:4] == b"\x08\x08\x04\x04":
                    metadata["error"] = "Appears to be an HDF5 file. Try renaming to .h5 or .hdf5."
                    return self._load_h5(path)
                else:
                    # Check if it's all zeros or random — likely not a real model
                    if size < 1000:
                        metadata["error"] = f"File too small ({size} bytes) to be a model."
                    else:
                        metadata["error"] = (
                            f"Unknown weight format ({size:,} bytes). "
                            "Try renaming with a known extension (.pt, .safetensors, .h5, .gguf, .onnx, .pkl) "
                            "or place in a HuggingFace-style directory with config.json."
                        )
                    return None, metadata
        except Exception:
            metadata["error"] = "Could not determine file format."
            return None, metadata

    def _try_load_as_pytorch(self, path: str) -> Tuple[Optional[dict], dict]:
        """Try to load an unknown file as a PyTorch checkpoint."""
        try:
            return self._load_pytorch(path)
        except Exception:
            # Not a valid PyTorch file — provide helpful error
            ext = os.path.splitext(path)[1].lower()
            return None, {
                "format": "unknown",
                "path": path,
                "filename": os.path.basename(path),
                "size_bytes": os.path.getsize(path),
                "trainable": False,
                "error": (
                    f"Could not load '{ext or '(no extension)'}' file. "
                    "Supported formats: .safetensors, .pt, .pth, .bin, .ckpt, .gguf, .onnx, "
                    ".h5, .hdf5, .pkl, .pickle, .joblib, .npy, .npz, .pb, .tflite, "
                    ".mlmodel, .mlpackage, .weights, .dat, .model, .caffemodel, .ipynb, .json, .yaml. "
                    "Try renaming the file with the correct extension, or place it in a directory with config.json."
                ),
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
