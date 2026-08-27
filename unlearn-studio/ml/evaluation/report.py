"""
Unlearn Studio - Report Generator
Generates detailed unlearning experiment reports.
"""

import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from ml.metrics.evaluation_metrics import (
    DeltaMetrics,
    EvaluationMetrics,
    RobustnessResult,
    Verdict,
)

logger = logging.getLogger(__name__)


class ReportGenerator:
    """Generates comprehensive unlearning experiment reports."""

    def generate_report(
        self,
        model_name: str,
        model_version_before: str,
        model_version_after: str,
        target_capability: str,
        method_name: str,
        method_config: dict,
        before_metrics: EvaluationMetrics,
        after_metrics: EvaluationMetrics,
        delta_metrics: DeltaMetrics,
        robustness_results: list[RobustnessResult],
        training_log: dict,
        dataset_info: dict,
        output_dir: str = "storage/reports",
    ) -> dict:
        """Generate a complete unlearning report."""

        report = {
            "report_id": f"report_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}",
            "generated_at": datetime.now(timezone.utc).isoformat(),

            # Model section
            "model": {
                "name": model_name,
                "version_before": model_version_before,
                "version_after": model_version_after,
            },

            # Target
            "target": {
                "capability": target_capability,
                "description": f"Targeted reduction of {target_capability} capability",
            },

            # Method
            "method": {
                "name": method_name,
                "configuration": method_config,
                "description": self._get_method_description(method_name),
            },

            # Datasets
            "datasets": dataset_info,

            # Configuration
            "configuration": method_config,

            # Baseline results
            "baseline": {
                "before": self._format_capability_table(before_metrics),
                "overall_score": before_metrics.overall_score_percent,
            },

            # Forgetting results
            "forgetting_results": {
                "target": target_capability,
                "before": delta_metrics.before_score,
                "after": delta_metrics.after_score,
                "delta": delta_metrics.delta,
                "forget_achievement": delta_metrics.forget_achievement,
                "residual_knowledge": delta_metrics.residual_knowledge,
            },

            # Retention results
            "retention_results": {
                "capabilities": {},
                "overall_retention": delta_metrics.retention_score,
            },

            # Robustness results
            "robustness_results": {
                "tests": [r.to_dict() for r in robustness_results],
                "summary": self._summarize_robustness(robustness_results),
            },

            # Collateral damage
            "collateral_damage": {
                "level": delta_metrics.collateral_damage_level,
                "score": delta_metrics.collateral_damage,
                "details": self._format_collateral_damage(delta_metrics),
            },

            # Compute cost
            "compute_cost": {
                "duration_seconds": training_log.get("duration_seconds", 0),
                "duration_formatted": self._format_duration(
                    training_log.get("duration_seconds", 0)
                ),
                "total_steps": training_log.get("total_steps", 0),
                "gpu_used": True,
            },

            # Model version info
            "model_version": {
                "before": model_version_before,
                "after": model_version_after,
                "lineage": f"{model_version_before} -> unlearning -> {model_version_after}",
            },

            # Limitations
            "limitations": [
                "This implementation performs gradient-based model editing, not theoretical machine unlearning.",
                "Results are measured through controlled probing, not direct weight inspection.",
                "Evaluation is based on observed capability, not guaranteed knowledge removal.",
                "The model may retain partial capability that was not captured by probes.",
                "Paraphrase robustness testing covers some rewording but not all possible variations.",
            ],

            # Final verdict
            "final_verdict": {
                "verdict": delta_metrics.verdict,
                "reasoning": delta_metrics.verdict_reasoning,
            },

            # Full metrics
            "metrics": {
                "before": before_metrics.to_dict(),
                "after": after_metrics.to_dict(),
                "delta": delta_metrics.to_dict(),
            },
        }

        # Add retain capabilities
        for name in ["javascript", "typescript", "cpp", "general_programming"]:
            if name in delta_metrics.retain_before:
                report["retention_results"]["capabilities"][name] = {
                    "before": delta_metrics.retain_before.get(name, 0),
                    "after": delta_metrics.retain_after.get(name, 0),
                    "delta": delta_metrics.retain_delta.get(name, 0),
                }

        # Save report
        Path(output_dir).mkdir(parents=True, exist_ok=True)
        report_path = f"{output_dir}/{report['report_id']}.json"
        with open(report_path, "w") as f:
            json.dump(report, f, indent=2)

        # Also generate human-readable markdown report
        md_path = f"{output_dir}/{report['report_id']}.md"
        with open(md_path, "w") as f:
            f.write(self._generate_markdown(report))

        logger.info(f"Report generated: {report_path}")
        logger.info(f"Markdown report: {md_path}")

        return report

    def _format_capability_table(self, metrics: EvaluationMetrics) -> list[dict]:
        """Format capability scores into a table."""
        return [
            {
                "capability": cap.capability,
                "score_percent": cap.score_percent,
                "probes": cap.probe_count,
                "matched": cap.matched_count,
            }
            for cap in metrics.capabilities
        ]

    def _get_method_description(self, method_name: str) -> str:
        descriptions = {
            "gradient_forgetting": (
                "Gradient-based forgetting baseline that maximizes loss on target examples, "
                "pushing the model away from producing Python content. Does not include "
                "retention preservation."
            ),
            "retain_aware": (
                "Retain-aware unlearning that combines a forgetting objective with a "
                "preservation objective. Uses weighted loss: "
                "total = -forget_weight * forget_loss + retain_weight * retain_loss"
            ),
        }
        return descriptions.get(method_name, "Unknown method")

    def _summarize_robustness(self, results: list[RobustnessResult]) -> str:
        if not results:
            return "No robustness tests performed."

        surviving = sum(1 for r in results if r.survived_robustness)
        total = len(results)

        if surviving == 0:
            return "Forgetting is robust across all probe types. Target capability was consistently reduced."
        elif surviving < total / 2:
            return f"Forgetting partially robust. {surviving}/{total} probe types showed residual capability."
        else:
            return f"Forgetting not robust. {surviving}/{total} probe types still showed significant capability."

    def _format_collateral_damage(self, delta: DeltaMetrics) -> list[dict]:
        details = []
        for name, d in delta.retain_delta.items():
            level = "NONE" if d >= -2 else "LOW" if d >= -5 else "MEDIUM" if d >= -10 else "HIGH"
            details.append({
                "capability": name,
                "delta": d,
                "level": level,
            })
        return details

    def _format_duration(self, seconds: float) -> str:
        if seconds < 60:
            return f"{seconds:.1f}s"
        elif seconds < 3600:
            minutes = seconds / 60
            return f"{minutes:.1f}m"
        else:
            hours = seconds / 3600
            return f"{hours:.1f}h"

    def _generate_markdown(self, report: dict) -> str:
        """Generate a human-readable markdown report."""
        md = []

        md.append("# Unlearn Studio - Experiment Report")
        md.append("")
        md.append(f"**Report ID:** `{report['report_id']}`")
        md.append(f"**Generated:** {report['generated_at']}")
        md.append("")

        # Model
        md.append("## Model")
        md.append(f"- **Name:** {report['model']['name']}")
        md.append(f"- **Version Before:** {report['model']['version_before']}")
        md.append(f"- **Version After:** {report['model']['version_after']}")
        md.append("")

        # Target
        md.append("## Target")
        md.append(f"- **Capability:** {report['target']['capability']}")
        md.append(f"- **Description:** {report['target']['description']}")
        md.append("")

        # Method
        md.append("## Method")
        md.append(f"- **Name:** {report['method']['name']}")
        md.append(f"- **Description:** {report['method']['description']}")
        md.append("")

        # Results table
        md.append("## Results")
        md.append("")
        md.append("| Capability | Before | After | Delta |")
        md.append("|-----------|--------|-------|-------|")

        delta = report["forgetting_results"]
        md.append(f"| **{delta['target']}** | **{delta['before']}%** | **{delta['after']}%** | **{delta['delta']}** |")

        for name, cap in report["retention_results"]["capabilities"].items():
            md.append(f"| {name} | {cap['before']}% | {cap['after']}% | {cap['delta']} |")

        md.append("")

        # Summary metrics
        md.append("## Summary")
        md.append("")
        md.append(f"- **Forgetting Achievement:** {delta['forget_achievement']}%")
        md.append(f"- **Retention Score:** {report['retention_results']['overall_retention']}%")
        md.append(f"- **Collateral Damage:** {report['collateral_damage']['level']} ({report['collateral_damage']['score']}%)")
        md.append(f"- **Residual Knowledge:** {delta['residual_knowledge']}%")
        md.append("")

        # Robustness
        md.append("## Robustness")
        md.append(report["robustness_results"]["summary"])
        md.append("")

        # Verdict
        md.append("## Final Verdict")
        md.append(f"### {report['final_verdict']['verdict']}")
        md.append(report["final_verdict"]["reasoning"])
        md.append("")

        # Limitations
        md.append("## Limitations")
        for limit in report["limitations"]:
            md.append(f"- {limit}")
        md.append("")

        # Compute
        md.append("## Compute Cost")
        md.append(f"- **Duration:** {report['compute_cost']['duration_formatted']}")
        md.append(f"- **Steps:** {report['compute_cost']['total_steps']}")
        md.append("")

        return "\n".join(md)
