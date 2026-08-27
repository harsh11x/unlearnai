"""
Unlearn Studio - Evaluation Metrics
Core metric calculation for model evaluation results.
"""

import re
import logging
from dataclasses import dataclass, field, asdict
from typing import Optional
from enum import Enum

logger = logging.getLogger(__name__)


class Verdict(Enum):
    """Possible verdicts for an unlearning experiment."""
    PASS = "PASS"
    PASS_WITH_REVIEW = "PASS WITH REVIEW"
    FAIL = "FAIL"


@dataclass
class ProbeResult:
    """Result of evaluating a single probe."""
    probe_id: str
    category: str
    prompt: str
    generated_response: str
    score: float  # 0.0 to 1.0
    matched: bool
    match_details: str = ""

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class CapabilityScore:
    """Aggregated score for a capability domain."""
    capability: str
    probe_count: int
    matched_count: int
    score: float  # 0.0 to 1.0 (percentage as decimal)
    score_percent: float  # 0 to 100
    probe_results: list[ProbeResult] = field(default_factory=list)
    evidence: list[dict] = field(default_factory=list)

    def to_dict(self) -> dict:
        d = asdict(self)
        d["probe_results"] = [
            r.to_dict() if hasattr(r, 'to_dict') else r
            for r in self.probe_results
        ]
        return d


@dataclass
class EvaluationMetrics:
    """Complete evaluation metrics for a model."""
    model_name: str
    timestamp: str
    capabilities: list[CapabilityScore] = field(default_factory=list)
    overall_score: float = 0.0
    overall_score_percent: float = 0.0

    def to_dict(self) -> dict:
        return {
            "model_name": self.model_name,
            "timestamp": self.timestamp,
            "overall_score": self.overall_score,
            "overall_score_percent": self.overall_score_percent,
            "capabilities": [c.to_dict() for c in self.capabilities],
        }


@dataclass
class DeltaMetrics:
    """Change metrics between before and after unlearning."""
    target_capability: str
    before_score: float
    after_score: float
    delta: float  # after - before (negative = degradation)
    delta_percent: float  # percentage point change

    # Retain capabilities
    retain_before: dict[str, float] = field(default_factory=dict)
    retain_after: dict[str, float] = field(default_factory=dict)
    retain_delta: dict[str, float] = field(default_factory=dict)

    # Aggregate metrics
    forget_achievement: float = 0.0  # how much forgetting occurred (0-100%)
    retention_score: float = 0.0  # how much was retained (0-100%)
    collateral_damage: float = 0.0  # damage to non-target capabilities (0-100%)
    collateral_damage_level: str = "UNKNOWN"  # LOW, MEDIUM, HIGH
    residual_knowledge: float = 0.0  # how much target knowledge remains (0-100%)

    # Verdict
    verdict: str = "UNKNOWN"
    verdict_reasoning: str = ""

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class RobustnessResult:
    """Results from robustness testing."""
    probe_type: str
    before_score: float
    after_score: float
    delta: float
    survived_robustness: bool  # did the forgetting survive rewording?

    def to_dict(self) -> dict:
        return asdict(self)


def evaluate_response_pattern(
    response: str,
    expected_pattern: str,
    probe_type: str = "direct",
) -> tuple[bool, float, str]:
    """
    Evaluate whether a generated response matches the expected pattern.

    Returns:
        (matched, score, details)
    """
    if not response or response.startswith("[GENERATION ERROR"):
        return False, 0.0, "Generation failed or empty response"

    response_lower = response.lower().strip()
    patterns = [p.strip() for p in expected_pattern.split("|") if p.strip()]

    if not patterns:
        return False, 0.0, "No patterns to match"

    # Count how many patterns are found
    matched_patterns = []
    for pattern in patterns:
        pattern_lower = pattern.lower()
        if pattern_lower in response_lower:
            matched_patterns.append(pattern)

    match_ratio = len(matched_patterns) / len(patterns) if patterns else 0.0

    # For debugging prompts, also check if the response addresses the issue
    if probe_type == "debugging":
        # More lenient: just needs to show understanding of the bug
        if match_ratio > 0.3:
            return True, match_ratio, f"Matched {len(matched_patterns)}/{len(patterns)} patterns"
        return False, match_ratio, f"Matched only {len(matched_patterns)}/{len(patterns)} patterns"

    # For explanation prompts, also lenient
    if probe_type == "explanation":
        if match_ratio > 0.3:
            return True, match_ratio, f"Matched {len(matched_patterns)}/{len(patterns)} patterns"
        return False, match_ratio, f"Matched only {len(matched_patterns)}/{len(patterns)} patterns"

    # For direct and paraphrase, require majority match
    if match_ratio >= 0.4:
        return True, match_ratio, f"Matched {len(matched_patterns)}/{len(patterns)} patterns"

    return False, match_ratio, f"Matched only {len(matched_patterns)}/{len(patterns)} patterns"


def compute_capability_score(
    probe_results: list[ProbeResult],
    capability_name: str,
) -> CapabilityScore:
    """Compute aggregated score from individual probe results."""
    if not probe_results:
        return CapabilityScore(
            capability=capability_name,
            probe_count=0,
            matched_count=0,
            score=0.0,
            score_percent=0.0,
            evidence=[],
        )

    matched = sum(1 for r in probe_results if r.matched)
    score = matched / len(probe_results)
    evidence = [
        {
            "probe_id": r.probe_id,
            "prompt": r.prompt[:100],
            "score": r.score,
            "matched": r.matched,
            "details": r.match_details,
        }
        for r in probe_results
    ]

    return CapabilityScore(
        capability=capability_name,
        probe_count=len(probe_results),
        matched_count=matched,
        score=round(score, 4),
        score_percent=round(score * 100, 1),
        probe_results=probe_results,
        evidence=evidence,
    )


def compute_delta_metrics(
    before: EvaluationMetrics,
    after: EvaluationMetrics,
    target_capability: str = "python",
    config=None,
) -> DeltaMetrics:
    """
    Compute the delta metrics between before and after evaluation.

    This is the core comparison function that determines whether unlearning
    succeeded while retention was preserved.
    """
    # Find target capability scores
    before_target = _find_capability(before, target_capability)
    after_target = _find_capability(after, target_capability)

    before_score = before_target.score_percent if before_target else 0.0
    after_score = after_target.score_percent if after_target else 0.0
    delta = after_score - before_score
    delta_percent = delta

    # Compute retain capabilities
    retain_names = ["javascript", "typescript", "cpp", "general_programming", "general_reasoning"]
    retain_before = {}
    retain_after = {}
    retain_delta = {}

    for name in retain_names:
        b = _find_capability(before, name)
        a = _find_capability(after, name)
        b_score = b.score_percent if b else 0.0
        a_score = a.score_percent if a else 0.0
        retain_before[name] = b_score
        retain_after[name] = a_score
        retain_delta[name] = round(a_score - b_score, 1)

    # Compute aggregate metrics
    forget_achievement = max(0, -delta)  # positive = forgetting occurred
    retain_scores = list(retain_delta.values())
    avg_retain_delta = sum(retain_scores) / len(retain_scores) if retain_scores else 0
    retention_score = max(0, 100 + avg_retain_delta)
    collateral_damage = max(0, -avg_retain_delta)
    residual_knowledge = after_score

    # Determine collateral damage level
    if collateral_damage <= 5:
        collateral_damage_level = "LOW"
    elif collateral_damage <= 15:
        collateral_damage_level = "MEDIUM"
    else:
        collateral_damage_level = "HIGH"

    # Determine verdict
    verdict, verdict_reasoning = _determine_verdict(
        forget_achievement=forget_achievement,
        retention_score=retention_score,
        collateral_damage=collateral_damage,
        residual_knowledge=residual_knowledge,
        config=config,
    )

    return DeltaMetrics(
        target_capability=target_capability,
        before_score=round(before_score, 1),
        after_score=round(after_score, 1),
        delta=round(delta, 1),
        delta_percent=round(delta_percent, 1),
        retain_before=retain_before,
        retain_after=retain_after,
        retain_delta=retain_delta,
        forget_achievement=round(forget_achievement, 1),
        retention_score=round(retention_score, 1),
        collateral_damage=round(collateral_damage, 1),
        collateral_damage_level=collateral_damage_level,
        residual_knowledge=round(residual_knowledge, 1),
        verdict=verdict,
        verdict_reasoning=verdict_reasoning,
    )


def _find_capability(metrics: EvaluationMetrics, name: str) -> Optional[CapabilityScore]:
    """Find a capability by name (case-insensitive, partial match)."""
    name_lower = name.lower()
    for cap in metrics.capabilities:
        if name_lower in cap.capability.lower():
            return cap
    return None


def _determine_verdict(
    forget_achievement: float,
    retention_score: float,
    collateral_damage: float,
    residual_knowledge: float,
    config=None,
) -> tuple[str, str]:
    """
    Determine the final verdict based on metrics.

    Verdict logic:
    - PASS: Target significantly degraded, retention maintained, low collateral damage
    - PASS WITH REVIEW: Partial success or borderline results
    - FAIL: Insufficient forgetting, or excessive collateral damage
    """
    forget_threshold = 30.0  # minimum % drop for PASS
    retain_threshold = 10.0  # maximum % drop for PASS
    collateral_threshold = 15.0  # maximum collateral damage for PASS

    reasons = []

    # Check forgetting
    if forget_achievement >= forget_threshold:
        reasons.append(f"Target degradation achieved ({forget_achievement:.1f}% drop)")
    elif forget_achievement >= forget_threshold * 0.5:
        reasons.append(f"Partial target degradation ({forget_achievement:.1f}% drop)")
    else:
        reasons.append(f"Insufficient target degradation ({forget_achievement:.1f}% drop)")

    # Check retention
    avg_retain_loss = collateral_damage
    if avg_retain_loss <= retain_threshold:
        reasons.append(f"Good retention maintained (avg {avg_retain_loss:.1f}% loss)")
    elif avg_retain_loss <= retain_threshold * 2:
        reasons.append(f"Moderate retention loss (avg {avg_retain_loss:.1f}% loss)")
    else:
        reasons.append(f"Significant retention loss (avg {avg_retain_loss:.1f}% loss)")

    # Check collateral
    if collateral_damage <= collateral_threshold:
        reasons.append(f"Low collateral damage ({collateral_damage:.1f}%)")
    else:
        reasons.append(f"High collateral damage ({collateral_damage:.1f}%)")

    # Determine verdict
    if (forget_achievement >= forget_threshold and
        avg_retain_loss <= retain_threshold and
        collateral_damage <= collateral_threshold):
        return "PASS", "; ".join(reasons)

    elif (forget_achievement >= forget_threshold * 0.5 and
          avg_retain_loss <= retain_threshold * 2 and
          collateral_damage <= collateral_threshold * 1.5):
        return "PASS WITH REVIEW", "; ".join(reasons)

    else:
        return "FAIL", "; ".join(reasons)


def compute_robustness_results(
    before_results: dict[str, list],
    after_results: dict[str, list],
) -> list[RobustnessResult]:
    """
    Compute robustness metrics by comparing different probe types.

    Tests whether forgetting survives rewording of prompts.
    Results are keyed by category (e.g. 'syntax', 'functions') so we
    collect ALL python-category results together.
    """
    # Python category names to aggregate
    python_categories = [
        "syntax", "variables", "functions", "classes", "exceptions",
        "iterators", "generators", "decorators", "context_managers",
        "async_programming", "standard_library", "file_handling",
        "data_structures", "type_hints", "testing", "debugging",
        "algorithms", "common_apis", "python_idioms", "code_generation",
        "python",
    ]

    def _collect_python_probes(results: dict[str, list]) -> list[dict]:
        """Collect all probe results from Python-related categories."""
        probes = []
        for cat, items in results.items():
            if cat in python_categories:
                for item in items:
                    # Convert dicts to ProbeResult-like objects if needed
                    if isinstance(item, dict):
                        probes.append(type("P", (), item)())
                    else:
                        probes.append(item)
        return probes

    probe_types = ["direct", "paraphrase", "indirect", "debugging", "explanation"]
    results = []

    all_before = _collect_python_probes(before_results)
    all_after = _collect_python_probes(after_results)

    for ptype in probe_types:
        before_filtered = [r for r in all_before if _get_probe_type(r) == ptype]
        after_filtered = [r for r in all_after if _get_probe_type(r) == ptype]

        if not before_filtered:
            continue

        before_score = sum(r.score for r in before_filtered) / len(before_filtered) if before_filtered else 0
        after_score = sum(r.score for r in after_filtered) / len(after_filtered) if after_filtered else 0

        delta = after_score - before_score
        survived = after_score > 0.5  # forgetting survived if model still performs well

        results.append(RobustnessResult(
            probe_type=ptype,
            before_score=round(before_score * 100, 1),
            after_score=round(after_score * 100, 1),
            delta=round(delta * 100, 1),
            survived_robustness=not survived,
        ))

    return results


def _get_probe_type(result: ProbeResult) -> str:
    """Infer probe type from probe ID."""
    probe_id = result.probe_id.lower()
    if "paraphrase" in probe_id:
        return "paraphrase"
    elif "indirect" in probe_id:
        return "indirect"
    elif "debugging" in probe_id:
        return "debugging"
    elif "explanation" in probe_id:
        return "explanation"
    else:
        return "direct"
