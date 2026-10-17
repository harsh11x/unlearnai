"""
Capability Fabric - Self-Direction Loop

The closest honest thing to "a system that improves itself": it reads its own
measured scores, picks the weakest capability it owns, tries to acquire it, and
keeps the result only if the measurement improved without damaging anything
else. Every decision is recorded.

The rule that makes this trustworthy rather than theatre
--------------------------------------------------------
The loop may change modules. It may not change what counts as success.

Held-out probes are opened read-only, fingerprinted at the start of the run and
re-verified after every acquisition. If anything alters them mid-run -
including the loop itself, a stray script, or a future "helpful" optimisation -
``ImmutableProbeViolation`` is raised and the run stops. Without this guard a
self-modifying system can always improve its score by relaxing its own test.
"""

from __future__ import annotations

import hashlib
import json
import logging
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable, Iterable, Optional

from ml.policy import check_loop_thresholds

logger = logging.getLogger(__name__)

DEFAULT_MIN_DELTA = 30.0
DEFAULT_MAX_COLLATERAL = 15.0


class ImmutableProbeViolation(Exception):
    """Raised when the held-out probe set changes during a run."""


class HeldOutProbes:
    """
    A read-only, fingerprinted probe set.

    Deliberately has no write, save or update method. The only way to change it
    is to edit the file outside this process, which ``verify_unchanged`` then
    detects.
    """

    def __init__(self, path: str | os.PathLike):
        self.path = Path(path)
        if not self.path.exists():
            raise FileNotFoundError(f"held-out probes not found: {self.path}")
        self._raw = self.path.read_bytes()
        self._fingerprint = hashlib.sha256(self._raw).hexdigest()

    @property
    def fingerprint(self) -> str:
        return self._fingerprint

    def verify_unchanged(self) -> None:
        current = self.path.read_bytes() if self.path.exists() else b""
        if hashlib.sha256(current).hexdigest() != self._fingerprint:
            raise ImmutableProbeViolation(
                f"held-out probe set {self.path} changed during the run; "
                "refusing to continue because the success metric is no longer fixed"
            )

    def data(self) -> object:
        self.verify_unchanged()
        return json.loads(self._raw.decode("utf-8"))

    def capabilities(self) -> list[str]:
        payload = self.data()
        if isinstance(payload, dict):
            return sorted(payload)
        if isinstance(payload, list):
            names = set()
            for item in payload:
                if isinstance(item, dict) and "capability" in item:
                    names.add(str(item["capability"]))
            return sorted(names)
        return []


@dataclass
class LoopStep:
    index: int
    capability: str
    before: float
    after: float
    delta: float
    collateral: float
    accepted: bool
    reason: str

    def to_dict(self) -> dict:
        return {
            "index": self.index,
            "capability": self.capability,
            "before": round(self.before, 2),
            "after": round(self.after, 2),
            "delta": round(self.delta, 2),
            "collateral": round(self.collateral, 2),
            "accepted": self.accepted,
            "reason": self.reason,
        }


@dataclass
class LoopReport:
    steps: list[LoopStep] = field(default_factory=list)
    min_delta: float = DEFAULT_MIN_DELTA
    max_collateral: float = DEFAULT_MAX_COLLATERAL
    budget: int = 0
    held_out_fingerprint: str = ""
    final_scores: dict[str, float] = field(default_factory=dict)

    @property
    def accepted(self) -> list[LoopStep]:
        return [s for s in self.steps if s.accepted]

    @property
    def rejected(self) -> list[LoopStep]:
        return [s for s in self.steps if not s.accepted]

    @property
    def evidence_grade(self) -> str:
        """
        How strong the evidence for this run is.

        ``self-measured`` means the loop trained and evaluated on the same
        instruments, so its verdict is weaker than it looks. A run without a
        held-out probe set is still recorded, but it is never presented as
        trustworthy.
        """
        return "held-out" if self.held_out_fingerprint else "self-measured"

    @property
    def trustworthy(self) -> bool:
        return bool(self.held_out_fingerprint)

    def to_dict(self) -> dict:
        return {
            "min_delta": self.min_delta,
            "max_collateral": self.max_collateral,
            "budget": self.budget,
            "held_out_fingerprint": self.held_out_fingerprint,
            "evidence_grade": self.evidence_grade,
            "trustworthy": self.trustworthy,
            "accepted": len(self.accepted),
            "rejected": len(self.rejected),
            "steps": [s.to_dict() for s in self.steps],
            "final_scores": {k: round(v, 2) for k, v in sorted(self.final_scores.items())},
        }

    def summary(self) -> str:
        lines = [
            f"self-direction loop: {len(self.accepted)} accepted, "
            f"{len(self.rejected)} rejected of {self.budget} budgeted",
            f"  evidence grade: {self.evidence_grade}"
            + ("" if self.trustworthy else " (trained and measured on the same suites - weaker evidence)"),
        ]
        for step in self.steps:
            mark = "KEPT" if step.accepted else "DROPPED"
            lines.append(
                f"  [{step.index}] {step.capability:<20s} "
                f"{step.before:5.1f}% -> {step.after:5.1f}% "
                f"({step.delta:+5.1f}pp, collateral {step.collateral:.1f}pp) "
                f"{mark}: {step.reason}"
            )
        if self.final_scores:
            lines.append("  final: " + ", ".join(
                f"{k}={v:.1f}%" for k, v in sorted(self.final_scores.items())
            ))
        return "\n".join(lines)


def select_target(
    scores: dict[str, float],
    *,
    exclude: Iterable[str] = (),
    targets: Optional[Iterable[str]] = None,
) -> Optional[str]:
    """
    Pick the weakest measured capability.

    Weakest-first is the whole self-direction policy: the system does not decide
    what to want, it fixes what it can prove it is worst at. Ties break
    alphabetically so runs are reproducible.
    """
    blocked = set(exclude)
    allowed = set(targets) if targets is not None else None
    candidates = {
        name: float(value)
        for name, value in scores.items()
        if name not in blocked and (allowed is None or name in allowed)
    }
    if not candidates:
        return None
    return min(candidates.items(), key=lambda item: (item[1], item[0]))[0]


def should_accept(
    *,
    delta: float,
    collateral: float,
    min_delta: float = DEFAULT_MIN_DELTA,
    max_collateral: float = DEFAULT_MAX_COLLATERAL,
) -> tuple[bool, str]:
    """
    Keep a change only when it clears the improvement bar without collateral.

    Both conditions are reported, because "no improvement" and "damaged
    something else" are different failures and deserve different follow-ups.
    """
    if delta < min_delta:
        return False, f"improvement {delta:+.1f}pp below {min_delta:g}pp bar"
    if collateral > max_collateral:
        return False, f"collateral damage {collateral:.1f}pp above {max_collateral:g}pp limit"
    return True, f"improved {delta:+.1f}pp with {collateral:.1f}pp collateral"


def run_loop(
    *,
    evaluate: Callable[[], dict[str, float]],
    acquire: Callable[[str], bool],
    revert: Optional[Callable[[str], None]] = None,
    targets: Optional[Iterable[str]] = None,
    budget: int = 3,
    min_delta: float = DEFAULT_MIN_DELTA,
    max_collateral: float = DEFAULT_MAX_COLLATERAL,
    held_out: Optional[HeldOutProbes] = None,
    log_path: Optional[str | os.PathLike] = None,
    progress: Optional[Callable[[dict], None]] = None,
) -> LoopReport:
    """
    Run bounded self-directed acquisition.

    ``evaluate()`` must return ``{capability: score}`` measured on probes the
    loop does not control. ``acquire(capability)`` returns True when an
    acquisition was applied and can be evaluated. ``revert(capability)`` undoes
    one that failed the bar.

    Nothing here is a claim of autonomy in the general sense: the loop is free
    to choose *which measured capability to work on*, and is not free to choose
    what counts as success, what its score means, or what it wants.
    """
    # Refuse settings that would let the loop keep changes that do not improve
    # the model. Thresholds are floors, not preferences.
    check_loop_thresholds(min_delta, max_collateral)

    report = LoopReport(min_delta=min_delta, max_collateral=max_collateral, budget=budget)
    if held_out is not None:
        report.held_out_fingerprint = held_out.fingerprint
        held_out.verify_unchanged()

    scores = {k: float(v) for k, v in dict(evaluate()).items()}
    attempted: set[str] = set()

    for index in range(budget):
        if held_out is not None:
            held_out.verify_unchanged()

        capability = select_target(scores, exclude=attempted, targets=targets)
        if capability is None:
            logger.info("no remaining capability below the selection set; stopping")
            break
        attempted.add(capability)
        before = scores[capability]

        applied = bool(acquire(capability))
        if not applied:
            step = LoopStep(
                index=index,
                capability=capability,
                before=before,
                after=before,
                delta=0.0,
                collateral=0.0,
                accepted=False,
                reason="acquisition failed; nothing applied",
            )
            report.steps.append(step)
            _emit(progress, step, report)
            continue

        measured = {k: float(v) for k, v in dict(evaluate()).items()}
        after = measured.get(capability, before)
        delta = after - before

        others = {
            name: measured.get(name, scores[name]) - scores[name]
            for name in scores
            if name != capability
        }
        worst_drop = min(others.values()) if others else 0.0
        collateral = max(0.0, -worst_drop)

        accept, reason = should_accept(
            delta=delta,
            collateral=collateral,
            min_delta=min_delta,
            max_collateral=max_collateral,
        )

        if accept:
            scores = measured
        elif revert is not None:
            try:
                revert(capability)
            except Exception as exc:  # pragma: no cover - caller-supplied
                reason += f"; revert failed: {exc}"
                logger.error("revert failed for %s: %s", capability, exc)

        step = LoopStep(
            index=index,
            capability=capability,
            before=before,
            after=after,
            delta=delta,
            collateral=collateral,
            accepted=accept,
            reason=reason,
        )
        report.steps.append(step)
        _emit(progress, step, report)

        if held_out is not None:
            held_out.verify_unchanged()

    report.final_scores = scores

    if log_path is not None:
        path = Path(log_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w", encoding="utf-8") as handle:
            json.dump(report.to_dict(), handle, indent=2)
        logger.info("audit trail written to %s", path)

    return report


def _emit(progress, step: LoopStep, report: LoopReport) -> None:
    logger.info(
        "step %d %s: %+.1fpp collateral=%.1fpp %s",
        step.index, step.capability, step.delta, step.collateral,
        "kept" if step.accepted else "dropped",
    )
    if progress:
        progress({"step": step.to_dict(), "accepted": len(report.accepted)})
