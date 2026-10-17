"""
Capability Fabric - Capability measurement

One instrument, used by every part of the fabric. A module, a composition, a
fused dense model and the self-direction loop all report the same six
capability scores, measured by the same probe suites.

torch-dependent pieces are imported inside the function, so this module can be
imported (and its pure helpers tested) without torch.
"""

from __future__ import annotations

import logging
from typing import Optional

from ml.capabilities import PYTHON_CAPABILITY, RETAIN_CATEGORIES

logger = logging.getLogger(__name__)


def measure_capabilities(
    adapter,
    *,
    max_new_tokens: int = 64,
    model_version: str = "current",
    run_id: Optional[str] = None,
) -> dict[str, float]:
    """
    Probe an adapter and return ``{capability: score_percent}``.

    Python is measured across all 20 of its probe categories; the retain
    capabilities are the individual categories of the retain suite. Deterministic
    decoding is used, so a difference between two runs is a difference in the
    model rather than in sampling.
    """
    from ml.datasets.python_probes import build_python_probe_suite
    from ml.datasets.retain_suite import build_retain_suite
    from ml.evaluation.engine import EvaluationEngine
    from ml.config import AppConfig, EvaluationConfig

    config = AppConfig.from_env().evaluation
    config.max_new_tokens = max_new_tokens
    config.temperature = 0.0

    engine = EvaluationEngine(config)
    model_name = getattr(adapter, "model_path", "unknown") or "unknown"

    python_run = engine.run_evaluation(
        adapter,
        build_python_probe_suite(),
        model_name=model_name,
        model_version=model_version,
        run_id=run_id or "fabric_python",
    )
    retain_run = engine.run_evaluation(
        adapter,
        build_retain_suite(),
        model_name=model_name,
        model_version=model_version,
        run_id=(run_id or "fabric_retain") + "_retain",
    )

    scores: dict[str, float] = {PYTHON_CAPABILITY: float(python_run.metrics.overall_score_percent)}
    for capability in retain_run.metrics.capabilities:
        if capability.capability in RETAIN_CATEGORIES:
            scores[capability.capability] = float(capability.score_percent)

    return scores


def collateral_from(
    before: dict[str, float],
    after: dict[str, float],
    target: str,
) -> float:
    """
    Average drop across every capability except the one being changed.

    Uses the worst *average* rather than the worst single capability so one
    noisy probe category cannot dominate the verdict. Improvements do not
    offset damage: a drop on one capability is not cancelled by a gain on
    another, because they are different capabilities.
    """
    drops = [
        max(0.0, float(before[name]) - float(after.get(name, before[name])))
        for name in before
        if name != target
    ]
    if not drops:
        return 0.0
    return round(sum(drops) / len(drops), 2)


def delta_table(before: dict[str, float], after: dict[str, float]) -> str:
    """Human-readable before/after for the terminal."""
    lines = [f"  {'capability':<22s} {'before':>8s} {'after':>8s} {'delta':>9s}"]
    lines.append("  " + "-" * 50)
    for name in sorted(before):
        prior = float(before[name])
        current = float(after.get(name, prior))
        lines.append(
            f"  {name:<22s} {prior:7.1f}% {current:7.1f}% {current - prior:+8.1f}pp"
        )
    return "\n".join(lines)
