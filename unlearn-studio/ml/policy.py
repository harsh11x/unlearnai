"""
Capability Fabric - policy invariants

Three things this project must never do. Until now they were prose in a plan;
this module makes them checkable, and the tests make them fail in CI.

The three prohibitions
---------------------
1. **No sentience claims.** Nothing here promises or implies consciousness,
   self-awareness, or unbounded self-authoring. What the loop does is bounded
   self-improvement against a measurement it cannot edit. Those are different
   claims and conflating them is the fastest way to turn a research tool into a
   lie.

2. **No cross-architecture transfer.** A weight delta is bound to the base model
   and tokenizer it was fitted to. There is no mechanism here for moving
   capability between architectures, and a delta that loads silently into a
   different family does not do what its manifest says.

3. **No pass produced by loosening the test.** A result may fail; it may not be
   made to pass by measuring less, excluding a capability quietly, widening a
   tolerance, or lowering a threshold. The thresholds below are floors and
   ceilings, not defaults a caller may relax when a run disappoints.

Why these are enforced rather than documented
---------------------------------------------
Each one has an obvious failure mode that looks like success from the inside:

* a demo that says "it learns on its own" is one adjective away from a sentience
  claim;
* a module attached to the wrong base model still loads, and only the numbers
  would have caught it;
* a gate whose `required` list happens to be empty returns PASS, and nobody
  re-reads the arguments.

So: `verify_fidelity` fails on any unmeasured capability unless the caller names
it in `allow_unmeasured`, which is recorded in the report. `run_loop` refuses
thresholds looser than the floors. `scan_claims` exists so the prose can be
checked the same way the code is.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterable

# ── thresholds ────────────────────────────────────────────────────────────

#: A capability improvement below this is not an improvement worth keeping.
#: Floors, not defaults: a caller may be stricter, never looser.
POLICY_MIN_DELTA = 30.0

#: Damage to other capabilities above this is unacceptable regardless of gains.
POLICY_MAX_COLLATERAL = 15.0

#: How far a fused model may regress versus the composite before the gate fails.
#: A caller may tighten this; widening it past the ceiling is refused.
POLICY_MAX_TOLERANCE = 10.0


class PolicyViolation(Exception):
    """Raised when a request would loosen a guarantee the project depends on."""


def check_loop_thresholds(min_delta: float, max_collateral: float) -> None:
    """
    Refuse self-direction settings that would let the loop keep bad changes.

    Lowering ``min_delta`` or raising ``max_collateral`` makes the loop look
    successful without improving the model, which is precisely the failure this
    project exists to avoid.
    """
    if float(min_delta) < POLICY_MIN_DELTA:
        raise PolicyViolation(
            f"min_delta={min_delta:g} is below the policy floor of "
            f"{POLICY_MIN_DELTA:g}pp; a lower bar would keep changes that do not "
            f"improve the model"
        )
    if float(max_collateral) > POLICY_MAX_COLLATERAL:
        raise PolicyViolation(
            f"max_collateral={max_collateral:g} is above the policy ceiling of "
            f"{POLICY_MAX_COLLATERAL:g}pp; allowing more collateral damage would "
            f"hide the cost of an improvement"
        )


def check_gate_tolerance(tolerance: float) -> None:
    """Refuse a fidelity tolerance wide enough to hide a real regression."""
    value = float(tolerance)
    if value < 0:
        raise PolicyViolation(f"tolerance={value:g} is negative")
    if value > POLICY_MAX_TOLERANCE:
        raise PolicyViolation(
            f"tolerance={value:g}pp exceeds the policy ceiling of "
            f"{POLICY_MAX_TOLERANCE:g}pp; a wider window would let a fused model "
            f"regress past what the composite measured and still be reported as "
            f"equivalent"
        )


# ── claim scanning ────────────────────────────────────────────────────────

# (rule id, pattern, what it would wrongly assert)
BANNED_CLAIM_PATTERNS: list[tuple[str, re.Pattern, str]] = [
    (
        "sentience",
        re.compile(r"\b(?:is|are|has become|have become)\s+(?:now\s+|truly\s+)?(?:sentient|conscious|self-aware)\b", re.I),
        "claims the system is sentient or self-aware",
    ),
    (
        "gained-consciousness",
        re.compile(r"\b(?:gained|achieved|developed|attained)\s+(?:true\s+|real\s+)?(?:consciousness|sentience|self-awareness)\b", re.I),
        "claims the system gained consciousness",
    ),
    (
        "unbounded-self-authoring",
        re.compile(r"\bunbounded self-(?:authoring|rewriting|modification|improvement)\b", re.I),
        "claims unbounded self-authoring",
    ),
    (
        "cross-architecture-transfer",
        re.compile(
            r"\b(?:transfer|transfers|transferring|graft|grafts|grafting)\s+"
            r"(?:the\s+)?(?:knowledge|capability|capabilities|skill|skills)\s+"
            r"(?:across|between|into)\s+"
            r"(?:any\s+|different\s+|arbitrary\s+)?(?:architectures?|model families|models?)\b",
            re.I,
        ),
        "claims capability transfer across architectures",
    ),
]

#: Words that, shortly before a match, mean the sentence is denying the claim
#: rather than making it. Scanning for claims without this would flag the very
#: documentation that forbids them.
NEGATORS = (
    "not",
    "no",
    "never",
    "cannot",
    "can't",
    "isn't",
    "aren't",
    "doesn't",
    "don't",
    "without",
    "nor",
    "neither",
    "refuses",
    "forbidden",
    "prohibited",
)

_NEGATION_WINDOW = 90


@dataclass
class ClaimViolation:
    source: str
    line: int
    rule: str
    text: str
    explanation: str

    def __str__(self) -> str:
        return f"{self.source}:{self.line} [{self.rule}] {self.explanation}: {self.text!r}"


@dataclass
class ClaimScan:
    violations: list[ClaimViolation] = field(default_factory=list)
    files_scanned: int = 0
    lines_scanned: int = 0

    @property
    def ok(self) -> bool:
        return not self.violations

    def summary(self) -> str:
        if self.ok:
            return (
                f"no prohibited claims in {self.files_scanned} file(s) "
                f"({self.lines_scanned} lines)"
            )
        lines = [f"{len(self.violations)} prohibited claim(s):"]
        lines.extend(f"  {v}" for v in self.violations)
        return "\n".join(lines)


def _is_negated(line: str, match_start: int) -> bool:
    """True when the sentence around a match denies it rather than asserts it."""
    window = line[max(0, match_start - _NEGATION_WINDOW):match_start].lower()
    return any(negator in window for negator in NEGATORS)


def scan_claims(text: str, source: str = "<text>") -> list[ClaimViolation]:
    """
    Find sentences that assert a prohibited claim.

    Negated mentions are allowed and expected: the documentation has to be able
    to say "this does not claim consciousness" in order to rule it out.
    """
    violations: list[ClaimViolation] = []
    for number, line in enumerate(text.splitlines(), start=1):
        for rule, pattern, explanation in BANNED_CLAIM_PATTERNS:
            for match in pattern.finditer(line):
                if _is_negated(line, match.start()):
                    continue
                violations.append(
                    ClaimViolation(
                        source=source,
                        line=number,
                        rule=rule,
                        text=line.strip(),
                        explanation=explanation,
                    )
                )
    return violations


def scan_claims_in_files(paths: Iterable[str | Path]) -> ClaimScan:
    scan = ClaimScan()
    for path in paths:
        target = Path(path)
        if not target.is_file():
            continue
        try:
            text = target.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        scan.files_scanned += 1
        scan.lines_scanned += text.count("\n") + 1
        scan.violations.extend(scan_claims(text, source=str(target)))
    return scan


#: User-facing prose that must never make a prohibited claim. Deliberately
#: excludes ml/policy.py (it contains the patterns) and the tests.
def user_facing_surfaces(root: str | Path = ".") -> list[Path]:
    """
    Prose that must never make a prohibited claim.

    Looks at the given root and its immediate parent, because this repository
    keeps its main README one level above the Python package. Only one level up:
    the point is to cover this project's prose, not the filesystem above it.
    """
    # Resolve first: with a relative root, ``Path(".").parent`` is itself, which
    # silently drops the parent README and lists docs twice.
    base = Path(root).resolve()
    surfaces: list[Path] = []
    seen: set[Path] = set()

    for candidate in (base / "README.md", base.parent / "README.md"):
        if candidate.is_file():
            resolved = candidate.resolve()
            if resolved not in seen:
                seen.add(resolved)
                surfaces.append(candidate)

    for docs in (base / "docs", base.parent / "docs"):
        if not docs.is_dir():
            continue
        for path in sorted(docs.glob("*.md")):
            resolved = path.resolve()
            if resolved not in seen:
                seen.add(resolved)
                surfaces.append(path)

    return surfaces


__all__ = [
    "POLICY_MIN_DELTA",
    "POLICY_MAX_COLLATERAL",
    "POLICY_MAX_TOLERANCE",
    "PolicyViolation",
    "ClaimViolation",
    "ClaimScan",
    "BANNED_CLAIM_PATTERNS",
    "check_loop_thresholds",
    "check_gate_tolerance",
    "scan_claims",
    "scan_claims_in_files",
    "user_facing_surfaces",
]
