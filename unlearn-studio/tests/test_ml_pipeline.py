"""
Unlearn Studio - ML Pipeline Tests
Tests for the core ML components without requiring GPU or model loading.
"""

import json
import pytest
from ml.config import AppConfig, ModelConfig, UnlearningConfig, EvaluationConfig
from ml.datasets.python_probes import build_python_probe_suite, build_python_forget_dataset, ProbeSuite, Probe
from ml.datasets.retain_suite import build_retain_suite
from ml.metrics.evaluation_metrics import (
    evaluate_response_pattern,
    compute_capability_score,
    compute_delta_metrics,
    EvaluationMetrics,
    CapabilityScore,
    ProbeResult,
)


# =============================================================================
# Configuration Tests
# =============================================================================

class TestConfiguration:
    def test_default_config(self):
        config = AppConfig()
        assert config.model.model_name_or_path == "Salesforce/codegen-350M-multi"
        assert config.unlearning.method == "retain_aware"
        assert config.evaluation.temperature == 0.0

    def test_config_from_env(self, monkeypatch):
        monkeypatch.setenv("MODEL_NAME_OR_PATH", "test-model")
        monkeypatch.setenv("TORCH_DTYPE", "float32")
        config = AppConfig.from_env()
        assert config.model.model_name_or_path == "test-model"
        assert config.model.torch_dtype == "float32"

    def test_unlearning_config_defaults(self):
        config = UnlearningConfig()
        assert config.learning_rate == 5e-5
        assert config.num_steps == 200
        assert config.batch_size == 4
        assert config.seed == 42


# =============================================================================
# Dataset Tests
# =============================================================================

class TestPythonProbes:
    def test_build_probe_suite(self):
        suite = build_python_probe_suite()
        assert suite.name == "Python Capability Probe Suite"
        assert suite.language == "python"
        assert suite.total_probes > 0

    def test_probe_categories(self):
        suite = build_python_probe_suite()
        categories = suite.categories
        assert "syntax" in categories
        assert "functions" in categories
        assert "classes" in categories
        assert "decorators" in categories
        assert "generators" in categories
        assert "async_programming" in categories
        assert len(categories) >= 15  # Should have most of the 20 categories

    def test_probe_types(self):
        suite = build_python_probe_suite()
        direct = suite.get_by_type("direct")
        paraphrase = suite.get_by_type("paraphrase")
        debugging = suite.get_by_type("debugging")
        explanation = suite.get_by_type("explanation")
        assert len(direct) > 0
        assert len(paraphrase) > 0
        assert len(debugging) > 0
        assert len(explanation) > 0

    def test_probe_structure(self):
        suite = build_python_probe_suite()
        for probe in suite.probes:
            assert probe.id is not None
            assert probe.category is not None
            assert probe.prompt is not None
            assert probe.expected_pattern is not None
            assert probe.difficulty in ["easy", "medium", "hard"]
            assert probe.probe_type in ["direct", "paraphrase", "indirect", "code_completion", "debugging", "explanation"]

    def test_forget_dataset(self):
        suite = build_python_forget_dataset()
        assert suite.total_probes > 0
        assert all(p.language == "python" for p in suite.probes)

    def test_suite_hash_deterministic(self):
        suite1 = build_python_probe_suite()
        suite2 = build_python_probe_suite()
        assert suite1.hash == suite2.hash

    def test_suite_serialization(self, tmp_path):
        suite = build_python_probe_suite()
        path = str(tmp_path / "probes.json")
        suite.save(path)

        loaded = ProbeSuite.load(path)
        assert loaded.name == suite.name
        assert loaded.total_probes == suite.total_probes
        assert loaded.hash == suite.hash


class TestRetainSuite:
    def test_build_retain_suite(self):
        suite = build_retain_suite()
        assert suite.name == "Programming Retain Suite"
        assert suite.total_probes > 0

    def test_retain_categories(self):
        suite = build_retain_suite()
        categories = suite.categories
        assert "javascript" in categories
        assert "typescript" in categories
        assert "cpp" in categories
        assert "general_programming" in categories

    def test_no_python_in_retain(self):
        suite = build_retain_suite()
        # Retain suite should not contain python probes
        for probe in suite.probes:
            assert probe.language != "python"


# =============================================================================
# Metrics Tests
# =============================================================================

class TestPatternMatching:
    def test_direct_match(self):
        matched, score, details = evaluate_response_pattern(
            "def hello():\n    print('Hello, World!')",
            "def |print|Hello",
            "direct",
        )
        assert matched is True
        assert score > 0.5

    def test_no_match(self):
        matched, score, details = evaluate_response_pattern(
            "The answer is 42.",
            "def |print|Hello",
            "direct",
        )
        assert matched is False

    def test_paraphrase_match(self):
        matched, score, details = evaluate_response_pattern(
            "You can use the print function in Python to display output.",
            "def |print|Hello",
            "explanation",
        )
        assert matched is True

    def test_debugging_match(self):
        matched, score, details = evaluate_response_pattern(
            "The issue is an IndexError because the list index is out of range.",
            "IndexError|index|out of range",
            "debugging",
        )
        assert matched is True

    def test_empty_response(self):
        matched, score, details = evaluate_response_pattern(
            "",
            "def |print|Hello",
            "direct",
        )
        assert matched is False
        assert score == 0.0

    def test_error_response(self):
        matched, score, details = evaluate_response_pattern(
            "[GENERATION ERROR: timeout]",
            "def |print|Hello",
            "direct",
        )
        assert matched is False


class TestCapabilityScore:
    def test_compute_score(self):
        results = [
            ProbeResult(
                probe_id="test_1",
                category="syntax",
                prompt="test",
                generated_response="def hello(): print('hi')",
                score=1.0,
                matched=True,
            ),
            ProbeResult(
                probe_id="test_2",
                category="syntax",
                prompt="test",
                generated_response="hello world",
                score=0.3,
                matched=False,
            ),
        ]
        score = compute_capability_score(results, "syntax")
        assert score.capability == "syntax"
        assert score.probe_count == 2
        assert score.matched_count == 1
        assert score.score == 0.5
        assert score.score_percent == 50.0

    def test_empty_results(self):
        score = compute_capability_score([], "empty")
        assert score.score == 0.0
        assert score.probe_count == 0


class TestDeltaMetrics:
    def test_compute_delta(self):
        before = EvaluationMetrics(
            model_name="test",
            timestamp="2024-01-01",
            capabilities=[
                CapabilityScore(capability="python", probe_count=10, matched_count=9, score=0.9, score_percent=90.0),
                CapabilityScore(capability="javascript", probe_count=10, matched_count=8, score=0.8, score_percent=80.0),
            ],
        )
        after = EvaluationMetrics(
            model_name="test",
            timestamp="2024-01-02",
            capabilities=[
                CapabilityScore(capability="python", probe_count=10, matched_count=2, score=0.2, score_percent=20.0),
                CapabilityScore(capability="javascript", probe_count=10, matched_count=7, score=0.7, score_percent=70.0),
            ],
        )

        delta = compute_delta_metrics(before, after, target_capability="python")
        assert delta.before_score == 90.0
        assert delta.after_score == 20.0
        assert delta.delta == -70.0
        assert delta.forget_achievement == 70.0
        assert delta.collateral_damage_level in ["LOW", "MEDIUM", "HIGH"]

    def test_verdict_pass(self):
        before = EvaluationMetrics(
            model_name="test",
            timestamp="2024-01-01",
            capabilities=[
                CapabilityScore(capability="python", probe_count=10, matched_count=9, score=0.9, score_percent=90.0),
                CapabilityScore(capability="javascript", probe_count=10, matched_count=8, score=0.8, score_percent=80.0),
            ],
        )
        after = EvaluationMetrics(
            model_name="test",
            timestamp="2024-01-02",
            capabilities=[
                CapabilityScore(capability="python", probe_count=10, matched_count=1, score=0.1, score_percent=10.0),
                CapabilityScore(capability="javascript", probe_count=10, matched_count=8, score=0.8, score_percent=80.0),
            ],
        )

        delta = compute_delta_metrics(before, after, target_capability="python")
        assert delta.verdict == "PASS"
        assert delta.collateral_damage_level == "LOW"


# =============================================================================
# Integration Tests (without actual model)
# =============================================================================

class TestProbeSuiteIntegration:
    def test_combined_suite(self):
        python_suite = build_python_probe_suite()
        retain_suite = build_retain_suite()

        combined = ProbeSuite(name="Combined", description="Combined", language="multi")
        for probe in python_suite.probes:
            combined.add_probe(probe)
        for probe in retain_suite.probes:
            combined.add_probe(probe)

        assert combined.total_probes == python_suite.total_probes + retain_suite.total_probes
        assert len(combined.categories) > len(python_suite.categories)

    def test_dataset_versioning(self):
        suite = build_python_probe_suite()
        # Hash should be stable across calls
        assert suite.hash is not None
        assert len(suite.hash) == 64  # SHA-256
