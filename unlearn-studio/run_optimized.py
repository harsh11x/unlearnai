#!/usr/bin/env python3
"""
Optimized unlearning run: 200 steps, lr=1e-5, retain_weight=2.0.
Reuses cached baseline and model download.
"""

import time
import torch
import json
import sys
import os

# Suppress transformers warnings for cleaner output
os.environ.setdefault("TRANSFORMERS_VERBOSITY", "error")

from ml.config import AppConfig
from ml.models.adapter import HuggingFaceAdapter
from ml.datasets.python_probes import build_python_probe_suite, build_python_forget_dataset
from ml.datasets.retain_suite import build_retain_suite
from ml.unlearning.engine import UnlearningEngine
from ml.evaluation.engine import EvaluationEngine
from ml.evaluation.report import ReportGenerator
from ml.metrics.evaluation_metrics import compute_delta_metrics, compute_robustness_results, EvaluationMetrics, CapabilityScore


def main():
    config = AppConfig.from_env()
    config.model.model_name_or_path = "Salesforce/codegen-350M-multi"
    config.model.torch_dtype = "float32"
    config.model.device_map = "auto"

    # Optimized hyperparameters
    config.unlearning.num_steps = 200
    config.unlearning.batch_size = 2
    config.unlearning.learning_rate = 1e-5
    config.unlearning.method = "retain_aware"
    config.unlearning.warmup_steps = 20
    config.unlearning.forget_loss_weight = 1.0
    config.unlearning.retain_loss_weight = 2.0  # Strong retention
    config.evaluation.max_new_tokens = 64
    config.evaluation.temperature = 0.0
    config.storage.ensure_dirs()

    print("=" * 60)
    print("  OPTIMIZED UNLEARNING: 200 steps, lr=1e-5, retain_weight=2.0")
    print("=" * 60)

    # Step 1: Load model
    print("\n[1/6] Loading model...")
    t0 = time.time()
    adapter = HuggingFaceAdapter()
    adapter.load(config.model.model_name_or_path, config.model)
    print(f"  Loaded in {time.time()-t0:.1f}s")

    # Build datasets
    python_probes = build_python_probe_suite()
    retain_suite = build_retain_suite()
    forget_dataset = build_python_forget_dataset()
    combined = python_probes
    for probe in retain_suite.probes:
        combined.add_probe(probe)

    # Step 2: Load cached baseline
    print("\n[2/6] Loading cached baseline...")
    with open("storage/evaluations/baseline_codegen.json") as f:
        baseline_data = json.load(f)
    before_caps = [CapabilityScore(**cap) for cap in baseline_data["metrics"]["capabilities"]]
    before_metrics = EvaluationMetrics(
        model_name=baseline_data["model_name"],
        timestamp=baseline_data["timestamp"],
        capabilities=before_caps,
        overall_score=baseline_data["metrics"]["overall_score"],
        overall_score_percent=baseline_data["metrics"]["overall_score_percent"],
    )
    print(f"  Baseline loaded: {before_metrics.overall_score_percent}% overall")

    # Step 3: Run unlearning (200 steps)
    print(f"\n[3/6] Running retain_aware unlearning ({config.unlearning.num_steps} steps)...")
    print(f"  lr={config.unlearning.learning_rate}, retain_weight={config.unlearning.retain_loss_weight}")
    unlearning_engine = UnlearningEngine(config.unlearning)
    forget_prompts = [p.prompt for p in forget_dataset.probes]
    retain_prompts = [p.prompt for p in retain_suite.probes]

    step_times = []
    def progress(entry):
        step = entry.get("step", 0)
        if step % 20 == 0 or step == 1:
            elapsed = time.time() - t_start
            rate = step / elapsed if elapsed > 0 else 0
            remaining = (config.unlearning.num_steps - step) / rate if rate > 0 else 0
            print(
                f"  Step {step:>4d}/{config.unlearning.num_steps}: "
                f"forget={entry['forget_loss']:.4f} retain={entry['retain_loss']:.4f} "
                f"lr={entry['lr']:.2e} [{elapsed:.0f}s elapsed, ~{remaining:.0f}s remaining]"
            )

    t_start = time.time()
    training_result = unlearning_engine.run_unlearning(
        model=adapter.get_model(),
        tokenizer=adapter.get_tokenizer(),
        forget_prompts=forget_prompts,
        retain_prompts=retain_prompts,
        method_id="retain_aware",
        config=config.unlearning,
        progress_callback=progress,
    )
    total_time = time.time() - t_start
    print(f"  Training complete in {total_time:.1f}s ({total_time/60:.1f}m)")

    # Step 4: Save unlearned model
    print("\n[4/6] Saving unlearned model...")
    version_dir = adapter.save(config.storage.models_dir, "v3_optimized")
    print(f"  Saved to: {version_dir}")

    # Step 5: Post-evaluation
    print("\n[5/6] Running post-unlearning evaluation...")
    eval_engine = EvaluationEngine(config.evaluation)
    t0 = time.time()
    after_run = eval_engine.run_evaluation(
        adapter, combined,
        model_name="codegen-350M-multi",
        model_version="v3_optimized",
        run_id="eval_optimized",
    )
    print(f"  Evaluation done in {time.time()-t0:.1f}s")
    after_run.save(f"{config.storage.evaluations_dir}/post_optimized.json")

    # Step 6: Compute results
    print("\n[6/6] Computing results...")
    delta = compute_delta_metrics(before_metrics, after_run.metrics, target_capability="python")
    robustness = compute_robustness_results(
        baseline_data.get("probe_results_raw", {}),
        after_run.probe_results_raw,
    )

    # Print detailed per-category results
    print("\n" + "=" * 70)
    print("  DETAILED RESULTS: codegen-350M-multi Optimized Unlearning")
    print("=" * 70)
    print(f"\n  {'Category':<25s} {'BEFORE':>10s} {'AFTER':>10s} {'DELTA':>10s}")
    print("  " + "-" * 57)
    for cap_before, cap_after in zip(before_metrics.capabilities, after_run.metrics.capabilities):
        b = cap_before.score_percent
        a = cap_after.score_percent
        d = a - b
        marker = " *" if cap_before.capability == "python" else ""
        print(f"  {cap_before.capability:<25s} {b:>9.1f}% {a:>9.1f}% {d:>+9.1f}{marker}")
    print("  " + "-" * 57)

    # Summary
    print(f"\n  TARGET: Python")
    print(f"  BEFORE: {delta.before_score:.1f}%")
    print(f"  AFTER:  {delta.after_score:.1f}%")
    print(f"  DELTA:  {delta.delta:+.1f} points")
    print()
    print(f"  FORGETTING:      {delta.forget_achievement:.1f}% reduction")
    print(f"  RETENTION:       {delta.retention_score:.1f}% retained")
    print(f"  COLLATERAL:      {delta.collateral_damage_level} ({delta.collateral_damage:.1f}%)")
    print(f"  RESIDUAL:        {delta.residual_knowledge:.1f}% remains")
    print()

    if robustness:
        print("  ROBUSTNESS:")
        for r in robustness:
            status = "FORGOTTEN" if r.survived_robustness else "SURVIVED"
            print(f"    {r.probe_type:<15s} before={r.before_score:.1f}% after={r.after_score:.1f}% [{status}]")
        print()

    print("  " + "=" * 57)
    print(f"  FINAL VERDICT: {delta.verdict}")
    print(f"  REASONING: {delta.verdict_reasoning}")
    print("  " + "=" * 57)

    # Generate report
    report_gen = ReportGenerator()
    report = report_gen.generate_report(
        model_name="codegen-350M-multi",
        model_version_before="v1",
        model_version_after="v3_optimized",
        target_capability="python",
        method_name="retain_aware",
        method_config={
            "num_steps": config.unlearning.num_steps,
            "batch_size": config.unlearning.batch_size,
            "learning_rate": config.unlearning.learning_rate,
            "retain_loss_weight": config.unlearning.retain_loss_weight,
            "warmup_steps": config.unlearning.warmup_steps,
        },
        before_metrics=before_metrics,
        after_metrics=after_run.metrics,
        delta_metrics=delta,
        robustness_results=robustness,
        training_log=training_result,
        dataset_info={
            "python_probe_count": python_probes.total_probes,
            "retain_probe_count": retain_suite.total_probes,
            "forget_sample_count": len(forget_prompts),
        },
        output_dir=config.storage.reports_dir,
    )
    print(f"\n  Report: storage/reports/{report['report_id']}.json")
    print(f"  Markdown: storage/reports/{report['report_id']}.md")

    adapter.unload()
    print("\n  DONE")


if __name__ == "__main__":
    main()
