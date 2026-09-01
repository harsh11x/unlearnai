"""
NullMind - Model Adapter
Abstract interface and HuggingFace implementation for model operations.
"""

import hashlib
import json
import logging
import os
from abc import ABC, abstractmethod
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Any, Optional

import torch
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    PreTrainedModel,
    PreTrainedTokenizer,
)

from ml.config import ModelConfig

logger = logging.getLogger(__name__)


@dataclass
class ModelMetadata:
    """Metadata extracted from a model during inspection."""
    name: str
    architecture: str
    parameter_count: int
    parameter_count_formatted: str
    tokenizer_type: str
    vocab_size: int
    max_position_embeddings: int
    dtype: str
    model_format: str
    model_hash: str
    model_size_bytes: int
    model_size_formatted: str
    estimated_vram_gb: float
    supported_architectures: list[str]
    is_compatible: bool
    config: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict:
        return asdict(self)

    def to_json(self) -> str:
        return json.dumps(self.to_dict(), indent=2)


def _format_size(size_bytes: int) -> str:
    """Format byte size to human readable."""
    for unit in ["B", "KB", "MB", "GB", "TB"]:
        if size_bytes < 1024:
            return f"{size_bytes:.2f} {unit}"
        size_bytes /= 1024
    return f"{size_bytes:.2f} PB"


def _format_params(param_count: int) -> str:
    """Format parameter count to human readable."""
    if param_count >= 1e9:
        return f"{param_count / 1e9:.2f}B"
    elif param_count >= 1e6:
        return f"{param_count / 1e6:.1f}M"
    elif param_count >= 1e3:
        return f"{param_count / 1e3:.1f}K"
    return str(param_count)


def _compute_hash(path: str, chunk_size: int = 8192) -> str:
    """Compute SHA-256 hash of a file or directory."""
    sha256 = hashlib.sha256()

    path_obj = Path(path)
    if path_obj.is_file():
        with open(path, "rb") as f:
            while chunk := f.read(chunk_size):
                sha256.update(chunk)
    elif path_obj.is_dir():
        # Hash all files in directory in sorted order
        for file_path in sorted(path_obj.rglob("*")):
            if file_path.is_file():
                rel_path = file_path.relative_to(path_obj)
                sha256.update(str(rel_path).encode())
                with open(file_path, "rb") as f:
                    while chunk := f.read(chunk_size):
                        sha256.update(chunk)
    else:
        raise ValueError(f"Path does not exist: {path}")

    return sha256.hexdigest()


# Supported architectures for V1
SUPPORTED_ARCHITECTURES = [
    "GPTNeoForCausalLM",
    "GPTNeoXForCausalLM",
    "GPT2LMHeadModel",
    "CodeGenForCausalLM",
    "OPTForCausalLM",
    "LlamaForCausalLM",
    "MistralForCausalLM",
    "PhiForCausalLM",
    "Qwen2ForCausalLM",
    "GPTJForCausalLM",
]


class ModelAdapter(ABC):
    """Abstract base class for model adapters."""

    @abstractmethod
    def load(self, model_path: str, config: Optional[ModelConfig] = None) -> Any:
        """Load a model and tokenizer."""
        ...

    @abstractmethod
    def inspect(self, model_path: str) -> ModelMetadata:
        """Extract model metadata without full inference."""
        ...

    @abstractmethod
    def tokenize(self, text: str) -> Any:
        """Tokenize input text."""
        ...

    @abstractmethod
    def generate(self, prompt: str, **kwargs) -> str:
        """Generate text from a prompt."""
        ...

    @abstractmethod
    def generate_batch(self, prompts: list[str], **kwargs) -> list[str]:
        """Generate text from multiple prompts."""
        ...

    @abstractmethod
    def save(self, output_path: str, version_tag: str = "v1") -> str:
        """Save the model to a new location. Returns path to saved model."""
        ...

    @abstractmethod
    def unload(self) -> None:
        """Release model from memory."""
        ...

    @abstractmethod
    def get_model(self) -> Any:
        """Return the underlying model for direct access (e.g., for unlearning)."""
        ...

    @abstractmethod
    def get_tokenizer(self) -> Any:
        """Return the tokenizer."""
        ...


class HuggingFaceAdapter(ModelAdapter):
    """HuggingFace Transformers model adapter."""

    def __init__(self):
        self.model: Optional[PreTrainedModel] = None
        self.tokenizer: Optional[PreTrainedTokenizer] = None
        self.model_path: Optional[str] = None
        self._config: Optional[ModelConfig] = None

    def load(self, model_path: str, config: Optional[ModelConfig] = None) -> tuple[PreTrainedModel, PreTrainedTokenizer]:
        """Load a HuggingFace model and tokenizer."""
        if config is None:
            config = ModelConfig()

        logger.info(f"Loading model from {model_path}")
        logger.info(f"  dtype={config.torch_dtype}, device_map={config.device_map}")

        # Load tokenizer
        self.tokenizer = AutoTokenizer.from_pretrained(
            model_path,
            trust_remote_code=config.trust_remote_code,
        )
        if self.tokenizer.pad_token is None:
            self.tokenizer.pad_token = self.tokenizer.eos_token

        # Determine dtype
        dtype_map = {
            "float16": torch.float16,
            "float32": torch.float32,
            "bfloat16": torch.bfloat16,
            "auto": "auto",
        }
        torch_dtype = dtype_map.get(config.torch_dtype, torch.float16)

        # Use float32 on CPU, respect config on GPU
        if not torch.cuda.is_available():
            torch_dtype = torch.float32

        # Load model (use "dtype" instead of deprecated "torch_dtype")
        self.model = AutoModelForCausalLM.from_pretrained(
            model_path,
            dtype=torch_dtype,
            device_map=config.device_map if torch.cuda.is_available() else None,
            trust_remote_code=config.trust_remote_code,
            use_safetensors=config.use_safetensors,
            low_cpu_mem_usage=config.low_cpu_mem_usage,
        )
        self.model.eval()
        self.model_path = model_path
        self._config = config

        logger.info(f"Model loaded successfully: {type(self.model).__name__}")
        return self.model, self.tokenizer

    def inspect(self, model_path: str) -> ModelMetadata:
        """Extract model metadata without full inference."""
        logger.info(f"Inspecting model at {model_path}")

        # Load tokenizer for vocab info
        tokenizer = AutoTokenizer.from_pretrained(
            model_path,
            trust_remote_code=False,
        )

        # Get model config without loading full model weights
        from transformers import AutoConfig
        model_config = AutoConfig.from_pretrained(model_path, trust_remote_code=False)

        # Estimate parameter count
        architecture = model_config.model_type
        param_count = getattr(model_config, 'num_parameters', None)
        if param_count is None:
            # Estimate from config
            if hasattr(model_config, 'n_embd') and hasattr(model_config, 'n_layer'):
                embed = model_config.n_embd * getattr(model_config, 'vocab_size', 50000)
                hidden = model_config.n_layer * 12 * model_config.n_embd ** 2
                param_count = embed + hidden
            else:
                param_count = 0  # Can't estimate

        # Resolve the actual local path for HuggingFace model IDs
        resolved_path = Path(model_path)
        if not resolved_path.exists():
            # It's a HuggingFace model ID — try to find it in the local cache
            model_hash = hashlib.sha256(model_path.encode()).hexdigest()
            try:
                from huggingface_hub import try_to_load_from_cache
                # Try to find a cached file to resolve the snapshot directory
                cached = try_to_load_from_cache(model_path, "config.json")
                if cached is not None and not isinstance(cached, str) or (isinstance(cached, str) and os.path.exists(cached)):
                    # Walk up from config.json to find the snapshot directory
                    config_path = Path(cached) if isinstance(cached, str) else Path(str(cached))
                    if config_path.exists():
                        resolved_path = config_path.parent
                        model_hash = _compute_hash(str(resolved_path))
                    else:
                        resolved_path = None
                else:
                    resolved_path = None
            except Exception:
                resolved_path = None
        else:
            model_hash = _compute_hash(str(resolved_path))

        # Check model file format
        model_format = "unknown"
        model_size = 0
        if resolved_path and resolved_path.is_dir():
            safetensors_files = list(resolved_path.glob("*.safetensors"))
            bin_files = list(resolved_path.glob("*.bin"))
            gguf_files = list(resolved_path.glob("*.gguf"))
            if safetensors_files:
                model_format = "safetensors"
                model_size = sum(f.stat().st_size for f in safetensors_files)
            elif gguf_files:
                model_format = "gguf"
                model_size = sum(f.stat().st_size for f in gguf_files)
            elif bin_files:
                model_format = "pytorch_bin"
                model_size = sum(f.stat().st_size for f in bin_files)
            else:
                model_format = "directory"
                model_size = sum(f.stat().st_size for f in resolved_path.rglob("*") if f.is_file())

        # Estimate VRAM (rough: 2 bytes per param for fp16)
        estimated_vram = param_count * 2 / (1024 ** 3) if param_count else 0.0

        # Check compatibility
        arch_type = getattr(model_config, 'model_type', '')
        is_compatible = arch_type in [
            "gpt_neo", "gpt_neox", "gpt2", "codegen", "opt",
            "llama", "mistral", "phi", "qwen2", "gptj"
        ]

        # Use model name from path or HuggingFace ID
        model_name = Path(model_path).name if Path(model_path).exists() else model_path.split("/")[-1]

        metadata = ModelMetadata(
            name=model_name,
            architecture=arch_type,
            parameter_count=param_count,
            parameter_count_formatted=_format_params(param_count),
            tokenizer_type=type(tokenizer).__name__,
            vocab_size=tokenizer.vocab_size,
            max_position_embeddings=getattr(model_config, 'max_position_embeddings', 0),
            dtype=str(model_config.torch_dtype) if hasattr(model_config, 'torch_dtype') else "unknown",
            model_format=model_format,
            model_hash=model_hash,
            model_size_bytes=model_size,
            model_size_formatted=_format_size(model_size),
            estimated_vram_gb=round(estimated_vram, 2),
            supported_architectures=SUPPORTED_ARCHITECTURES,
            is_compatible=is_compatible,
            config={
                "model_type": arch_type,
                "architectures": getattr(model_config, 'architectures', []),
            },
        )

        logger.info(f"Model inspection complete: {metadata.architecture}, {metadata.parameter_count_formatted} params")
        return metadata

    def tokenize(self, text: str) -> dict:
        """Tokenize input text."""
        assert self.tokenizer is not None, "Model not loaded"
        return self.tokenizer(
            text,
            return_tensors="pt",
            truncation=True,
            max_length=self._config.max_length if self._config else 512,
        )

    @torch.no_grad()
    def generate(self, prompt: str, **kwargs) -> str:
        """Generate text from a single prompt."""
        assert self.model is not None and self.tokenizer is not None, "Model not loaded"

        inputs = self.tokenizer(
            prompt,
            return_tensors="pt",
            truncation=True,
            max_length=self._config.max_length if self._config else 512,
        )

        device = next(self.model.parameters()).device
        inputs = {k: v.to(device) for k, v in inputs.items()}

        temperature = kwargs.get("temperature", 0.0)
        do_sample = temperature > 0

        gen_kwargs = {
            "max_new_tokens": kwargs.get("max_new_tokens", 256),
            "do_sample": do_sample,
            "pad_token_id": self.tokenizer.pad_token_id,
        }
        # Only pass temperature/top_p when sampling is enabled
        if do_sample:
            gen_kwargs["temperature"] = temperature
            gen_kwargs["top_p"] = kwargs.get("top_p", 1.0)

        outputs = self.model.generate(**inputs, **gen_kwargs)
        # Decode only the generated tokens (not the prompt)
        generated = outputs[0][inputs["input_ids"].shape[1]:]
        return self.tokenizer.decode(generated, skip_special_tokens=True)

    @torch.no_grad()
    def generate_batch(self, prompts: list[str], **kwargs) -> list[str]:
        """Generate text from multiple prompts."""
        assert self.model is not None and self.tokenizer is not None, "Model not loaded"

        results = []
        for prompt in prompts:
            try:
                result = self.generate(prompt, **kwargs)
                results.append(result)
            except Exception as e:
                logger.error(f"Generation failed for prompt: {prompt[:50]}... Error: {e}")
                results.append(f"[GENERATION ERROR: {str(e)}]")

        return results

    def save(self, output_path: str, version_tag: str = "v1") -> str:
        """Save the model to a new location."""
        assert self.model is not None and self.tokenizer is not None, "Model not loaded"

        save_dir = Path(output_path) / version_tag
        save_dir.mkdir(parents=True, exist_ok=True)

        logger.info(f"Saving model to {save_dir}")
        self.model.save_pretrained(str(save_dir), safe_serialization=True)
        self.tokenizer.save_pretrained(str(save_dir))

        # Save metadata
        metadata = {
            "source_model": self.model_path,
            "version": version_tag,
            "architecture": type(self.model).__name__,
            "parameters": sum(p.numel() for p in self.model.parameters()),
        }
        with open(save_dir / "nullmind_metadata.json", "w") as f:
            json.dump(metadata, f, indent=2)

        logger.info(f"Model saved to {save_dir}")
        return str(save_dir)

    def unload(self) -> None:
        """Release model from memory."""
        if self.model is not None:
            del self.model
            self.model = None
        if self.tokenizer is not None:
            del self.tokenizer
            self.tokenizer = None
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        logger.info("Model unloaded from memory")

    def get_model(self) -> Optional[PreTrainedModel]:
        """Return the underlying model."""
        return self.model

    def get_tokenizer(self) -> Optional[PreTrainedTokenizer]:
        """Return the tokenizer."""
        return self.tokenizer


def create_adapter(model_path: str, config: Optional[ModelConfig] = None) -> HuggingFaceAdapter:
    """Factory function to create and load a model adapter."""
    adapter = HuggingFaceAdapter()
    adapter.load(model_path, config)
    return adapter
