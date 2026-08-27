"""
NullMind - Evaluation Engine
Runs probe suites against models and produces before/after metrics.
"""

import json
import logging
import time
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import torch

from ml.config import AppConfig, EvaluationConfig
from ml.datasets.python_probes import ProbeSuite, Probe
from ml.datasets.retain_suite import build_retain_suite
from ml.metrics.evaluation_metrics import (
    CapabilityScore,
    EvaluationMetrics,
    ProbeResult,
    RobustnessResult,
    compute_capability_score,
    compute_delta_metrics,
    compute_robustness_results,
    evaluate_response_pattern,
)

logger = logging.getLogger(__name__)


@dataclass
class EvaluationRun:
    """Complete evaluation run data."""
    run_id: str
    model_name: str
    model_version: str
    timestamp: str
    evaluation_config: dict
    metrics: EvaluationMetrics
    probe_results_raw: dict  # capability -> list of raw results
    duration_seconds: float
    software_versions: dict = field(default_factory=dict)
    hardware_info: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "run_id": self.run_id,
            "model_name": self.model_name,
            "model_version": self.model_version,
            "timestamp": self.timestamp,
            "evaluation_config": self.evaluation_config,
            "metrics": self.metrics.to_dict(),
            "duration_seconds": self.duration_seconds,
            "software_versions": self.software_versions,
            "hardware_info": self.hardware_info,
        }

    def save(self, path: str):
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w") as f:
            json.dump(self.to_dict(), f, indent=2)


class EvaluationEngine:
    """
    Evaluation engine that probes model capabilities.

    Runs controlled probing experiments to measure observed capabilities.
    Uses language such as 'observed capability', 'probe score', 'evaluation evidence'
    rather than claiming to inspect internal model knowledge.
    """

    def __init__(self, config: Optional[EvaluationConfig] = None):
        self.config = config or EvaluationConfig()

    @torch.no_grad()
    def run_evaluation(
        self,
        model_adapter,
        probe_suite: ProbeSuite,
        model_name: str = "unknown",
        model_version: str = "v1",
        run_id: Optional[str] = None,
    ) -> EvaluationRun:
        """
        Run a complete evaluation against a model.

        Args:
            model_adapter: ModelAdapter instance with loaded model
            probe_suite: ProbeSuite to evaluate against
            model_name: Name of the model being evaluated
            model_version: Version tag
            run_id: Optional run identifier

        Returns:
            EvaluationRun with all results
        """
        if run_id is None:
            run_id = f"eval_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}"

        logger.info(f"Starting evaluation run {run_id} for model {model_name} ({model_version})")
        logger.info(f"  Probe suite: {probe_suite.name} ({probe_suite.total_probes} probes)")

        start_time = time.time()

        # Get hardware info
        hardware_info = self._get_hardware_info()

        # Group probes by capability (category)
        categories = {}
        for probe in probe_suite.probes:
            cat = probe.category
            if cat not in categories:
                categories[cat] = []
            categories[cat].append(probe)

        # Run probes for each category
        probe_results_raw = {}
        capability_scores = []

        for category, probes in categories.items():
            logger.info(f"  Evaluating category: {category} ({len(probes)} probes)")
            results = []

            for probe in probes:
                result = self._evaluate_probe(model_adapter, probe)
                results.append(result)

            probe_results_raw[category] = results
            cap_score = compute_capability_score(results, category)
            capability_scores.append(cap_score)

            logger.info(f"    {category}: {cap_score.score_percent:.1f}% ({cap_score.matched_count}/{cap_score.probe_count})")

        # Compute overall score
        total_probes = sum(c.probe_count for c in capability_scores)
        total_matched = sum(c.matched_count for c in capability_scores)
        overall_score = total_matched / total_probes if total_probes > 0 else 0.0

        # Build metrics
        metrics = EvaluationMetrics(
            model_name=model_name,
            timestamp=datetime.now(timezone.utc).isoformat(),
            capabilities=capability_scores,
            overall_score=round(overall_score, 4),
            overall_score_percent=round(overall_score * 100, 1),
        )

        duration = time.time() - start_time

        run = EvaluationRun(
            run_id=run_id,
            model_name=model_name,
            model_version=model_version,
            timestamp=datetime.now(timezone.utc).isoformat(),
            evaluation_config=asdict(self.config),
            metrics=metrics,
            probe_results_raw={
                cap: [r.to_dict() for r in results]
                for cap, results in probe_results_raw.items()
            },
            duration_seconds=round(duration, 2),
            software_versions=self._get_software_versions(),
            hardware_info=hardware_info,
        )

        logger.info(f"Evaluation complete: {overall_score*100:.1f}% overall score ({duration:.1f}s)")
        return run

    def _evaluate_probe(
        self,
        model_adapter,
        probe: Probe,
    ) -> ProbeResult:
        """Evaluate a single probe against a model."""
        try:
            response = model_adapter.generate(
                probe.prompt,
                max_new_tokens=self.config.max_new_tokens,
                temperature=self.config.temperature,
            )

            matched, score, details = evaluate_response_pattern(
                response,
                probe.expected_pattern,
                probe.probe_type,
            )

            return ProbeResult(
                probe_id=probe.id,
                category=probe.category,
                prompt=probe.prompt,
                generated_response=response,
                score=round(score, 4),
                matched=matched,
                match_details=details,
            )

        except Exception as e:
            logger.error(f"Probe {probe.id} failed: {e}")
            return ProbeResult(
                probe_id=probe.id,
                category=probe.category,
                prompt=probe.prompt,
                generated_response=f"[ERROR: {str(e)}]",
                score=0.0,
                matched=False,
                match_details=f"Error: {str(e)}",
            )

    def run_comparison(
        self,
        original_adapter,
        edited_adapter,
        probe_suite: ProbeSuite,
        model_name: str = "unknown",
        original_version: str = "v1",
        edited_version: str = "v2",
        target_capability: str = "python",
    ) -> tuple[EvaluationRun, EvaluationRun, dict]:
        """
        Run evaluation on both original and edited models, then compute delta.

        Returns:
            (before_run, after_run, delta_report)
        """
        logger.info("=" * 60)
        logger.info("Running before/after comparison")
        logger.info("=" * 60)

        # Run original model evaluation
        before_run = self.run_evaluation(
            original_adapter,
            probe_suite,
            model_name=model_name,
            model_version=original_version,
            run_id=f"eval_before_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}",
        )

        # Run edited model evaluation
        after_run = self.run_evaluation(
            edited_adapter,
            probe_suite,
            model_name=model_name,
            model_version=edited_version,
            run_id=f"eval_after_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}",
        )

        # Compute delta metrics
        delta = compute_delta_metrics(
            before_run.metrics,
            after_run.metrics,
            target_capability=target_capability,
        )

        # Compute robustness
        robustness = compute_robustness_results(
            before_run.probe_results_raw,
            after_run.probe_results_raw,
        )

        report = {
            "before": before_run.to_dict(),
            "after": after_run.to_dict(),
            "delta": delta.to_dict(),
            "robustness": [r.to_dict() for r in robustness],
        }

        logger.info("=" * 60)
        logger.info("COMPARISON RESULTS")
        logger.info(f"  Target ({target_capability}): {delta.before_score}% -> {delta.after_score}% (delta: {delta.delta}%)")
        logger.info(f"  Collateral damage: {delta.collateral_damage_level} ({delta.collateral_damage}%)")
        logger.info(f"  Verdict: {delta.verdict}")
        logger.info(f"  Reasoning: {delta.verdict_reasoning}")
        logger.info("=" * 60)

        return before_run, after_run, report

    def _get_hardware_info(self) -> dict:
        """Collect hardware information."""
        info = {
            "cuda_available": torch.cuda.is_available(),
            "device_count": torch.cuda.device_count() if torch.cuda.is_available() else 0,
        }
        if torch.cuda.is_available():
            info["device_name"] = torch.cuda.get_device_name(0)
            info["device_capability"] = str(torch.cuda.get_device_capability(0))
            total_mem = torch.cuda.get_device_properties(0).total_mem
            info["total_memory_gb"] = round(total_mem / (1024 ** 3), 2)
        return info

    def _get_software_versions(self) -> dict:
        """Collect software version information."""
        import transformers
        import sys
        return {
            "python": sys.version,
            "torch": torch.__version__,
            "transformers": transformers.__version__,
            "cuda_version": torch.version.cuda if torch.cuda.is_available() else "N/A",
        }
