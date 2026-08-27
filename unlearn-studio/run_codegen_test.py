#!/usr/bin/env python3
"""
Run the full pipeline with codegen-350M-multi, optimized for CPU execution.
"""

import time
import torch
import json
import sys

from ml.config import AppConfig, ModelConfig, UnlearningConfig, EvaluationConfig
from ml.models.adapter import HuggingFaceAdapter
from ml.datasets.python_probes import build_python_probe_suite, build_python_forget_dataset
from ml.datasets.retain_suite import build_retain_suite
from ml.evaluation.engine import EvaluationEngine
from ml.evaluation.report import ReportGenerator
from ml.unlearning.engine import UnlearningEngine

# Configure for CPU speed
config = AppConfig.from_env()
config.model.model_name_or_path = "Salesforce/codegen-350M-multi"
config.model.torch_dtype = "float32"
config.model.device_map = "auto"
config.unlearning.num_steps = 10
config.unlearning.batch_size = 2
config.unlearning.learning_rate = 5e-5
config.unlearning.method = "retain_aware"
config.unlearning.warmup_steps = 2
config.evaluation.max_new_tokens = 64  # Shorter for speed
config.evaluation.temperature = 0.0

def progress_callback(entry):
    if entry.get("step", 0) % 5 == 0 or entry.get("step", 0) == 1:
        print(
            f"  Step {entry['step']:>3d}: "
            f"forget_loss={entry['forget_loss']:.4f} | "
            f"retain_loss={entry['retain_loss']:.4f} | "
            f"lr={entry['lr']:.2e}"
        )


def main():
    print("=" * 60)
    print("  UNLEARN STUDIO — Full Pipeline with codegen-350M-multi")
    print("=" * 60)
    config.storage.ensure_dirs()

    # Step 1: Load model
    print("\n[1/8] Loading Salesforce/codegen-350M-multi...")
    t0 = time.time()
    adapter = HuggingFaceAdapter()
    adapter.load(config.model.model_name_or_path, config.model)
    metadata = adapter.inspect(config.model.model_name_or_path)
    print(f"  Loaded in {time.time()-t0:.1f}s")
    print(f"  Architecture: {metadata.architecture}, Params: {metadata.parameter_count_formatted}")
    print(f"  Format: {metadata.model_format}, VRAM est: {metadata.estimated_vram_gb} GB")

    # Step 2: Build datasets
    print("\n[2/8] Building probe suites...")
    python_probes = build_python_probe_suite()
    retain_suite = build_retain_suite()
    forget_dataset = build_python_forget_dataset()
    combined = python_probes
    for probe in retain_suite.probes:
        combined.add_probe(probe)
    print(f"  Python probes: {python_probes.total_probes}, Retain: {retain_suite.total_probes}")
    print(f"  Forget samples: {len(forget_dataset.probes)}, Combined: {combined.total_probes}")

    # Step 3: Baseline evaluation
    print("\n[3/8] Running baseline evaluation...")
    eval_engine = EvaluationEngine(config.evaluation)
    t0 = time.time()
    before_run = eval_engine.run_evaluation(
        adapter, combined, model_name=metadata.name, model_version="v1", run_id="eval_baseline_codegen"
    )
    print(f"  Baseline done in {time.time()-t0:.1f}s")
    print(f"  Overall score: {before_run.metrics.overall_score_percent:.1f}%")
    for cap in before_run.metrics.capabilities:
        if cap.score_percent > 0:
            print(f"    {cap.capability}: {cap.score_percent:.1f}% ({cap.matched_count}/{cap.probe_count})")
    before_run.save(f"{config.storage.evaluations_dir}/baseline_codegen.json")

    # Step 4: Unlearning
    print("\n[4/8] Running retain_aware unlearning (10 steps)...")
    unlearning_engine = UnlearningEngine(config.unlearning)
    forget_prompts = [p.prompt for p in forget_dataset.probes]
    retain_prompts = [p.prompt for p in retain_suite.probes]
    t0 = time.time()
    training_result = unlearning_engine.run_unlearning(
        model=adapter.get_model(),
        tokenizer=adapter.get_tokenizer(),
        forget_prompts=forget_prompts,
        retain_prompts=retain_prompts,
        method_id="retain_aware",
        config=config.unlearning,
        progress_callback=progress_callback,
    )
    print(f"  Training done in {time.time()-t0:.1f}s ({training_result['total_steps']} steps)")

    # Step 5: Save unlearned model
    print("\n[5/8] Saving unlearned model...")
    version_dir = adapter.save(config.storage.models_dir, "v2_codegen_unlearned")
    print(f"  Saved to: {version_dir}")

    # Step 6: Post-unlearning evaluation
    print("\n[6/8] Running post-unlearning evaluation...")
    t0 = time.time()
    after_run = eval_engine.run_evaluation(
        adapter, combined, model_name=metadata.name, model_version="v2_unlearned", run_id="eval_post_codegen"
    )
    print(f"  Evaluation done in {time.time()-t0:.1f}s")
    print(f"  Overall score: {after_run.metrics.overall_score_percent:.1f}%")
    for cap in after_run.metrics.capabilities:
        if cap.score_percent > 0:
            print(f"    {cap.capability}: {cap.score_percent:.1f}% ({cap.matched_count}/{cap.probe_count})")
    after_run.save(f"{config.storage.evaluations_dir}/post_codegen.json")

    # Step 7: Comparison
    print("\n[7/8] Computing before/after comparison...")
    from ml.metrics.evaluation_metrics import compute_delta_metrics, compute_robustness_results

    delta = compute_delta_metrics(before_run.metrics, after_run.metrics, target_capability="python")
    robustness = compute_robustness_results(before_run.probe_results_raw, after_run.probe_results_raw)

    print(f"\n  {'Capability':<25s} {'BEFORE':>10s} {'AFTER':>10s} {'DELTA':>10s}")
    print(f"  {'-'*57}")
    print(f"  {'PYTHON (target)':<25s} {delta.before_score:>9.1f}% {delta.after_score:>9.1f}% {delta.delta:>+9.1f}")
    for name in ["javascript", "typescript", "cpp", "general_programming"]:
        b = delta.retain_before.get(name, 0)
        a = delta.retain_after.get(name, 0)
        d = delta.retain_delta.get(name, 0)
        print(f"  {name:<25s} {b:>9.1f}% {a:>9.1f}% {d:>+9.1f}")
    print(f"  {'-'*57}")
    print(f"\n  FORGETTING: {delta.forget_achievement:.1f}% reduction")
    print(f"  RETENTION:  {delta.retention_score:.1f}% retained")
    print(f"  COLLATERAL: {delta.collateral_damage_level} ({delta.collateral_damage:.1f}%)")
    print(f"  RESIDUAL:   {delta.residual_knowledge:.1f}% remains")

    # Step 8: Report
    print("\n[8/8] Generating report...")
    report_gen = ReportGenerator()
    report = report_gen.generate_report(
        model_name=metadata.name,
        model_version_before="v1",
        model_version_after="v2_codegen_unlearned",
        target_capability="python",
        method_name="retain_aware",
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
    print(f"  Report: storage/reports/{report['report_id']}.json")
    print(f"  Markdown: storage/reports/{report['report_id']}.md")

    adapter.unload()

    print(f"\n{'='*60}")
    print(f"  FINAL VERDICT: {delta.verdict}")
    print(f"  Python: {delta.before_score:.1f}% → {delta.after_score:.1f}% ({delta.delta:+.1f})")
    print(f"  Collateral Damage: {delta.collateral_damage_level}")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
