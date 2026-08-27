#!/usr/bin/env python3
"""
NullMind - CLI Proof of Concept

The first milestone: demonstrate the complete scientific loop.

Usage:
    python cli.py run --model <model_path> --steps <num_steps>

This runs the complete pipeline:
1. Load model
2. Run Python baseline evaluation
3. Run unlearning
4. Run post-unlearning evaluation
5. Compare before/after
6. Generate report
"""

import argparse
import json
import logging
import sys
import time
from pathlib import Path

import torch

from ml.config import AppConfig, ModelConfig, UnlearningConfig, EvaluationConfig
from ml.models.adapter import HuggingFaceAdapter, create_adapter
from ml.datasets.python_probes import build_python_probe_suite, build_python_forget_dataset
from ml.datasets.retain_suite import build_retain_suite
from ml.evaluation.engine import EvaluationEngine
from ml.evaluation.report import ReportGenerator
from ml.unlearning.engine import UnlearningEngine

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("nullmind.cli")


def print_banner():
    print("""
╔══════════════════════════════════════════════════════════╗
║                  NULLMIND                          ║
║          AI Model Unlearning Platform                    ║
║                                                          ║
║  Scientific Disclaimer:                                  ║
║  This system performs gradient-based model editing.      ║
║  Results are measured through controlled probing.        ║
║  We do not claim to inspect internal model knowledge.    ║
╚══════════════════════════════════════════════════════════╝
    """)


def print_section(title: str):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}\n")


def progress_callback(entry: dict):
    """Print training progress."""
    if entry.get("step", 0) % 10 == 0 or entry.get("step", 0) == 1:
        progress = entry.get("progress", 0) * 100
        if "forget_loss" in entry:
            print(
                f"  Step {entry['step']:>4d}: "
                f"progress={progress:>5.1f}% | "
                f"forget_loss={entry['forget_loss']:.4f} | "
                f"retain_loss={entry['retain_loss']:.4f} | "
                f"lr={entry['lr']:.2e}"
            )
        else:
            print(
                f"  Step {entry['step']:>4d}: "
                f"progress={progress:>5.1f}% | "
                f"loss={entry.get('loss', 0):.4f}"
            )


def run_pipeline(args):
    """Run the complete unlearning pipeline."""
    print_banner()

    # =========================================================================
    # Step 0: Configuration
    # =========================================================================
    print_section("STEP 0: Configuration")

    config = AppConfig.from_env()

    if args.model:
        config.model.model_name_or_path = args.model
    if args.steps:
        config.unlearning.num_steps = args.steps
    if args.method:
        config.unlearning.method = args.method
    if args.lr:
        config.unlearning.learning_rate = args.lr
    if args.batch_size:
        config.unlearning.batch_size = args.batch_size

    print(f"  Model: {config.model.model_name_or_path}")
    print(f"  Method: {config.unlearning.method}")
    print(f"  Steps: {config.unlearning.num_steps}")
    print(f"  Learning rate: {config.unlearning.learning_rate}")
    print(f"  Batch size: {config.unlearning.batch_size}")
    print(f"  Device: {'CUDA' if torch.cuda.is_available() else 'CPU'}")

    if torch.cuda.is_available():
        print(f"  GPU: {torch.cuda.get_device_name(0)}")
        gpu_mem = torch.cuda.get_device_properties(0).total_mem / (1024**3)
        print(f"  GPU Memory: {gpu_mem:.1f} GB")

    # =========================================================================
    # Step 1: Load Model
    # =========================================================================
    print_section("STEP 1: Loading Model")

    adapter = HuggingFaceAdapter()
    adapter.load(config.model.model_name_or_path, config.model)

    # Inspect model
    metadata = adapter.inspect(config.model.model_name_or_path)
    print(f"  Name: {metadata.name}")
    print(f"  Architecture: {metadata.architecture}")
    print(f"  Parameters: {metadata.parameter_count_formatted}")
    print(f"  Format: {metadata.model_format}")
    print(f"  Size: {metadata.model_size_formatted}")
    print(f"  Estimated VRAM: {metadata.estimated_vram_gb} GB")
    print(f"  Compatible: {metadata.is_compatible}")

    # =========================================================================
    # Step 2: Build Datasets
    # =========================================================================
    print_section("STEP 2: Building Datasets")

    python_probes = build_python_probe_suite()
    retain_suite = build_retain_suite()
    forget_dataset = build_python_forget_dataset()

    print(f"  Python probes: {python_probes.total_probes} probes across {len(python_probes.categories)} categories")
    print(f"  Retain probes: {retain_suite.total_probes} probes across {len(retain_suite.categories)} categories")
    print(f"  Forget dataset: {forget_dataset.total_probes} training examples")

    # Combine probe suites for evaluation
    combined_suite = python_probes
    for probe in retain_suite.probes:
        combined_suite.add_probe(probe)

    print(f"  Combined evaluation suite: {combined_suite.total_probes} probes")

    # =========================================================================
    # Step 3: Baseline Evaluation
    # =========================================================================
    print_section("STEP 3: Running Baseline Evaluation")

    eval_engine = EvaluationEngine(config.evaluation)

    before_run = eval_engine.run_evaluation(
        adapter,
        combined_suite,
        model_name=metadata.name,
        model_version="v1",
        run_id="eval_baseline",
    )

    print("\n  BASELINE RESULTS:")
    print(f"  {'Capability':<25s} {'Score':>8s} {'Probes':>8s}")
    print(f"  {'-'*43}")
    for cap in before_run.metrics.capabilities:
        print(f"  {cap.capability:<25s} {cap.score_percent:>7.1f}% {cap.probe_count:>7d}")
    print(f"  {'-'*43}")
    print(f"  {'Overall':<25s} {before_run.metrics.overall_score_percent:>7.1f}%")

    # Save baseline
    config.storage.ensure_dirs()
    before_run.save(f"{config.storage.evaluations_dir}/baseline_{before_run.run_id}.json")

    # =========================================================================
    # Step 4: Unlearning
    # =========================================================================
    print_section("STEP 4: Running Unlearning")

    unlearning_engine = UnlearningEngine(config.unlearning)

    print(f"  Method: {config.unlearning.method}")
    print(f"  Forget prompts: {len(forget_dataset.probes)}")
    print(f"  Retain prompts: {len(retain_suite.probes)}")

    # Get forget and retain prompts
    forget_prompts = [p.prompt for p in forget_dataset.probes]
    retain_prompts = [p.prompt for p in retain_suite.probes]

    training_result = unlearning_engine.run_unlearning(
        model=adapter.get_model(),
        tokenizer=adapter.get_tokenizer(),
        forget_prompts=forget_prompts,
        retain_prompts=retain_prompts,
        method_id=config.unlearning.method,
        config=config.unlearning,
        progress_callback=progress_callback,
    )

    print(f"\n  Training completed in {training_result.get('duration_seconds', 0):.1f}s")
    print(f"  Steps: {training_result.get('total_steps', 0)}")

    # =========================================================================
    # Step 5: Save Unlearned Model
    # =========================================================================
    print_section("STEP 5: Saving Unlearned Model")

    version_dir = adapter.save(config.storage.models_dir, "v2_unlearned")
    print(f"  Saved to: {version_dir}")

    # =========================================================================
    # Step 6: Post-Unlearning Evaluation
    # =========================================================================
    print_section("STEP 6: Running Post-Unlearning Evaluation")

    after_run = eval_engine.run_evaluation(
        adapter,
        combined_suite,
        model_name=metadata.name,
        model_version="v2_unlearned",
        run_id="eval_post_unlearning",
    )

    print("\n  POST-UNLEARNING RESULTS:")
    print(f"  {'Capability':<25s} {'Score':>8s} {'Probes':>8s}")
    print(f"  {'-'*43}")
    for cap in after_run.metrics.capabilities:
        print(f"  {cap.capability:<25s} {cap.score_percent:>7.1f}% {cap.probe_count:>7d}")
    print(f"  {'-'*43}")
    print(f"  {'Overall':<25s} {after_run.metrics.overall_score_percent:>7.1f}%")

    # Save evaluation
    after_run.save(f"{config.storage.evaluations_dir}/post_{after_run.run_id}.json")

    # =========================================================================
    # Step 7: Before/After Comparison
    # =========================================================================
    print_section("STEP 7: Before/After Comparison")

    from ml.metrics.evaluation_metrics import compute_delta_metrics, compute_robustness_results

    delta = compute_delta_metrics(
        before_run.metrics,
        after_run.metrics,
        target_capability="python",
    )

    robustness = compute_robustness_results(
        before_run.probe_results_raw,
        after_run.probe_results_raw,
    )

    # Pretty print comparison table
    print(f"\n  {'Capability':<25s} {'BEFORE':>10s} {'AFTER':>10s} {'DELTA':>10s}")
    print(f"  {'-'*57}")

    # Target
    print(f"  {'PYTHON (target)':<25s} {delta.before_score:>9.1f}% {delta.after_score:>9.1f}% {delta.delta:>+9.1f}")

    # Retain capabilities
    for name in ["javascript", "typescript", "cpp", "general_programming"]:
        b = delta.retain_before.get(name, 0)
        a = delta.retain_after.get(name, 0)
        d = delta.retain_delta.get(name, 0)
        print(f"  {name:<25s} {b:>9.1f}% {a:>9.1f}% {d:>+9.1f}")

    print(f"  {'-'*57}")

    # Summary
    print(f"\n  FORGETTING:     {delta.forget_achievement:.1f}% reduction in Python capability")
    print(f"  RETENTION:      {delta.retention_score:.1f}% retained non-Python capabilities")
    print(f"  COLLATERAL:     {delta.collateral_damage_level} ({delta.collateral_damage:.1f}%)")
    print(f"  RESIDUAL:       {delta.residual_knowledge:.1f}% Python knowledge remains")

    # Robustness
    print(f"\n  ROBUSTNESS:")
    for r in robustness:
        status = "FORGOTTEN" if r.survived_robustness else "SURVIVED"
        print(f"    {r.probe_type:<15s} before={r.before_score:.1f}% after={r.after_score:.1f}% delta={r.delta:+.1f}% [{status}]")

    # Verdict
    print(f"\n  {'='*57}")
    print(f"  FINAL VERDICT: {delta.verdict}")
    print(f"  REASONING: {delta.verdict_reasoning}")
    print(f"  {'='*57}")

    # =========================================================================
    # Step 8: Generate Report
    # =========================================================================
    print_section("STEP 8: Generating Report")

    report_gen = ReportGenerator()
    report = report_gen.generate_report(
        model_name=metadata.name,
        model_version_before="v1",
        model_version_after="v2_unlearned",
        target_capability="python",
        method_name=config.unlearning.method,
        method_config=training_result.get("config", {}),
        before_metrics=before_run.metrics,
        after_metrics=after_run.metrics,
        delta_metrics=delta,
        robustness_results=robustness,
        training_log=training_result,
        dataset_info={
            "python_probes_hash": python_probes.hash,
            "retain_probes_hash": retain_suite.hash,
            "forget_dataset_hash": forget_dataset.hash,
            "python_probe_count": python_probes.total_probes,
            "retain_probe_count": retain_suite.total_probes,
            "forget_sample_count": len(forget_prompts),
        },
        output_dir=config.storage.reports_dir,
    )

    print(f"  Report ID: {report['report_id']}")
    print(f"  JSON: {config.storage.reports_dir}/{report['report_id']}.json")
    print(f"  Markdown: {config.storage.reports_dir}/{report['report_id']}.md")

    # Cleanup
    adapter.unload()

    print_section("PIPELINE COMPLETE")
    print(f"  Verdict: {delta.verdict}")
    print(f"  Python: {delta.before_score}% → {delta.after_score}% ({delta.delta:+.1f}%)")
    print(f"  Collateral Damage: {delta.collateral_damage_level}")
    print()


def main():
    parser = argparse.ArgumentParser(
        description="NullMind CLI - AI Model Unlearning Platform",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Run with default model (codegen-350M-multi)
  python cli.py run

  # Run with a specific model
  python cli.py run --model /path/to/model

  # Run with custom unlearning parameters
  python cli.py run --model /path/to/model --method retain_aware --steps 200 --lr 5e-5

  # Run with gradient forgetting baseline
  python cli.py run --model /path/to/model --method gradient_forgetting --steps 100

  # Inspect a model
  python cli.py inspect --model /path/to/model
        """,
    )

    subparsers = parser.add_subparsers(dest="command", help="Command to run")

    # Run command
    run_parser = subparsers.add_parser("run", help="Run the complete unlearning pipeline")
    run_parser.add_argument("--model", type=str, default=None, help="Path to model or HuggingFace model ID")
    run_parser.add_argument("--method", type=str, default="retain_aware", choices=["gradient_forgetting", "retain_aware"],
                           help="Unlearning method (default: retain_aware)")
    run_parser.add_argument("--steps", type=int, default=None, help="Number of unlearning steps")
    run_parser.add_argument("--lr", type=float, default=None, help="Learning rate")
    run_parser.add_argument("--batch-size", type=int, default=None, help="Batch size")

    # Inspect command
    inspect_parser = subparsers.add_parser("inspect", help="Inspect a model")
    inspect_parser.add_argument("--model", type=str, required=True, help="Path to model")

    # List methods command
    subparsers.add_parser("methods", help="List available unlearning methods")

    args = parser.parse_args()

    if args.command == "run":
        run_pipeline(args)
    elif args.command == "inspect":
        adapter = HuggingFaceAdapter()
        metadata = adapter.inspect(args.model)
        print(json.dumps(metadata.to_dict(), indent=2))
    elif args.command == "methods":
        engine = UnlearningEngine()
        methods = engine.get_available_methods()
        for m in methods:
            print(f"\n  {m['name']}")
            print(f"  ID: {m['id']}")
            print(f"  {m['description']}")
            print(f"  Pros: {', '.join(m['pros'])}")
            print(f"  Cons: {', '.join(m['cons'])}")
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
