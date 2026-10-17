"""
Capability Fabric - Capability definitions

One place that answers, for a capability name: which probes measure it, which
prompts train it, and which prompts must not be damaged while training it.

Everything is derived from the existing probe datasets, so a module trained
here is measured by exactly the same instrument as the CLI pipeline. Nothing in
this module needs torch.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional

from ml.datasets.python_probes import (
    ProbeSuite,
    build_python_forget_dataset,
    build_python_probe_suite,
)
from ml.datasets.retain_suite import build_retain_suite

PYTHON_CAPABILITY = "python"

# Retain categories are the "everything else" the system protects.
RETAIN_CATEGORIES = (
    "javascript",
    "typescript",
    "cpp",
    "general_programming",
    "algorithms",
)


@dataclass
class CapabilitySpec:
    """Everything the fabric needs to know about one capability."""

    name: str
    probe_suite: ProbeSuite
    examples: list[str] = field(default_factory=list)
    retain_examples: list[str] = field(default_factory=list)

    @property
    def probe_count(self) -> int:
        return self.probe_suite.total_probes

    @property
    def probe_suite_hash(self) -> str:
        return self.probe_suite.hash

    def summary(self) -> str:
        return (
            f"{self.name}: {self.probe_count} probes, "
            f"{len(self.examples)} examples, {len(self.retain_examples)} protected"
        )


def _subset(suite: ProbeSuite, category: str) -> ProbeSuite:
    """A probe suite containing only one category's probes."""
    subset = ProbeSuite(
        name=f"{suite.name} [{category}]",
        description=f"Probes for the {category} capability.",
        language=suite.language,
        version=suite.version,
    )
    for probe in suite.get_by_category(category):
        subset.add_probe(probe)
    return subset


def _examples_from(suite: ProbeSuite, category: str) -> list[str]:
    return [probe.prompt for probe in suite.get_by_category(category)]


def register_capabilities() -> dict[str, CapabilitySpec]:
    """
    Build the capability table.

    Python is the full target capability: 20 probe categories, trained on the
    dedicated forget dataset. The retain capabilities are individual categories
    of the retain suite, trained on their own prompts and protected by all the
    others.
    """
    python_suite = build_python_probe_suite()
    forget_dataset = build_python_forget_dataset()
    retain_suite = build_retain_suite()

    specs: dict[str, CapabilitySpec] = {}

    retain_prompts = [probe.prompt for probe in retain_suite.probes]
    specs[PYTHON_CAPABILITY] = CapabilitySpec(
        name=PYTHON_CAPABILITY,
        probe_suite=python_suite,
        examples=[probe.prompt for probe in forget_dataset.probes],
        retain_examples=retain_prompts,
    )

    for category in RETAIN_CATEGORIES:
        own = _examples_from(retain_suite, category)
        if not own:
            continue
        protected = [p for p in retain_prompts if p not in set(own)]
        own_suite = _subset(retain_suite, category)
        specs[category] = CapabilitySpec(
            name=category,
            probe_suite=own_suite,
            examples=own,
            retain_examples=protected,
        )

    return specs


def capability_names() -> list[str]:
    return sorted(register_capabilities())


def get_capability(name: str) -> CapabilitySpec:
    """Look up a capability, case-insensitively, with a helpful error."""
    wanted = str(name).strip().lower()
    specs = register_capabilities()
    if wanted in specs:
        return specs[wanted]
    raise KeyError(
        f"unknown capability {name!r}; available: {', '.join(sorted(specs))}"
    )


def retain_capabilities(exclude: Optional[str] = None) -> list[str]:
    """Capabilities treated as 'must not be damaged'."""
    skip = (exclude or "").strip().lower()
    return [name for name in RETAIN_CATEGORIES if name != skip]
