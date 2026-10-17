"""
Capability Fabric - Composition and Interference

Combining modules is the part of the fabric that can look successful and be
wrong. Two deltas can each work perfectly alone and still damage each other
when stacked, because they perturb overlapping weights. This module measures
that instead of assuming it away.

Interference definition
-----------------------
For a module ``A`` holding capability ``c``:

    interference(A | B) = score(c, A+B) - score(c, A)

Negative means adding ``B`` cost ``A`` capability. ``-threshold`` is the limit;
a pair at or below it is a conflict and composition refuses to proceed
silently.

All of this is plain arithmetic over recorded scores - no torch, no model.
The score dictionaries normally come from the existing probe pipeline.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Iterable, Optional

DEFAULT_THRESHOLD = 10.0


def _pair_key(a: str, b: str) -> tuple[str, str]:
    return (a, b) if a <= b else (b, a)


@dataclass
class InterferenceEntry:
    """How much adding ``added`` cost the capability owned by ``target``."""

    added: str
    target: str
    capability: str
    alone: float
    together: float

    @property
    def interference(self) -> float:
        return round(self.together - self.alone, 2)

    def to_dict(self) -> dict:
        return {
            "added": self.added,
            "target": self.target,
            "capability": self.capability,
            "alone": round(self.alone, 2),
            "together": round(self.together, 2),
            "interference": self.interference,
        }


@dataclass
class InterferenceReport:
    entries: list[InterferenceEntry] = field(default_factory=list)
    threshold: float = DEFAULT_THRESHOLD
    pairs: list[tuple[str, str]] = field(default_factory=list)
    missing: list[str] = field(default_factory=list)

    def conflicts(self) -> list[InterferenceEntry]:
        """Pairs whose interference meets or exceeds the damage threshold."""
        return [e for e in self.entries if e.interference <= -abs(self.threshold)]

    def ok(self) -> bool:
        return not self.conflicts() and not self.missing

    def worst(self, n: int = 5) -> list[InterferenceEntry]:
        return sorted(self.entries, key=lambda e: e.interference)[:n]

    def matrix(self) -> dict[str, dict[str, float]]:
        """added -> target -> interference, for display."""
        out: dict[str, dict[str, float]] = {}
        for entry in self.entries:
            out.setdefault(entry.added, {})[entry.target] = entry.interference
        return out

    def conflict_pairs(self) -> list[tuple[str, str]]:
        pairs = {_pair_key(e.added, e.target) for e in self.conflicts()}
        return sorted(pairs)

    def to_dict(self) -> dict:
        return {
            "threshold": self.threshold,
            "ok": self.ok(),
            "pairs": [list(p) for p in self.pairs],
            "missing": list(self.missing),
            "entries": [e.to_dict() for e in self.entries],
            "conflicts": [e.to_dict() for e in self.conflicts()],
        }

    def summary(self) -> str:
        if not self.entries and not self.missing:
            return "no module pairs to compare"
        lines = [f"interference (threshold {self.threshold:g}pp)"]
        for pair in self.pairs:
            for entry in self.entries:
                if _pair_key(entry.added, entry.target) == pair:
                    verdict = "CONFLICT" if entry.interference <= -abs(self.threshold) else "ok"
                    lines.append(
                        f"  {entry.added} -> {entry.target}: {entry.interference:+.1f}pp "
                        f"on {entry.capability} [{verdict}]"
                    )
        for missing in self.missing:
            lines.append(f"  {missing}: pair scores not measured")
        return "\n".join(lines)


def _scores_for(together: dict, a: str, b: str) -> Optional[dict]:
    for key in ((a, b), (b, a)):
        if key in together:
            return together[key]
    joined = f"{a}+{b}"
    if joined in together:
        return together[joined]
    joined_rev = f"{b}+{a}"
    if joined_rev in together:
        return together[joined_rev]
    return None


def compute_interference(
    alone: dict[str, dict[str, float]],
    together: dict,
    primary: dict[str, str],
    *,
    threshold: float = DEFAULT_THRESHOLD,
) -> InterferenceReport:
    """
    Build the interference report for every measured module pair.

    Args:
        alone: ``{module_id: {capability: score}}`` with that module attached
            on its own.
        together: ``{(a, b) or (b, a): {capability: score}}`` with both
            attached. Keys may be tuples or ``"a+b"`` strings.
        primary: ``{module_id: capability}`` - which capability each module owns.
        threshold: damage in percentage points that counts as a conflict.

    A pair with no score for the target's capability is recorded in ``missing``
    rather than guessed at.
    """
    report = InterferenceReport(threshold=threshold)
    module_ids = sorted(alone.keys())

    for i, a in enumerate(module_ids):
        for b in module_ids[i + 1:]:
            report.pairs.append((a, b))
            combined = _scores_for(together, a, b)

            for target, added in ((a, b), (b, a)):
                capability = primary.get(target)
                if capability is None:
                    report.missing.append(f"{target}: no primary capability declared")
                    continue
                target_scores = alone.get(target, {})
                if capability not in target_scores:
                    report.missing.append(f"{target}: no solo score for {capability}")
                    continue
                if combined is None or capability not in combined:
                    report.missing.append(f"{target}+{added}: no combined score for {capability}")
                    continue
                report.entries.append(
                    InterferenceEntry(
                        added=added,
                        target=target,
                        capability=capability,
                        alone=float(target_scores[capability]),
                        together=float(combined[capability]),
                    )
                )

    return report


@dataclass
class AttachPlan:
    accepted: list[str] = field(default_factory=list)
    skipped: list[dict] = field(default_factory=list)
    threshold: float = DEFAULT_THRESHOLD

    def to_dict(self) -> dict:
        return {
            "accepted": list(self.accepted),
            "skipped": list(self.skipped),
            "threshold": self.threshold,
            "ok": not self.skipped,
        }

    def summary(self) -> str:
        lines = [f"attach plan: {len(self.accepted)} accepted, {len(self.skipped)} skipped"]
        for module_id in self.accepted:
            lines.append(f"  + {module_id}")
        for item in self.skipped:
            lines.append(f"  - {item['id']}: {item['reason']}")
        return "\n".join(lines)


def plan_attach_order(
    priorities: Iterable[str],
    report: InterferenceReport,
    *,
    threshold: Optional[float] = None,
) -> AttachPlan:
    """
    Greedily choose which modules can coexist, highest priority first.

    Greedy is the right shape here: the order is a preference order supplied by
    the caller (usually measured delta), and a module that conflicts with an
    already-accepted, higher-priority module is dropped with its reason
    recorded rather than silently installed.
    """
    limit = abs(threshold if threshold is not None else report.threshold)
    conflict_map: dict[str, set[str]] = {}
    for entry in report.entries:
        if entry.interference <= -limit:
            conflict_map.setdefault(entry.added, set()).add(entry.target)
            conflict_map.setdefault(entry.target, set()).add(entry.added)

    plan = AttachPlan(threshold=limit)
    for module_id in priorities:
        clash = conflict_map.get(module_id, set()) & set(plan.accepted)
        if clash:
            plan.skipped.append(
                {
                    "id": module_id,
                    "reason": f"conflicts with {', '.join(sorted(clash))} "
                              f"(<= -{limit:g}pp interference)",
                }
            )
            continue
        plan.accepted.append(module_id)
    return plan
