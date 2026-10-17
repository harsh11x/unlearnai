"""
Capability Fabric - Distillation with a Fidelity Gate

Fusing several modules into one dense model is where a system is most tempted
to declare success. Two trained deltas plus a base model *look* like one small
model; whether the fused artifact still does what the composite did is a
different question, and the only acceptable answer is a measurement.

``verify_fidelity`` is the gate: it compares the fused model's probe scores
against the composite's and fails loudly on any capability that regressed past
tolerance. ``distill_to_dense`` produces the artifact; it never reports success
on its own.
"""

from __future__ import annotations

import logging
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable, Optional, Sequence

from ml.policy import check_gate_tolerance

logger = logging.getLogger(__name__)

DEFAULT_TOLERANCE = 5.0


@dataclass
class FidelityRow:
    capability: str
    composite: float
    dense: float

    @property
    def delta(self) -> float:
        return round(self.dense - self.composite, 2)

    def to_dict(self) -> dict:
        return {
            "capability": self.capability,
            "composite": round(self.composite, 2),
            "dense": round(self.dense, 2),
            "delta": self.delta,
        }


@dataclass
class FidelityReport:
    rows: list[FidelityRow] = field(default_factory=list)
    tolerance: float = DEFAULT_TOLERANCE
    missing: list[str] = field(default_factory=list)
    required_missing: list[str] = field(default_factory=list)
    excluded: list[str] = field(default_factory=list)
    allow_unmeasured: list[str] = field(default_factory=list)
    regressions: list[str] = field(default_factory=list)

    @property
    def passed(self) -> bool:
        # Unmeasured capabilities are fatal by default: a fused model that was
        # never probed on a capability has not been shown to retain it.
        return not self.regressions and not self.required_missing

    def failures(self) -> list[FidelityRow]:
        limit = abs(self.tolerance)
        return [r for r in self.rows if r.delta < -limit]

    def to_dict(self) -> dict:
        return {
            "tolerance": self.tolerance,
            "passed": self.passed,
            "rows": [r.to_dict() for r in self.rows],
            "missing": list(self.missing),
            "required_missing": list(self.required_missing),
            "excluded": list(self.excluded),
            "allow_unmeasured": list(self.allow_unmeasured),
            "regressions": list(self.regressions),
        }

    def summary(self) -> str:
        head = (
            f"fidelity {'PASS' if self.passed else 'FAIL'} "
            f"(tolerance {self.tolerance:g}pp)"
        )
        lines = [head]
        for row in self.rows:
            mark = "FAIL" if row.delta < -abs(self.tolerance) else "ok"
            lines.append(
                f"  {row.capability:<22s} composite {row.composite:6.1f}%  "
                f"dense {row.dense:6.1f}%  {row.delta:+6.2f}pp  [{mark}]"
            )
        for name in self.required_missing:
            lines.append(f"  {name}: NOT MEASURED on the dense model -> cannot pass")
        if self.allow_unmeasured:
            lines.append(
                "  explicitly excluded from the gate: "
                + ", ".join(self.allow_unmeasured)
            )
        return "\n".join(lines)


def verify_fidelity(
    composite: dict[str, float],
    dense: dict[str, float],
    *,
    tolerance: float = DEFAULT_TOLERANCE,
    required: Optional[list[str]] = None,
    allow_unmeasured: Sequence[str] = (),
) -> FidelityReport:
    """
    Compare fused-model scores against the composite's.

    Two ways to fail, both of which a weaker gate would have let through:

    * a measured capability regressed by more than ``tolerance``;
    * a capability the composite had was never measured on the fused model.

    The second one matters most. An unmeasured capability is not a neutral
    unknown - it is a capability nobody has shown the fused model retains. It
    fails the gate unless the caller names it in ``allow_unmeasured``, and those
    exclusions are recorded in the report so a reader can see what was skipped.

    ``tolerance`` is bounded by :data:`ml.policy.POLICY_MAX_TOLERANCE`; widening
    it until a disappointing run passes raises ``PolicyViolation`` instead.
    """
    check_gate_tolerance(tolerance)

    allowed = [str(name) for name in allow_unmeasured]
    report = FidelityReport(tolerance=abs(float(tolerance)), allow_unmeasured=allowed)

    for capability in sorted(composite):
        if capability not in dense:
            report.missing.append(capability)
            if capability in allowed:
                report.excluded.append(capability)
            else:
                report.required_missing.append(capability)
            continue
        row = FidelityRow(
            capability=capability,
            composite=float(composite[capability]),
            dense=float(dense[capability]),
        )
        report.rows.append(row)
        if row.delta < -report.tolerance:
            report.regressions.append(capability)

    for capability in list(required or []):
        if capability in dense:
            continue
        if capability not in report.required_missing:
            report.required_missing.append(capability)
        if capability not in report.missing:
            report.missing.append(capability)

    return report


def distill_to_dense(
    *,
    teacher: Any,
    tokenizer: Any,
    student: Any,
    prompts: list[str],
    output_dir: str | os.PathLike,
    num_steps: int = 40,
    learning_rate: float = 5e-5,
    max_new_tokens: int = 96,
    max_length: int = 384,
    batch_size: int = 1,
    seed: int = 42,
    generate_fn: Optional[Callable[[Any, str], str]] = None,
    progress: Optional[Callable[[dict], None]] = None,
) -> dict:
    """
    Train ``student`` on the composed teacher's own generations.

    Sequence-level distillation: the teacher answers the prompts, the student
    learns those answers. Returns artifact info only - *not* a fidelity claim.
    The caller must run ``verify_fidelity`` on real probe scores before the
    result is treated as equivalent.

    torch is imported inside so this module stays importable without it.
    """
    import json

    import torch

    if not prompts:
        raise ValueError("distill_to_dense requires prompts")
    if teacher is None or student is None:
        raise ValueError("both teacher and student models are required")

    torch.manual_seed(seed)
    student.train()

    if getattr(tokenizer, "pad_token", None) is None:
        tokenizer.pad_token = tokenizer.eos_token
    pad_id = tokenizer.pad_token_id if tokenizer.pad_token_id is not None else 0

    def default_generate(model, prompt: str) -> str:
        inputs = tokenizer(prompt, return_tensors="pt", truncation=True, max_length=max_length)
        device = next(model.parameters()).device
        inputs = {k: v.to(device) for k, v in inputs.items()}
        with torch.no_grad():
            out = model.generate(
                **inputs,
                max_new_tokens=max_new_tokens,
                do_sample=False,
                pad_token_id=pad_id,
            )
        return tokenizer.decode(out[0][inputs["input_ids"].shape[1]:], skip_special_tokens=True)

    generate = generate_fn or default_generate

    teacher.eval()
    samples: list[tuple[str, str]] = []
    for index, prompt in enumerate(prompts):
        answer = generate(teacher, prompt)
        samples.append((prompt, answer))
        if progress:
            progress(
                {
                    "phase": "sampling",
                    "step": index + 1,
                    "total": len(prompts),
                    "progress": round((index + 1) / len(prompts) * 0.3, 4),
                }
            )

    text_pairs = [f"{prompt}\n{answer}".strip() for prompt, answer in samples]
    encoded: list[list[int]] = []
    for text in text_pairs:
        ids = tokenizer(text, truncation=True, max_length=max_length)["input_ids"]
        if ids:
            encoded.append(list(ids))
    if not encoded:
        raise ValueError("distillation produced no usable training tokens")

    params = [p for p in student.parameters() if p.requires_grad]
    optimizer = torch.optim.AdamW(params, lr=learning_rate)
    device = next(student.parameters()).device
    cursor = 0
    history: list[float] = []

    for step in range(num_steps):
        indices = [(cursor + i) % len(encoded) for i in range(max(1, batch_size))]
        cursor = (cursor + batch_size) % len(encoded)

        width = max(len(encoded[i]) for i in indices)
        rows, masks, labels = [], [], []
        for i in indices:
            ids = encoded[i][:width]
            pad = width - len(ids)
            rows.append(ids + [pad_id] * pad)
            masks.append([1] * len(ids) + [0] * pad)
            labels.append(ids + [-100] * pad)

        outputs = student(
            input_ids=torch.tensor(rows, dtype=torch.long, device=device),
            attention_mask=torch.tensor(masks, dtype=torch.long, device=device),
            labels=torch.tensor(labels, dtype=torch.long, device=device),
        )
        optimizer.zero_grad(set_to_none=True)
        outputs.loss.backward()
        torch.nn.utils.clip_grad_norm_(params, 1.0)
        optimizer.step()

        loss_value = float(outputs.loss.detach())
        history.append(loss_value)
        if progress:
            progress(
                {
                    "phase": "distilling",
                    "step": step + 1,
                    "total": num_steps,
                    "loss": round(loss_value, 5),
                    "progress": round(0.3 + (step + 1) / num_steps * 0.7, 4),
                }
            )

    student.eval()
    target = Path(output_dir)
    target.mkdir(parents=True, exist_ok=True)
    student.save_pretrained(str(target))
    tokenizer.save_pretrained(str(target))

    info = {
        "output_dir": str(target),
        "steps": num_steps,
        "samples": len(samples),
        "final_loss": round(history[-1], 5) if history else None,
        "fidelity": None,
        "note": "fidelity not measured; call verify_fidelity before claiming equivalence",
    }
    (target / "distillation.json").write_text(json.dumps(info, indent=2), encoding="utf-8")
    logger.info("distilled student written to %s (fidelity unmeasured)", target)
    return info
