"""
Capability Fabric API — modules, interference and the fidelity gate.

These endpoints read the module registry and run the same analysis code the CLI
uses. They deliberately do no model loading: listing modules, checking
integrity, computing interference and running the fidelity gate are pure
operations over recorded measurements, so they work on an API host with no GPU.

Anything that would need to load weights or train (module train, apply, compose,
fuse, loop) stays in the worker/CLI for now.
"""

import os

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ml.composition import DEFAULT_THRESHOLD, compute_interference
from ml.distill import DEFAULT_TOLERANCE, verify_fidelity
from ml.registry import CapabilityRegistry

router = APIRouter()


def _registry() -> CapabilityRegistry:
    root = os.environ.get("MODULE_REGISTRY_DIR", "storage/modules")
    return CapabilityRegistry(root)


class InterferenceRequest(BaseModel):
    alone: dict[str, dict[str, float]] = Field(
        default_factory=dict,
        description="{module_id: {capability: score}} with that module attached alone",
    )
    together: dict[str, dict[str, float]] = Field(
        default_factory=dict,
        description='{"a+b": {capability: score}} with both modules attached',
    )
    primary: dict[str, str] = Field(
        default_factory=dict,
        description="{module_id: capability it owns}",
    )
    threshold: float = DEFAULT_THRESHOLD


class FidelityRequest(BaseModel):
    composite: dict[str, float] = Field(default_factory=dict)
    dense: dict[str, float] = Field(default_factory=dict)
    tolerance: float = DEFAULT_TOLERANCE
    required: list[str] = Field(default_factory=list)


@router.get("/")
def list_modules():
    """Every registered module, best evidence first."""
    registry = _registry()
    return {
        "count": len(registry),
        "capabilities": registry.capabilities(),
        "modules": [m.to_dict() for m in registry.rank()],
    }


@router.get("/registry/integrity")
def registry_integrity():
    """Check that every registered module still has its artifacts on disk."""
    report = _registry().validate()
    return report


@router.get("/capabilities")
def list_capabilities():
    """Capabilities the fabric knows how to train and measure."""
    from ml.capabilities import register_capabilities

    specs = register_capabilities()
    return [
        {
            "name": spec.name,
            "probes": spec.probe_count,
            "examples": len(spec.examples),
            "protected_examples": len(spec.retain_examples),
            "probe_suite_hash": spec.probe_suite_hash,
        }
        for spec in sorted(specs.values(), key=lambda s: s.name)
    ]


@router.post("/interference")
def interference(payload: InterferenceRequest):
    """
    Compute pairwise interference from recorded scores.

    A conflict is a non-200-style outcome in spirit: the response reports
    ``ok: false`` rather than silently returning numbers that look fine.
    """
    if not payload.alone:
        raise HTTPException(status_code=400, detail="at least one measured module is required")

    together = {}
    for key, value in payload.together.items():
        parts = key.split("+")
        together[tuple(parts) if len(parts) == 2 else key] = value

    report = compute_interference(
        payload.alone, together, payload.primary, threshold=payload.threshold
    )
    return report.to_dict()


@router.post("/fidelity")
def fidelity(payload: FidelityRequest):
    """
    Run the distillation fidelity gate on recorded scores.

    Returns ``passed: false`` with the regressions named. It never returns a
    success merely because the call succeeded.
    """
    report = verify_fidelity(
        payload.composite,
        payload.dense,
        tolerance=payload.tolerance,
        required=payload.required or None,
    )
    return report.to_dict()


@router.get("/{module_id}")
def get_module(module_id: str):
    manifest = _registry().get(module_id)
    if manifest is None:
        raise HTTPException(status_code=404, detail="Module not found")
    return manifest.to_dict()
