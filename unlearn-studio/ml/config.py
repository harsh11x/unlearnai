"""
Unlearn Studio - ML Configuration
Central configuration for the machine learning pipeline.
"""

import os
from dataclasses import dataclass, field
from typing import Optional
from pathlib import Path


@dataclass
class ModelConfig:
    """Configuration for model loading and inference."""
    model_name_or_path: str = "Salesforce/codegen-350M-multi"
    torch_dtype: str = "float16"
    device_map: str = "auto"
    max_length: int = 512
    trust_remote_code: bool = False
    use_safetensors: bool = True
    low_cpu_mem_usage: bool = True


@dataclass
class UnlearningConfig:
    """Configuration for unlearning methods."""
    method: str = "retain_aware"
    learning_rate: float = 5e-5
    num_steps: int = 200
    batch_size: int = 4
    retain_weight: float = 1.0
    target_strength: float = 1.0
    gradient_accumulation_steps: int = 1
    max_grad_norm: float = 1.0
    warmup_steps: int = 10
    weight_decay: float = 0.01
    layers_to_edit: Optional[list[int]] = None  # None = all layers
    seed: int = 42
    output_dir: str = "storage/model_versions"

    # Retain-aware specific
    forget_loss_weight: float = 1.0
    retain_loss_weight: float = 1.0


@dataclass
class EvaluationConfig:
    """Configuration for model evaluation."""
    max_new_tokens: int = 256
    temperature: float = 0.0  # deterministic
    top_p: float = 1.0
    batch_size: int = 8
    num_samples_per_probe: int = 1
    score_threshold: float = 0.5
    timeout_seconds: int = 60

    # Verdict thresholds
    forget_threshold: float = 30.0  # minimum % drop for PASS
    retain_threshold: float = 10.0  # maximum % drop for PASS
    collateral_damage_threshold: float = 15.0


@dataclass
class StorageConfig:
    """Configuration for artifact storage."""
    base_dir: str = "storage"
    models_dir: str = "storage/models"
    datasets_dir: str = "storage/datasets"
    artifacts_dir: str = "storage/artifacts"
    evaluations_dir: str = "storage/evaluations"
    reports_dir: str = "storage/reports"

    def ensure_dirs(self):
        """Create all storage directories."""
        for attr_name in dir(self):
            if attr_name.endswith('_dir'):
                path = getattr(self, attr_name)
                Path(path).mkdir(parents=True, exist_ok=True)


@dataclass
class SecurityConfig:
    """Security settings for model handling."""
    max_model_size_gb: float = 10.0
    allowed_formats: list[str] = field(default_factory=lambda: [".safetensors", ".bin"])
    require_safetensors: bool = False
    isolation_mode: bool = True
    max_upload_size_gb: float = 10.0


@dataclass
class AppConfig:
    """Top-level application configuration."""
    model: ModelConfig = field(default_factory=ModelConfig)
    unlearning: UnlearningConfig = field(default_factory=UnlearningConfig)
    evaluation: EvaluationConfig = field(default_factory=EvaluationConfig)
    storage: StorageConfig = field(default_factory=StorageConfig)
    security: SecurityConfig = field(default_factory=SecurityConfig)

    @classmethod
    def from_env(cls) -> "AppConfig":
        """Load configuration from environment variables."""
        config = cls()

        # Model config overrides
        if os.environ.get("MODEL_NAME_OR_PATH"):
            config.model.model_name_or_path = os.environ["MODEL_NAME_OR_PATH"]
        if os.environ.get("TORCH_DTYPE"):
            config.model.torch_dtype = os.environ["TORCH_DTYPE"]

        # Storage overrides
        if os.environ.get("STORAGE_DIR"):
            storage_base = os.environ["STORAGE_DIR"]
            config.storage.base_dir = storage_base
            config.storage.models_dir = f"{storage_base}/models"
            config.storage.datasets_dir = f"{storage_base}/datasets"
            config.storage.artifacts_dir = f"{storage_base}/artifacts"
            config.storage.evaluations_dir = f"{storage_base}/evaluations"
            config.storage.reports_dir = f"{storage_base}/reports"

        # Unlearning overrides
        if os.environ.get("UNLEARNING_LR"):
            config.unlearning.learning_rate = float(os.environ["UNLEARNING_LR"])
        if os.environ.get("UNLEARNING_STEPS"):
            config.unlearning.num_steps = int(os.environ["UNLEARNING_STEPS"])

        return config


# Default config instance
default_config = AppConfig.from_env()
