"""
Capability Fabric - modules package.

Exports the manifest contract and the torch-dependent trainers. Trainer and
attach are imported lazily by callers so that importing this package never
requires torch.
"""

from ml.modules.manifest import (
    ADAPTER_WEIGHTS,
    MANIFEST_NAME,
    ModuleError,
    IncompatibleBaseModel,
    ManifestCorrupt,
    ModuleManifest,
    base_identity,
    tokenizer_identity,
)

__all__ = [
    "ADAPTER_WEIGHTS",
    "MANIFEST_NAME",
    "ModuleError",
    "IncompatibleBaseModel",
    "ManifestCorrupt",
    "ModuleManifest",
    "base_identity",
    "tokenizer_identity",
]
