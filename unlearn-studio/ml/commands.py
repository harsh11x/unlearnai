"""
Capability Fabric - CLI command handlers

Every handler returns a process exit code: 0 success, 1 a failed gate or a
conflict, 2 bad input.

torch is imported inside the handlers, so the registry-only and offline-analysis
paths (``module list``, ``fuse --verify-only``, ``compose --from-results``) work
on a machine with no torch, no GPU and no downloaded weights. That is not a
convenience: it is what lets the measurements be audited anywhere.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Optional

from ml import capabilities as caps
from ml.composition import DEFAULT_THRESHOLD, compute_interference, plan_attach_order
from ml.distill import DEFAULT_TOLERANCE, verify_fidelity
from ml.loop import (
    DEFAULT_MAX_COLLATERAL,
    DEFAULT_MIN_DELTA,
    HeldOutProbes,
    run_loop,
)
from ml.measure import collateral_from, delta_table
from ml.policy import check_loop_thresholds
from ml.registry import CapabilityRegistry

logger = logging.getLogger("nullmind.fabric")


def _rule(title: str) -> None:
    print(f"\n{'=' * 62}\n  {title}\n{'=' * 62}\n")


def _progress_printer(label: str, every: int = 10):
    def printer(entry: dict) -> None:
        step = entry.get("step", 0)
        if step == 1 or step % every == 0:
            bits = [f"  {label} step {step}"]
            if "forget_loss" in entry:
                bits.append(f"forget_loss={entry['forget_loss']:.5f}")
            if "retain_loss" in entry:
                bits.append(f"retain_loss={entry['retain_loss']:.5f}")
            bits.append(f"progress={entry.get('progress', 0) * 100:.0f}%")
            print("  ".join(bits))

    return printer


def _examples(args, spec) -> list[str]:
    if getattr(args, "examples_file", None):
        text = Path(args.examples_file).read_text(encoding="utf-8").splitlines()
        examples = [line.strip() for line in text if line.strip()]
        if not examples:
            raise ValueError(f"{args.examples_file} contained no examples")
        return examples
    return list(spec.examples)


def _probe_scorer(base_model: str, target: str):
    """
    Build a scorer that measures a saved module against the base model.

    Loaded fresh from disk on purpose: it scores the artifact that will actually
    be attached later, not the in-memory training object.
    """

    def scorer(module_dir: str) -> dict:
        from ml.measure import measure_capabilities
        from ml.models.adapter import HuggingFaceAdapter
        from ml.modules.attach import attach

        adapter = HuggingFaceAdapter()
        adapter.load(base_model)
        before = measure_capabilities(adapter, model_version="before")

        adapter.model = attach(adapter.get_model(), module_dir)
        after = measure_capabilities(adapter, model_version="after")

        prior = before.get(target)
        current = after.get(target)
        return {
            "score_before": prior,
            "score_after": current,
            "collateral": collateral_from(before, after, target),
            "verdict": (
                "IMPROVED"
                if prior is not None and current is not None and current > prior
                else "NO IMPROVEMENT"
            ),
        }

    return scorer


# ── module train ──────────────────────────────────────────────────────────


def module_train(args) -> int:
    """Fit a LoRA delta for one capability and register it."""
    from ml.modules.trainer import TrainConfig, train_module

    spec = caps.get_capability(args.capability)
    registry = CapabilityRegistry(args.output_root)

    config = TrainConfig(
        capability=spec.name,
        num_steps=args.steps,
        learning_rate=args.lr,
        batch_size=args.batch_size,
        max_length=args.max_length,
        lora_r=args.lora_r,
        lora_alpha=args.lora_alpha,
        retain_weight=args.retain_weight,
    )

    _rule(f"Training module: {spec.name}")
    print(f"  {spec.summary()}")
    print(f"  base model : {args.model}")
    print(f"  steps      : {config.num_steps}  lr={config.learning_rate:g}  r={config.lora_r}")
    print(f"  retention  : weight {config.retain_weight:g} over {len(spec.retain_examples)} examples")
    if not args.verify:
        print("  measurement: DISABLED (module will be saved unverified)")

    manifest = train_module(
        base_model=args.model,
        examples=_examples(args, spec),
        config=config,
        output_root=args.output_root,
        retain_examples=spec.retain_examples,
        scorer=_probe_scorer(args.model, spec.name) if args.verify else None,
        probe_suite=spec.probe_suite.name,
        probe_suite_hash=spec.probe_suite_hash,
        progress=_progress_printer("train"),
    )

    registry.add(manifest, replace=True)

    _rule("Module registered")
    print(f"  {manifest.summary()}")
    print(f"  directory : {registry.module_dir(manifest.id)}")
    if not manifest.verified:
        print(
            "\n  NOTE: no measurement was taken, so this module is NOT evidence\n"
            "  of a capability. Re-run with --verify before relying on it."
        )
    else:
        print(f"  verdict   : {manifest.verdict}  (collateral {manifest.collateral}pp)")
    return 0


# ── module apply ──────────────────────────────────────────────────────────


def module_apply(args) -> int:
    """Attach or detach a module against a base model, measured before/after."""
    from ml.modules.manifest import IncompatibleBaseModel

    registry = CapabilityRegistry(args.output_root)
    manifest = registry.get(args.id)
    if manifest is None:
        print(f"module {args.id!r} is not registered in {args.output_root}")
        return 2

    # Refuse before loading anything: a delta from another model family will not
    # do what its manifest claims, and loading the wrong model first only makes
    # the failure slower and more confusing.
    try:
        manifest.require_compatible(args.model)
    except IncompatibleBaseModel as exc:
        print(f"\n  REFUSED: {exc}")
        print(
            "  A weight delta does not transfer across base models. This is the\n"
            "  boundary on grafting: modules attach to the model they were fitted to."
        )
        return 2

    from ml.measure import measure_capabilities
    from ml.models.adapter import HuggingFaceAdapter
    from ml.modules.attach import attach, detach

    adapter = HuggingFaceAdapter()
    adapter.load(args.model)

    _rule(f"{'Detaching' if args.detach else 'Attaching'}: {manifest.id}")
    print(f"  capability : {manifest.capability}")

    before = measure_capabilities(adapter, model_version="before")

    if args.detach:
        adapter.model = detach(adapter.get_model())
    else:
        adapter.model = attach(
            adapter.get_model(),
            str(registry.module_dir(manifest.id)),
            manifest=manifest,
        )

    after = measure_capabilities(adapter, model_version="after")

    _rule("Measured result")
    print(delta_table(before, after))
    print(
        f"\n  collateral damage: "
        f"{collateral_from(before, after, manifest.capability):.1f}pp"
    )
    return 0


# ── module list / info ────────────────────────────────────────────────────


def module_list(args) -> int:
    registry = CapabilityRegistry(args.output_root)
    _rule("Capability modules")
    print(registry.summary())
    if args.validate:
        report = registry.validate()
        print(f"\n  integrity: {'ok' if report['ok'] else 'DAMAGED'}")
        for item in report["damaged"]:
            print(f"    {item['id']}: {item['reason']}")
        return 0 if report["ok"] else 1
    return 0


def module_info(args) -> int:
    registry = CapabilityRegistry(args.output_root)
    manifest = registry.get(args.id)
    if manifest is None:
        print(f"module {args.id!r} is not registered")
        return 2
    print(json.dumps(manifest.to_dict(), indent=2, sort_keys=True))
    return 0


# ── compose ───────────────────────────────────────────────────────────────


def _measure_pairs(model_path: str, module_ids: list[str], registry: CapabilityRegistry):
    """Measure each module alone, then each pair together."""
    from ml.measure import measure_capabilities
    from ml.models.adapter import HuggingFaceAdapter
    from ml.modules.attach import attach, detach

    primary = {}
    for module_id in module_ids:
        manifest = registry.get(module_id)
        if manifest is None:
            raise ValueError(f"module {module_id!r} is not registered")
        primary[module_id] = manifest.capability

    adapter = HuggingFaceAdapter()
    adapter.load(model_path)

    alone: dict[str, dict[str, float]] = {}
    for module_id in module_ids:
        print(f"  measuring {module_id} alone ...")
        adapter.model = detach(adapter.get_model())
        adapter.model = attach(adapter.get_model(), str(registry.module_dir(module_id)))
        alone[module_id] = measure_capabilities(adapter, model_version=module_id)

    together: dict[tuple[str, str], dict[str, float]] = {}
    for i, first in enumerate(module_ids):
        for second in module_ids[i + 1:]:
            print(f"  measuring {first} + {second} ...")
            adapter.model = detach(adapter.get_model())
            adapter.model = attach(adapter.get_model(), str(registry.module_dir(first)))
            adapter.model = attach(
                adapter.get_model(),
                str(registry.module_dir(second)),
                adapter_name="second",
            )
            together[(first, second)] = measure_capabilities(
                adapter, model_version=f"{first}+{second}"
            )

    return alone, together, primary


def compose(args) -> int:
    """Measure and report interference between modules."""
    registry = CapabilityRegistry(args.output_root)

    if args.from_results:
        payload = json.loads(Path(args.from_results).read_text(encoding="utf-8"))
        alone = payload["alone"]
        primary = payload["primary"]
        raw = payload["together"]
        together = {}
        for key, value in raw.items():
            parts = key.split("+")
            together[tuple(parts) if len(parts) == 2 else key] = value
    else:
        if not args.modules:
            print("compose needs --modules (or --from-results)")
            return 2
        _rule("Measuring module combinations")
        try:
            alone, together, primary = _measure_pairs(args.model, args.modules, registry)
        except ValueError as exc:
            print(f"  {exc}")
            return 2

    report = compute_interference(
        alone, together, primary, threshold=args.threshold
    )

    _rule("Interference")
    print(report.summary())

    if args.plan:
        order = args.modules or list(primary)
        priority = sorted(
            order,
            key=lambda mid: (registry.get(mid).delta if registry.get(mid) and registry.get(mid).delta is not None else float("-inf")),
            reverse=True,
        )
        plan = plan_attach_order(priority, report, threshold=args.threshold)
        print()
        print(plan.summary())

    return 0 if report.ok() else 1


# ── fuse ──────────────────────────────────────────────────────────────────


def fuse(args) -> int:
    """Fuse a composed system into one dense model, then gate on fidelity."""
    if args.from_results:
        payload = json.loads(Path(args.from_results).read_text(encoding="utf-8"))
        report = verify_fidelity(
            payload["composite"],
            payload["dense"],
            tolerance=args.tolerance,
            required=payload.get("required") or None,
        )
        _rule("Fidelity gate")
        print(report.summary())
        return 0 if report.passed else 1

    from ml.distill import distill_to_dense
    from ml.measure import measure_capabilities
    from ml.models.adapter import HuggingFaceAdapter
    from ml.modules.attach import attach

    registry = CapabilityRegistry(args.output_root)
    if not args.modules:
        print("fuse needs --modules <id> [<id> ...] (or --from-results)")
        return 2

    required = []
    for module_id in args.modules:
        manifest = registry.get(module_id)
        if manifest is None:
            print(f"module {module_id!r} is not registered")
            return 2
        required.append(manifest.capability)

    _rule("Composing teacher")
    teacher_adapter = HuggingFaceAdapter()
    teacher_adapter.load(args.model)
    for module_id in args.modules:
        teacher_adapter.model = attach(
            teacher_adapter.get_model(), str(registry.module_dir(module_id))
        )
    composite = measure_capabilities(teacher_adapter, model_version="composite")
    print(delta_table(composite, composite))

    _rule("Distilling into dense student")
    student_adapter = HuggingFaceAdapter()
    student_adapter.load(args.student or args.model)

    prompts = _distill_prompts(args.prompts)
    info = distill_to_dense(
        teacher=teacher_adapter.get_model(),
        tokenizer=teacher_adapter.get_tokenizer(),
        student=student_adapter.get_model(),
        prompts=prompts,
        output_dir=args.out,
        num_steps=args.steps,
        max_new_tokens=args.max_new_tokens,
        progress=_progress_printer("distill", every=10),
    )
    print(f"  {info['samples']} teacher responses, final loss {info['final_loss']}")

    _rule("Measuring the fused artifact")
    dense = measure_capabilities(student_adapter, model_version="dense")

    report = verify_fidelity(composite, dense, tolerance=args.tolerance, required=required)
    print(report.summary())

    if args.results_out:
        Path(args.results_out).write_text(
            json.dumps(
                {"composite": composite, "dense": dense, "required": required},
                indent=2,
            ),
            encoding="utf-8",
        )
        print(f"\n  measurements written to {args.results_out}")

    if not report.passed:
        print(
            "\n  GATE FAILED. The fused model does not reproduce the composite's\n"
            "  measured behaviour. It is not an equivalent artifact."
        )
        return 1
    return 0


def _distill_prompts(limit: int) -> list[str]:
    from ml.datasets.python_probes import build_python_probe_suite
    from ml.datasets.retain_suite import build_retain_suite

    prompts = [p.prompt for p in build_python_probe_suite().probes]
    prompts += [p.prompt for p in build_retain_suite().probes]
    return prompts[:limit]


# ── loop ──────────────────────────────────────────────────────────────────


def loop(args) -> int:
    """Run bounded self-directed acquisition against immutable held-out probes."""
    # Checked before anything is loaded: a loosened threshold is a refusal, not
    # something to discover after downloading and loading a model.
    check_loop_thresholds(args.min_delta, args.max_collateral)

    from ml.measure import measure_capabilities
    from ml.models.adapter import HuggingFaceAdapter
    from ml.modules.attach import attach, detach
    from ml.modules.trainer import TrainConfig, train_module

    registry = CapabilityRegistry(args.output_root)
    held_out = HeldOutProbes(args.held_out) if args.held_out else None

    if held_out is None:
        print(
            "  WARNING: no --held-out probe set supplied, so the loop is measuring\n"
            "  itself on the same instruments it trains against. Results are weaker\n"
            "  evidence. Supply --held-out for a trustworthy run.\n"
        )

    adapter = HuggingFaceAdapter()
    adapter.load(args.model)
    applied: list[str] = []

    def evaluate() -> dict[str, float]:
        return measure_capabilities(adapter)

    def acquire(capability: str) -> bool:
        spec = caps.get_capability(capability)
        config = TrainConfig(
            capability=capability,
            num_steps=args.steps,
            learning_rate=args.lr,
            batch_size=args.batch_size,
            retain_weight=args.retain_weight,
        )
        print(f"  acquiring {capability}: {len(spec.examples)} examples")
        manifest = train_module(
            base_model=args.model,
            examples=spec.examples,
            config=config,
            output_root=args.output_root,
            retain_examples=spec.retain_examples,
            probe_suite=spec.probe_suite.name,
            probe_suite_hash=spec.probe_suite_hash,
            notes="created by self-direction loop",
        )
        registry.add(manifest, replace=True)
        adapter.model = attach(
            adapter.get_model(),
            str(registry.module_dir(manifest.id)),
            adapter_name=manifest.id,
        )
        applied.append(manifest.id)
        return True

    def revert(capability: str) -> None:
        for module_id in reversed(list(applied)):
            manifest = registry.get(module_id)
            if manifest is None or manifest.capability != capability:
                continue
            if len(applied) == 1:
                adapter.model = detach(adapter.get_model())
            else:
                adapter.model = detach(adapter.get_model(), adapter_name=module_id)
            applied.remove(module_id)
            return

    _rule("Self-direction loop")
    report = run_loop(
        evaluate=evaluate,
        acquire=acquire,
        revert=revert,
        budget=args.budget,
        min_delta=args.min_delta,
        max_collateral=args.max_collateral,
        held_out=held_out,
        log_path=args.log,
        progress=lambda entry: None,
    )

    _rule("Loop result")
    print(report.summary())
    if args.log:
        print(f"\n  audit trail: {args.log}")
    return 0
