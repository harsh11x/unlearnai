"""
Capability Fabric - Module Manifest

A *module* is the smallest unit of capability this system can attach, detach,
copy, compose or fuse: a LoRA delta plus the evidence that it does what it
claims. The manifest is the contract every other part of the fabric reads, so it
stays plain serialisable JSON - no tensors, no torch import.

Two invariants matter more than the individual fields:

* A module is only ever attached to the base model it was trained against. The
  manifest carries that identity and ``require_compatible()`` enforces it,
  because a weight delta does not transfer across model families or tokenizers.
  This is the honest boundary on "graft knowledge into any model".

* ``verified`` is False unless scores were actually measured. An unverified
  manifest records that a delta exists; it is never evidence of a capability.
"""

from __future__ import annotations

import hashlib
import json
import os
import re
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

MANIFEST_NAME = "manifest.json"
ADAPTER_WEIGHTS = "adapter_model.safetensors"
REGISTRY_NAME = "registry.json"
MANIFEST_VERSION = 1


class ModuleError(Exception):
    """Base class for module contract violations."""


class IncompatibleBaseModel(ModuleError):
    """Raised when a module is used against a base model it was not built for."""


class ManifestCorrupt(ModuleError):
    """Raised when a manifest on disk cannot be read as a valid manifest."""


def _canonical(payload: Any) -> str:
    return json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str)


def digest(payload: Any) -> str:
    """SHA-256 of a canonical JSON encoding."""
    return hashlib.sha256(_canonical(payload).encode("utf-8")).hexdigest()


def base_identity(model: str) -> str:
    """
    Stable identity for a base-model reference.

    Case and surrounding whitespace are normalised; a local path and a hub id
    are NOT treated as the same model, because we cannot prove they are.
    """
    return digest({"base_model": str(model).strip().lower()})[:16]


def tokenizer_identity(tokenizer: Any) -> str:
    """Identity for a tokenizer when one is available, else empty."""
    if tokenizer is None:
        return ""
    name = getattr(tokenizer, "name_or_path", None)
    if not name:
        return ""
    return digest({"tokenizer": str(name).strip().lower()})[:16]


def _slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", str(text).strip().lower()).strip("-") or "module"


@dataclass
class ModuleManifest:
    """
    Metadata and evidence for one capability module.

    ``score_before``/``score_after`` are probe percentages (0-100) for the
    module's own capability, measured on the module's probe suite. ``collateral``
    is the average loss across the retained capabilities. All three stay None
    until something actually measures them.
    """

    id: str
    capability: str
    base_model: str
    base_identity: str
    tokenizer_identity: str = ""
    method: str = "lora"
    created_at: str = ""
    verified: bool = False

    score_before: Optional[float] = None
    score_after: Optional[float] = None
    delta: Optional[float] = None
    collateral: Optional[float] = None
    verdict: Optional[str] = None

    training: dict = field(default_factory=dict)
    lora: dict = field(default_factory=dict)
    probe_suite: str = ""
    probe_suite_hash: str = ""
    examples: int = 0
    files: dict = field(default_factory=dict)
    notes: str = ""
    version: int = MANIFEST_VERSION

    # -- construction -----------------------------------------------------

    @classmethod
    def create(
        cls,
        *,
        capability: str,
        base_model: str,
        tokenizer_identity: str = "",
        method: str = "lora",
        training: Optional[dict] = None,
        lora: Optional[dict] = None,
        probe_suite: str = "",
        probe_suite_hash: str = "",
        examples: int = 0,
        notes: str = "",
    ) -> "ModuleManifest":
        training = dict(training or {})
        lora = dict(lora or {})
        identity = base_identity(base_model)
        module_id = (
            f"{_slug(capability)}-"
            f"{digest({'capability': capability, 'base': identity, 'training': training, 'lora': lora})[:10]}"
        )
        return cls(
            id=module_id,
            capability=capability,
            base_model=base_model,
            base_identity=identity,
            tokenizer_identity=tokenizer_identity,
            method=method,
            created_at=datetime.now(timezone.utc).isoformat(),
            training=training,
            lora=lora,
            probe_suite=probe_suite,
            probe_suite_hash=probe_suite_hash,
            examples=examples,
            notes=notes,
        )

    def record_scores(
        self,
        *,
        score_before: Optional[float],
        score_after: Optional[float],
        collateral: Optional[float] = None,
        verdict: Optional[str] = None,
        min_delta: float = 0.0,
    ) -> "ModuleManifest":
        """
        Attach measured results to this module.

        ``verified`` becomes True only when both scores are present. A module
        whose delta fails ``min_delta`` stays verified but is not an improvement;
        the registry ranks it accordingly instead of hiding it.
        """
        self.score_before = None if score_before is None else float(score_before)
        self.score_after = None if score_after is None else float(score_after)
        if self.score_before is not None and self.score_after is not None:
            self.delta = round(self.score_after - self.score_before, 2)
            self.verified = True
            if verdict is None:
                verdict = "IMPROVED" if self.delta >= min_delta else "NO IMPROVEMENT"
        self.collateral = None if collateral is None else float(collateral)
        if verdict is not None:
            self.verdict = verdict
        return self

    # -- compatibility ----------------------------------------------------

    def require_compatible(self, model: str, tokenizer_identity_value: str = "") -> None:
        """
        Refuse to attach to a base model this delta was not trained against.

        Raises IncompatibleBaseModel. Tokenizer identity is only enforced when
        both sides recorded one, since most callers cannot cheaply resolve it.
        """
        if base_identity(model) != self.base_identity:
            raise IncompatibleBaseModel(
                f"module {self.id} was trained on {self.base_model!r}; "
                f"refusing to attach to {model!r}"
            )
        if (
            tokenizer_identity_value
            and self.tokenizer_identity
            and tokenizer_identity_value != self.tokenizer_identity
        ):
            raise IncompatibleBaseModel(
                f"module {self.id} was trained with a different tokenizer"
            )

    def is_compatible_with(self, model: str) -> bool:
        return base_identity(model) == self.base_identity

    # -- serialisation ----------------------------------------------------

    def to_dict(self) -> dict:
        return asdict(self)

    def content_hash(self) -> str:
        """Hash of the manifest contents, used for integrity checks."""
        return digest(self.to_dict())

    def save(self, directory: str | os.PathLike) -> str:
        target = Path(directory)
        target.mkdir(parents=True, exist_ok=True)
        path = target / MANIFEST_NAME
        payload = json.dumps(self.to_dict(), indent=2, sort_keys=True)
        tmp = path.with_suffix(".json.tmp")
        tmp.write_text(payload, encoding="utf-8")
        os.replace(tmp, path)
        return str(path)

    @classmethod
    def load(cls, directory: str | os.PathLike) -> "ModuleManifest":
        path = Path(directory) / MANIFEST_NAME
        if not path.exists():
            raise ManifestCorrupt(f"no {MANIFEST_NAME} in {directory}")
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            raise ManifestCorrupt(f"cannot read {path}: {exc}") from exc
        return cls.from_dict(data)

    @classmethod
    def from_dict(cls, data: dict) -> "ModuleManifest":
        if not isinstance(data, dict):
            raise ManifestCorrupt("manifest must be a JSON object")
        known = {f for f in cls.__dataclass_fields__}
        missing = {"id", "capability", "base_model", "base_identity"} - set(data)
        if missing:
            raise ManifestCorrupt(f"manifest missing required fields: {sorted(missing)}")
        kwargs = {k: v for k, v in data.items() if k in known}
        try:
            return cls(**kwargs)
        except TypeError as exc:
            raise ManifestCorrupt(f"invalid manifest: {exc}") from exc

    # -- convenience ------------------------------------------------------

    @property
    def adapter_path(self) -> str:
        return self.files.get("weights", ADAPTER_WEIGHTS)

    def summary(self) -> str:
        if self.verified:
            evidence = f"{self.score_before}% -> {self.score_after}% ({self.delta:+.1f}pp)"
        else:
            evidence = "unverified"
        return f"{self.id}  {self.capability:<20s} {evidence}"
