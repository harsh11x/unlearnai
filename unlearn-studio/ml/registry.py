"""
Capability Fabric - Module Registry

On-disk index of capability modules and the evidence attached to them. Pure
stdlib: listing and ranking modules must work on a machine with no torch, no
GPU and no downloaded model weights.

Selection policy is deliberately explicit rather than clever: only *verified*
modules are ever eligible as evidence of a capability, and among those the
highest measured delta wins. An unverified module is still stored and listed -
it is a real delta, just an unproven one - but ``best()`` will not return it.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Iterable, Optional

from ml.modules.manifest import (
    MANIFEST_NAME,
    REGISTRY_NAME,
    ModuleManifest,
    ManifestCorrupt,
)

REGISTRY_VERSION = 1


class RegistryCorrupt(Exception):
    """Raised when the registry file cannot be read."""


class CapabilityRegistry:
    """A directory of module manifests plus a JSON index."""

    def __init__(self, root: str | os.PathLike = "storage/modules"):
        self.root = Path(root)
        self.path = self.root / REGISTRY_NAME
        self._modules: dict[str, ModuleManifest] = {}
        self._loaded = False

    # -- loading / saving -------------------------------------------------

    def _ensure_loaded(self) -> None:
        if not self._loaded:
            self.reload()

    def reload(self) -> None:
        self._modules = {}
        if self.path.exists():
            try:
                data = json.loads(self.path.read_text(encoding="utf-8"))
            except (OSError, json.JSONDecodeError) as exc:
                raise RegistryCorrupt(f"cannot read registry {self.path}: {exc}") from exc
            entries = data.get("modules", []) if isinstance(data, dict) else []
            for entry in entries:
                try:
                    manifest = ModuleManifest.from_dict(entry)
                except ManifestCorrupt:
                    # A single bad entry must not make the whole registry
                    # unusable; it is skipped and reported by validate().
                    continue
                self._modules[manifest.id] = manifest
        self._loaded = True

    def _save(self) -> None:
        self.root.mkdir(parents=True, exist_ok=True)
        payload = {
            "version": REGISTRY_VERSION,
            "modules": [m.to_dict() for m in self._sorted(self._modules.values())],
        }
        tmp = self.path.with_suffix(".json.tmp")
        tmp.write_text(json.dumps(payload, indent=2, sort_keys=True), encoding="utf-8")
        os.replace(tmp, self.path)

    @staticmethod
    def _sorted(manifests: Iterable[ModuleManifest]) -> list[ModuleManifest]:
        return sorted(manifests, key=lambda m: m.id)

    # -- mutation ---------------------------------------------------------

    def add(self, manifest: ModuleManifest, *, replace: bool = False) -> ModuleManifest:
        """
        Register a manifest.

        Re-registering the same id with different contents is refused unless
        ``replace`` is set, so a measurement cannot be silently overwritten by
        a later run that happened to produce the same id.
        """
        self._ensure_loaded()
        existing = self._modules.get(manifest.id)
        if existing is not None and not replace:
            if existing.content_hash() != manifest.content_hash():
                raise ValueError(
                    f"module {manifest.id} already registered with different contents; "
                    "pass replace=True to overwrite"
                )
            return existing
        self._modules[manifest.id] = manifest
        self._save()
        return manifest

    def add_from_directory(self, directory: str | os.PathLike, *, replace: bool = False) -> ModuleManifest:
        return self.add(ModuleManifest.load(directory), replace=replace)

    def remove(self, module_id: str) -> bool:
        self._ensure_loaded()
        if module_id not in self._modules:
            return False
        del self._modules[module_id]
        self._save()
        return True

    # -- queries ----------------------------------------------------------

    def get(self, module_id: str) -> Optional[ModuleManifest]:
        self._ensure_loaded()
        return self._modules.get(module_id)

    def all(self) -> list[ModuleManifest]:
        self._ensure_loaded()
        return self._sorted(self._modules.values())

    def __len__(self) -> int:
        self._ensure_loaded()
        return len(self._modules)

    def __contains__(self, module_id: object) -> bool:
        self._ensure_loaded()
        return module_id in self._modules

    def by_capability(self, capability: str) -> list[ModuleManifest]:
        self._ensure_loaded()
        wanted = capability.strip().lower()
        return [
            m for m in self._sorted(self._modules.values())
            if m.capability.strip().lower() == wanted
        ]

    def capabilities(self) -> list[str]:
        self._ensure_loaded()
        return sorted({m.capability for m in self._modules.values()})

    def rank(self, capability: Optional[str] = None) -> list[ModuleManifest]:
        """
        Verified modules first, then by measured delta, then by absolute score.

        Unverified modules sort last but are never dropped: they are the record
        of what has been built and not yet proven.
        """
        pool = self.by_capability(capability) if capability else self.all()

        def key(m: ModuleManifest):
            return (
                1 if m.verified else 0,
                m.delta if m.delta is not None else float("-inf"),
                m.score_after if m.score_after is not None else float("-inf"),
            )

        return sorted(pool, key=key, reverse=True)

    def best(self, capability: str) -> Optional[ModuleManifest]:
        """Highest-measured module for a capability, ignoring unverified ones."""
        for manifest in self.rank(capability):
            if manifest.verified:
                return manifest
        return None

    def unresolved(self, capability: str) -> list[ModuleManifest]:
        """Modules registered for a capability that never got measured."""
        return [m for m in self.by_capability(capability) if not m.verified]

    def validate(self) -> dict:
        """
        Report modules whose artifacts are missing from disk.

        Used before composition, so a stack never references a delta that
        cannot actually be loaded.
        """
        self._ensure_loaded()
        missing = []
        for manifest in self.all():
            module_dir = self.root / manifest.id
            if not (module_dir / MANIFEST_NAME).exists():
                missing.append({"id": manifest.id, "reason": "manifest not on disk"})
                continue
            weights = module_dir / manifest.adapter_path
            if not weights.exists():
                missing.append({"id": manifest.id, "reason": f"weights missing: {manifest.adapter_path}"})
        return {"ok": not missing, "count": len(self._modules), "damaged": missing}

    def module_dir(self, module_id: str) -> Path:
        return self.root / module_id

    def summary(self) -> str:
        self._ensure_loaded()
        if not self._modules:
            return "registry is empty"
        verified = sum(1 for m in self._modules.values() if m.verified)
        lines = [f"{len(self._modules)} module(s), {verified} verified"]
        for manifest in self.rank():
            lines.append("  " + manifest.summary())
        return "\n".join(lines)
