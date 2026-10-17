"""
Capability Fabric - tests

These run without torch, transformers or peft on purpose. Everything that
decides *what is true* about a module - its identity, its evidence, its
interference with others, whether a fused artifact passed the gate, whether the
loop may keep a change - is plain logic, and plain logic is what gets tested.

The torch-dependent paths (training, attaching, distilling) are exercised by the
CLI on a machine that has a GPU; they are deliberately thin wrappers so that the
untested surface stays small.
"""

import json
from pathlib import Path

import pytest

import cli
from ml.capabilities import (
    PYTHON_CAPABILITY,
    RETAIN_CATEGORIES,
    capability_names,
    get_capability,
    register_capabilities,
)
from ml.composition import (
    InterferenceEntry,
    compute_interference,
    plan_attach_order,
)
from ml.distill import verify_fidelity
from ml.loop import (
    HeldOutProbes,
    ImmutableProbeViolation,
    run_loop,
    select_target,
    should_accept,
)
from ml.measure import collateral_from, delta_table
from ml.policy import (
    POLICY_MAX_COLLATERAL,
    POLICY_MAX_TOLERANCE,
    POLICY_MIN_DELTA,
    PolicyViolation,
    check_gate_tolerance,
    check_loop_thresholds,
    scan_claims,
    scan_claims_in_files,
    user_facing_surfaces,
)
from ml.modules.manifest import (
    IncompatibleBaseModel,
    ManifestCorrupt,
    ModuleManifest,
    base_identity,
)
from ml.registry import CapabilityRegistry


# ── manifest ──────────────────────────────────────────────────────────────


class TestManifest:
    def test_id_is_deterministic(self):
        kwargs = dict(
            capability="python",
            base_model="Salesforce/codegen-350M-multi",
            training={"steps": 60, "lr": 2e-4},
            lora={"r": 8},
        )
        first = ModuleManifest.create(**kwargs)
        second = ModuleManifest.create(**kwargs)
        assert first.id == second.id
        assert first.id.startswith("python-")

    def test_id_changes_with_base_model(self):
        one = ModuleManifest.create(capability="python", base_model="model-a")
        two = ModuleManifest.create(capability="python", base_model="model-b")
        assert one.id != two.id
        assert one.base_identity != two.base_identity

    def test_base_identity_ignores_case_and_space(self):
        assert base_identity(" Model-A ") == base_identity("model-a")
        assert base_identity("model-a") != base_identity("model-a/subpath")

    def test_unverified_by_default(self):
        manifest = ModuleManifest.create(capability="python", base_model="m")
        assert manifest.verified is False
        assert manifest.score_before is None
        assert manifest.delta is None

    def test_record_scores_verifies(self):
        manifest = ModuleManifest.create(capability="python", base_model="m")
        manifest.record_scores(score_before=42.0, score_after=71.5, collateral=2.5)
        assert manifest.verified is True
        assert manifest.delta == pytest.approx(29.5)
        assert manifest.verdict == "IMPROVED"

    def test_record_scores_without_both_stays_unverified(self):
        manifest = ModuleManifest.create(capability="python", base_model="m")
        manifest.record_scores(score_before=42.0, score_after=None)
        assert manifest.verified is False
        assert manifest.delta is None

    def test_save_and_load_roundtrip(self, tmp_path):
        manifest = ModuleManifest.create(
            capability="javascript",
            base_model="base",
            training={"steps": 12},
            lora={"r": 4},
        ).record_scores(score_before=10.0, score_after=55.0, collateral=1.0)

        manifest.save(tmp_path)
        loaded = ModuleManifest.load(tmp_path)

        assert loaded.id == manifest.id
        assert loaded.capability == "javascript"
        assert loaded.delta == manifest.delta
        assert loaded.content_hash() == manifest.content_hash()

    def test_load_missing_manifest_raises(self, tmp_path):
        with pytest.raises(ManifestCorrupt):
            ModuleManifest.load(tmp_path)

    def test_from_dict_rejects_missing_required(self):
        with pytest.raises(ManifestCorrupt):
            ModuleManifest.from_dict({"capability": "python"})

    def test_compatible_only_with_same_base(self):
        manifest = ModuleManifest.create(capability="python", base_model="model-a")
        manifest.require_compatible("model-a")  # does not raise
        with pytest.raises(IncompatibleBaseModel):
            manifest.require_compatible("model-b")
        assert manifest.is_compatible_with("MODEL-A")
        assert not manifest.is_compatible_with("model-b")

    def test_tokenizer_mismatch_refused(self):
        manifest = ModuleManifest.create(
            capability="python", base_model="model-a", tokenizer_identity="aaa"
        )
        with pytest.raises(IncompatibleBaseModel):
            manifest.require_compatible("model-a", tokenizer_identity_value="bbb")
        # Unknown on either side is not treated as a mismatch.
        manifest.require_compatible("model-a", tokenizer_identity_value="")


# ── registry ──────────────────────────────────────────────────────────────


def _manifest(capability="python", base="base", before=40.0, after=70.0, verified=True):
    manifest = ModuleManifest.create(
        capability=capability,
        base_model=base,
        training={"seed": 1},
        lora={"r": 8},
    )
    if verified:
        manifest.record_scores(score_before=before, score_after=after, collateral=2.0)
    return manifest


class TestRegistry:
    def test_add_and_get(self, tmp_path):
        registry = CapabilityRegistry(tmp_path)
        manifest = _manifest()
        registry.add(manifest)
        assert registry.get(manifest.id) is not None
        assert len(registry) == 1

    def test_persists_across_instances(self, tmp_path):
        first = CapabilityRegistry(tmp_path)
        manifest = _manifest()
        first.add(manifest)

        second = CapabilityRegistry(tmp_path)
        assert second.get(manifest.id) is not None
        assert second.get(manifest.id).delta == manifest.delta

    def test_duplicate_with_different_contents_refused(self, tmp_path):
        registry = CapabilityRegistry(tmp_path)
        manifest = _manifest()
        registry.add(manifest)

        conflicting = ModuleManifest.from_dict(manifest.to_dict())
        conflicting.notes = "different"
        with pytest.raises(ValueError):
            registry.add(conflicting)

        registry.add(conflicting, replace=True)
        assert registry.get(manifest.id).notes == "different"

    def test_remove(self, tmp_path):
        registry = CapabilityRegistry(tmp_path)
        manifest = _manifest()
        registry.add(manifest)
        assert registry.remove(manifest.id) is True
        assert registry.remove(manifest.id) is False
        assert len(registry) == 0

    def test_best_ignores_unverified(self, tmp_path):
        registry = CapabilityRegistry(tmp_path)
        unverified = _manifest(verified=False)
        registry.add(unverified)
        assert registry.best("python") is None
        assert len(registry.unresolved("python")) == 1

    def test_rank_prefers_measured_delta(self, tmp_path):
        registry = CapabilityRegistry(tmp_path)
        small = _manifest(before=40.0, after=45.0)
        large = ModuleManifest.create(
            capability="python", base_model="base", training={"seed": 2}, lora={"r": 8}
        ).record_scores(score_before=40.0, score_after=90.0)
        registry.add(small)
        registry.add(large)

        ranked = registry.rank("python")
        assert ranked[0].id == large.id
        assert registry.best("python").id == large.id

    def test_capabilities_listing(self, tmp_path):
        registry = CapabilityRegistry(tmp_path)
        registry.add(_manifest(capability="python"))
        registry.add(_manifest(capability="javascript"))
        assert registry.capabilities() == ["javascript", "python"]

    def test_validate_flags_missing_artifacts(self, tmp_path):
        registry = CapabilityRegistry(tmp_path)
        manifest = _manifest()
        registry.add(manifest)

        report = registry.validate()
        assert report["ok"] is False
        assert report["damaged"][0]["id"] == manifest.id

        module_dir = registry.module_dir(manifest.id)
        module_dir.mkdir(parents=True)
        manifest.save(module_dir)
        (module_dir / manifest.adapter_path).write_bytes(b"weights")
        assert registry.validate()["ok"] is True


# ── interference ──────────────────────────────────────────────────────────


class TestInterference:
    def test_measures_damage_in_both_directions(self):
        alone = {"a": {"python": 50.0}, "b": {"javascript": 80.0}}
        together = {("a", "b"): {"python": 40.0, "javascript": 70.0}}
        report = compute_interference(
            alone, together, {"a": "python", "b": "javascript"}, threshold=10.0
        )

        assert len(report.entries) == 2
        assert all(entry.interference == pytest.approx(-10.0) for entry in report.entries)
        assert report.ok() is False
        assert len(report.conflicts()) == 2

    def test_accepts_harmless_pair(self):
        alone = {"a": {"python": 50.0}, "b": {"javascript": 80.0}}
        together = {("a", "b"): {"python": 48.0, "javascript": 79.0}}
        report = compute_interference(
            alone, together, {"a": "python", "b": "javascript"}, threshold=10.0
        )
        assert report.ok() is True
        assert report.conflicts() == []

    def test_pair_key_order_does_not_matter(self):
        alone = {"a": {"python": 50.0}, "b": {"javascript": 80.0}}
        forward = compute_interference(
            alone, {("a", "b"): {"python": 45.0, "javascript": 75.0}},
            {"a": "python", "b": "javascript"},
        )
        backward = compute_interference(
            alone, {("b", "a"): {"python": 45.0, "javascript": 75.0}},
            {"a": "python", "b": "javascript"},
        )
        assert [e.interference for e in forward.entries] == [
            e.interference for e in backward.entries
        ]

    def test_missing_pair_scores_are_reported_not_guessed(self):
        alone = {"a": {"python": 50.0}, "b": {"javascript": 80.0}}
        report = compute_interference(alone, {}, {"a": "python", "b": "javascript"})
        assert report.entries == []
        assert report.missing
        assert report.ok() is False

    def test_matrix_shape(self):
        alone = {"a": {"python": 50.0}, "b": {"javascript": 80.0}}
        report = compute_interference(
            alone, {("a", "b"): {"python": 40.0, "javascript": 70.0}},
            {"a": "python", "b": "javascript"},
        )
        matrix = report.matrix()
        assert matrix["b"]["a"] == pytest.approx(-10.0)
        assert matrix["a"]["b"] == pytest.approx(-10.0)

    def test_plan_skips_conflicting_module(self):
        report = compute_interference(
            {"a": {"python": 50.0}, "b": {"javascript": 80.0}},
            {("a", "b"): {"python": 30.0, "javascript": 70.0}},
            {"a": "python", "b": "javascript"},
            threshold=10.0,
        )
        plan = plan_attach_order(["a", "b"], report)
        assert plan.accepted == ["a"]
        assert plan.skipped[0]["id"] == "b"
        assert "conflicts with a" in plan.skipped[0]["reason"]

    def test_plan_keeps_compatible_modules(self):
        report = compute_interference(
            {"a": {"python": 50.0}, "b": {"javascript": 80.0}},
            {("a", "b"): {"python": 49.0, "javascript": 79.0}},
            {"a": "python", "b": "javascript"},
        )
        plan = plan_attach_order(["a", "b"], report)
        assert plan.accepted == ["a", "b"]
        assert plan.skipped == []


# ── fidelity gate ─────────────────────────────────────────────────────────


class TestFidelityGate:
    def test_pass_within_tolerance(self):
        report = verify_fidelity(
            {"python": 50.0, "javascript": 80.0},
            {"python": 47.0, "javascript": 79.0},
            tolerance=5.0,
        )
        assert report.passed is True
        assert report.failures() == []

    def test_fail_on_regression(self):
        report = verify_fidelity(
            {"python": 50.0, "javascript": 80.0},
            {"python": 40.0, "javascript": 79.0},
            tolerance=5.0,
        )
        assert report.passed is False
        assert "python" in report.regressions

    def test_improvement_is_not_a_failure(self):
        report = verify_fidelity({"python": 50.0}, {"python": 60.0}, tolerance=5.0)
        assert report.passed is True

    def test_required_capability_missing_fails(self):
        report = verify_fidelity(
            {"python": 50.0}, {}, tolerance=5.0, required=["python"]
        )
        assert report.passed is False
        assert report.required_missing == ["python"]

    def test_unmeasured_capability_fails_by_default(self):
        # A capability nobody probed on the fused model is not "unknown, so
        # fine". The earlier behaviour passed here, which made the gate
        # satisfiable by measuring less.
        report = verify_fidelity(
            {"python": 50.0, "cpp": 70.0}, {"python": 50.0}, tolerance=5.0
        )
        assert report.passed is False
        assert report.required_missing == ["cpp"]
        assert "cpp" in report.missing

    def test_unmeasured_capability_can_be_excluded_explicitly(self):
        report = verify_fidelity(
            {"python": 50.0, "cpp": 70.0},
            {"python": 50.0},
            tolerance=5.0,
            allow_unmeasured=["cpp"],
        )
        assert report.passed is True
        assert report.excluded == ["cpp"]
        # The exclusion is recorded, so a reader can see what was skipped.
        assert report.to_dict()["allow_unmeasured"] == ["cpp"]
        assert "explicitly excluded" in report.summary()

    def test_summary_marks_failures(self):
        report = verify_fidelity({"python": 50.0}, {"python": 10.0}, tolerance=5.0)
        assert "FAIL" in report.summary()


# ── self-direction loop ───────────────────────────────────────────────────


class TestLoopPolicy:
    def test_selects_weakest(self):
        assert select_target({"python": 80.0, "javascript": 10.0}) == "javascript"

    def test_ties_break_alphabetically(self):
        assert select_target({"beta": 10.0, "alpha": 10.0}) == "alpha"

    def test_exclude_and_targets_filter(self):
        scores = {"python": 5.0, "javascript": 50.0, "cpp": 60.0}
        assert select_target(scores, exclude={"python"}) == "javascript"
        assert select_target(scores, targets={"cpp"}) == "cpp"
        assert select_target(scores, exclude=set(scores)) is None

    def test_accept_requires_improvement_and_low_collateral(self):
        assert should_accept(delta=30.0, collateral=15.0)[0] is True
        assert should_accept(delta=29.9, collateral=0.0)[0] is False
        assert should_accept(delta=50.0, collateral=15.1)[0] is False

    def test_reasons_distinguish_failure_modes(self):
        _, weak_reason = should_accept(delta=1.0, collateral=0.0)
        _, damage_reason = should_accept(delta=50.0, collateral=40.0)
        assert "below" in weak_reason
        assert "collateral" in damage_reason


class TestLoopExecution:
    def test_keeps_a_change_that_clears_the_bar(self):
        # First evaluation is the baseline; the second reflects the change.
        scores = [{"python": 40.0, "javascript": 80.0}, {"python": 75.0, "javascript": 80.0}]
        state = {"n": 0}

        def evaluate():
            value = scores[min(state["n"], len(scores) - 1)]
            state["n"] += 1
            return dict(value)

        report = run_loop(evaluate=evaluate, acquire=lambda cap: True, budget=1)

        assert len(report.steps) == 1
        step = report.steps[0]
        assert step.capability == "python"  # weakest of the two
        assert step.accepted is True
        assert step.delta == pytest.approx(35.0)
        assert report.final_scores["python"] == pytest.approx(75.0)

    def test_rejects_and_reverts_a_change_that_misses_the_bar(self):
        scores = [{"python": 40.0, "javascript": 80.0}, {"python": 41.0, "javascript": 80.0}]
        state = {"n": 0}
        reverted = []

        def evaluate():
            value = scores[min(state["n"], len(scores) - 1)]
            state["n"] += 1
            return dict(value)

        report = run_loop(
            evaluate=evaluate,
            acquire=lambda cap: True,
            revert=lambda cap: reverted.append(cap),
            budget=1,
            min_delta=30.0,
        )

        assert report.steps[0].capability == "python"
        assert report.steps[0].accepted is False
        assert reverted == ["python"]
        # A rejected change leaves the measured state untouched.
        assert report.final_scores["python"] == pytest.approx(40.0)

    def test_failed_acquisition_is_recorded_not_retried(self):
        state = {"n": 0}

        def evaluate():
            state["n"] += 1
            return {"python": 40.0, "javascript": 80.0}

        report = run_loop(evaluate=evaluate, acquire=lambda cap: False, budget=2)

        assert len(report.steps) == 2
        assert all(not step.accepted for step in report.steps)
        assert report.steps[0].capability != report.steps[1].capability
        assert "acquisition failed" in report.steps[0].reason

    def test_writes_audit_trail(self, tmp_path):
        state = {"n": 0}
        scores = [{"python": 40.0, "javascript": 80.0}, {"python": 90.0, "javascript": 80.0}]

        def evaluate():
            value = scores[min(state["n"], len(scores) - 1)]
            state["n"] += 1
            return dict(value)

        log = tmp_path / "audit.json"
        run_loop(evaluate=evaluate, acquire=lambda cap: True, budget=1, log_path=log)

        payload = json.loads(log.read_text())
        assert payload["steps"][0]["capability"] == "python"
        assert payload["steps"][0]["accepted"] is True
        assert payload["budget"] == 1

    def test_held_out_fingerprint_recorded(self, tmp_path):
        probe_file = tmp_path / "held.json"
        probe_file.write_text(json.dumps({"python": 12, "javascript": 8}))
        held = HeldOutProbes(probe_file)

        run_loop(
            evaluate=lambda: {"python": 40.0, "javascript": 80.0},
            acquire=lambda cap: False,
            budget=1,
            held_out=held,
        )
        assert held.fingerprint
        assert held.capabilities() == ["javascript", "python"]


class TestHeldOutImmutability:
    def test_detects_external_modification(self, tmp_path):
        probe_file = tmp_path / "held.json"
        probe_file.write_text('{"python": 10}')
        held = HeldOutProbes(probe_file)
        held.verify_unchanged()

        probe_file.write_text('{"python": 0}')
        with pytest.raises(ImmutableProbeViolation):
            held.verify_unchanged()

    def test_aborts_run_when_probes_change_mid_run(self, tmp_path):
        probe_file = tmp_path / "held.json"
        probe_file.write_text('{"python": 10}')
        held = HeldOutProbes(probe_file)

        def acquire(_capability):
            # The loop must not be able to move the goalposts, whether it does
            # this itself or something else edits the file underneath it.
            probe_file.write_text('{"python": 0}')
            return True

        with pytest.raises(ImmutableProbeViolation):
            run_loop(
                evaluate=lambda: {"python": 40.0, "javascript": 80.0},
                acquire=acquire,
                budget=1,
                held_out=held,
            )

    def test_missing_file_raises(self, tmp_path):
        with pytest.raises(FileNotFoundError):
            HeldOutProbes(tmp_path / "nope.json")


# ── capabilities ──────────────────────────────────────────────────────────


class TestCapabilities:
    def test_registers_python_and_retain_capabilities(self):
        specs = register_capabilities()
        assert PYTHON_CAPABILITY in specs
        for name in ("javascript", "typescript", "cpp", "general_programming"):
            assert name in specs

    def test_every_capability_has_probes_and_examples(self):
        for name, spec in register_capabilities().items():
            assert spec.probe_count > 0, name
            assert spec.examples, name
            assert spec.probe_suite_hash, name

    def test_python_protects_other_languages(self):
        spec = get_capability("python")
        assert spec.retain_examples
        assert any("JavaScript" in prompt for prompt in spec.retain_examples)

    def test_lookup_is_case_insensitive(self):
        assert get_capability("PYTHON").name == "python"

    def test_unknown_capability_lists_options(self):
        with pytest.raises(KeyError) as excinfo:
            get_capability("cobol")
        assert "available" in str(excinfo.value)

    def test_names_sorted(self):
        assert capability_names() == sorted(capability_names())

    def test_retain_categories_are_real(self):
        assert set(RETAIN_CATEGORIES).issubset(set(register_capabilities()))


# ── pure measure helpers ──────────────────────────────────────────────────


class TestMeasureHelpers:
    def test_collateral_averages_across_all_retained_capabilities(self):
        before = {"python": 50.0, "javascript": 80.0, "cpp": 60.0}
        after = {"python": 90.0, "javascript": 70.0, "cpp": 60.0}
        # javascript dropped 10, cpp dropped 0 -> average 5 across both.
        assert collateral_from(before, after, "python") == pytest.approx(5.0)

    def test_improvements_do_not_offset_damage(self):
        before = {"python": 50.0, "javascript": 80.0, "cpp": 60.0}
        after = {"python": 90.0, "javascript": 60.0, "cpp": 80.0}
        assert collateral_from(before, after, "python") == pytest.approx(10.0)

    def test_delta_table_renders_pp(self):
        table = delta_table({"python": 50.0}, {"python": 20.0})
        assert "-30.0pp" in table


# ── CLI wiring (no torch) ─────────────────────────────────────────────────


class TestCliWiring:
    def test_parser_builds_without_torch(self):
        parser = cli.build_parser()
        args = parser.parse_args(["module", "list"])
        assert args.module_command == "list"
        assert args.handler.__name__ == "module_list"

    def test_module_train_defaults(self):
        args = cli.build_parser().parse_args(["module", "train", "--capability", "javascript"])
        assert args.capability == "javascript"
        assert args.model == cli.DEFAULT_MODEL
        assert args.verify is False

    def test_module_apply_requires_id(self):
        parser = cli.build_parser()
        with pytest.raises(SystemExit):
            parser.parse_args(["module", "apply"])

    def test_existing_commands_still_parse(self):
        parser = cli.build_parser()
        run_args = parser.parse_args(["run", "--steps", "10", "--method", "retain_aware"])
        assert run_args.command == "run"
        assert run_args.steps == 10

    def test_module_list_runs_torch_free(self, tmp_path, capsys):
        code = cli.main(["module", "list", "--output-root", str(tmp_path)])
        assert code == 0
        assert "registry is empty" in capsys.readouterr().out

    def test_bare_group_returns_usage_error(self):
        # "module" with no sub-command is a usage error, reported as exit 2
        # rather than raising out of the library entry point.
        assert cli.main(["module"]) == 2


class TestCliOfflineAnalysis:
    """The gate and interference maths are auditable without torch."""

    def test_compose_reports_conflict_from_results(self, tmp_path, capsys):
        payload = {
            "alone": {"a": {"python": 50.0}, "b": {"javascript": 80.0}},
            "together": {"a+b": {"python": 30.0, "javascript": 78.0}},
            "primary": {"a": "python", "b": "javascript"},
        }
        path = tmp_path / "results.json"
        path.write_text(json.dumps(payload))

        code = cli.main(["compose", "--from-results", str(path)])
        out = capsys.readouterr().out

        assert code == 1  # a conflict is a non-zero exit, not a warning
        assert "CONFLICT" in out

    def test_fuse_gate_fails_on_regression(self, tmp_path, capsys):
        path = tmp_path / "fidelity.json"
        path.write_text(json.dumps({"composite": {"python": 50.0}, "dense": {"python": 20.0}}))

        code = cli.main(["fuse", "--from-results", str(path)])
        assert code == 1
        assert "FAIL" in capsys.readouterr().out

    def test_fuse_gate_passes_when_faithful(self, tmp_path, capsys):
        path = tmp_path / "fidelity.json"
        path.write_text(json.dumps({"composite": {"python": 50.0}, "dense": {"python": 48.0}}))

        code = cli.main(["fuse", "--from-results", str(path)])
        assert code == 0
        assert "PASS" in capsys.readouterr().out


class TestModuleApplyRefusesForeignBase:
    def test_incompatible_base_returns_2(self, tmp_path, capsys):
        registry = CapabilityRegistry(tmp_path)
        manifest = _manifest(base="model-a")
        registry.add(manifest)
        module_dir = registry.module_dir(manifest.id)
        module_dir.mkdir(parents=True)
        manifest.save(module_dir)

        code = cli.main(
            [
                "module",
                "apply",
                "--id",
                manifest.id,
                "--model",
                "completely-different-model",
                "--output-root",
                str(tmp_path),
            ]
        )
        assert code == 2
        assert "REFUSED" in capsys.readouterr().out


# ── policy: the three prohibitions, enforced ──────────────────────────────


class TestPolicyThresholds:
    """A run may fail. It may not be made to pass by relaxing the bar."""

    def test_loop_floor_rejects_weaker_bar(self):
        with pytest.raises(PolicyViolation):
            check_loop_thresholds(
                min_delta=POLICY_MIN_DELTA - 0.1, max_collateral=POLICY_MAX_COLLATERAL
            )

    def test_loop_ceiling_rejects_more_collateral(self):
        with pytest.raises(PolicyViolation):
            check_loop_thresholds(
                min_delta=POLICY_MIN_DELTA, max_collateral=POLICY_MAX_COLLATERAL + 0.1
            )

    def test_stricter_settings_are_allowed(self):
        check_loop_thresholds(min_delta=90.0, max_collateral=1.0)

    def test_gate_rejects_tolerance_wide_enough_to_hide_regression(self):
        with pytest.raises(PolicyViolation):
            check_gate_tolerance(POLICY_MAX_TOLERANCE + 1.0)

    def test_gate_accepts_default_tolerance(self):
        check_gate_tolerance(5.0)

    def test_run_loop_refuses_loosened_thresholds(self):
        with pytest.raises(PolicyViolation):
            run_loop(
                evaluate=lambda: {"python": 40.0},
                acquire=lambda capability: True,
                min_delta=1.0,
            )

    def test_verify_fidelity_refuses_wide_tolerance(self):
        with pytest.raises(PolicyViolation):
            verify_fidelity({"python": 50.0}, {"python": 50.0}, tolerance=99.0)

    def test_cli_reports_policy_refusal_as_exit_2(self, tmp_path, capsys):
        path = tmp_path / "fidelity.json"
        path.write_text(json.dumps({"composite": {"python": 50.0}, "dense": {"python": 50.0}}))
        code = cli.main(["fuse", "--from-results", str(path), "--tolerance", "80"])
        out = capsys.readouterr().out
        assert code == 2
        assert "REFUSED (policy)" in out


class TestEvidenceGrade:
    def test_self_measured_run_is_not_trustworthy(self):
        report = run_loop(
            evaluate=lambda: {"python": 40.0, "javascript": 80.0},
            acquire=lambda capability: False,
            budget=1,
        )
        assert report.evidence_grade == "self-measured"
        assert report.trustworthy is False
        assert report.to_dict()["trustworthy"] is False
        assert "trained and measured on the same suites" in report.summary()

    def test_held_out_run_is_marked_trustworthy(self, tmp_path):
        probe_file = tmp_path / "held.json"
        probe_file.write_text(json.dumps({"python": 5}))
        report = run_loop(
            evaluate=lambda: {"python": 40.0, "javascript": 80.0},
            acquire=lambda capability: False,
            budget=1,
            held_out=HeldOutProbes(probe_file),
        )
        assert report.evidence_grade == "held-out"
        assert report.trustworthy is True


class TestClaimScanning:
    """No sentience claims, no cross-architecture claims, in prose either."""

    def test_flags_sentience_claim(self):
        violations = scan_claims("The model is sentient and wants to survive.")
        assert len(violations) == 1
        assert violations[0].rule == "sentience"

    def test_allows_negated_sentience(self):
        assert scan_claims("The model is not sentient, and this system never claims so.") == []

    def test_flags_consciousness_claim(self):
        violations = scan_claims("It has gained consciousness.")
        assert violations[0].rule == "gained-consciousness"

    def test_allows_negated_consciousness(self):
        assert scan_claims("It has never gained consciousness.") == []

    def test_flags_unbounded_self_authoring(self):
        violations = scan_claims("The system provides unbounded self-improvement.")
        assert violations[0].rule == "unbounded-self-authoring"

    def test_flags_cross_architecture_claim(self):
        violations = scan_claims("We graft knowledge across model families.")
        assert violations and violations[0].rule == "cross-architecture-transfer"

    def test_allows_denial_of_cross_architecture(self):
        text = (
            "There is no mechanism here for transferring capability between "
            "architectures."
        )
        assert scan_claims(text) == []

    def test_reports_line_numbers(self):
        violations = scan_claims("fine\nfine\nIt is self-aware.\n")
        assert violations[0].line == 3

    def test_repository_prose_is_clean(self):
        root = Path(__file__).resolve().parents[1]
        surfaces = user_facing_surfaces(root)

        # The main README lives one level above the package; a claim scanner
        # that quietly skips it is not scanning the surface that matters most.
        assert any(p.name == "README.md" for p in surfaces)
        assert len({p.resolve() for p in surfaces}) == len(surfaces), "duplicate surfaces"

        scan = scan_claims_in_files(surfaces)
        assert scan.files_scanned > 0
        assert scan.ok, scan.summary()
