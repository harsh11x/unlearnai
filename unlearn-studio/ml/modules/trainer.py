"""
Capability Fabric - Module Trainer

Trains a capability module as a LoRA delta against a fixed base model.

This is the acquisition half of the fabric: the same code path *adds* a
capability (relearn / acquire) and *repairs* one (heal), because both are just
"fit a small delta on these examples while holding a weighted retention term".

torch, transformers and peft are imported inside the functions, so importing
this module - and therefore listing or inspecting modules - works on a machine
with none of them installed.

Nothing here claims a capability. It produces a delta and, if a scorer is
supplied, records the measured before/after scores in the manifest. With no
scorer the manifest stays ``verified = False``.
"""

from __future__ import annotations

import logging
import os
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Any, Callable, Optional

from ml.modules.manifest import ADAPTER_WEIGHTS, ModuleManifest, tokenizer_identity

logger = logging.getLogger(__name__)

# Linear-layer suffixes used by the causal-LM families the adapter supports.
# Anything unrecognised falls back to every linear suffix the model actually has.
COMMON_TARGET_SUFFIXES = (
    "q_proj", "k_proj", "v_proj", "o_proj",
    "c_attn", "c_proj", "c_fc",
    "query_key_value", "dense", "dense_h_to_4h", "dense_4h_to_h",
    "fc1", "fc2", "Wqkv", "out_proj",
)


@dataclass
class TrainConfig:
    """Hyperparameters for one module."""

    capability: str
    num_steps: int = 60
    learning_rate: float = 2e-4
    batch_size: int = 2
    max_length: int = 256
    seed: int = 42

    lora_r: int = 8
    lora_alpha: int = 16
    lora_dropout: float = 0.05
    target_modules: Optional[list[str]] = None

    gradient_accumulation: int = 1
    max_grad_norm: float = 1.0
    weight_decay: float = 0.0

    # Retention term. Used when relearning/healing: examples to protect.
    retain_weight: float = 1.0

    torch_dtype: str = "float32"
    device: Optional[str] = None

    def to_dict(self) -> dict:
        return asdict(self)


def _resolve_target_modules(model, requested: Optional[list[str]]) -> list[str]:
    """Pick LoRA target suffixes that actually exist in this model."""
    if requested:
        return list(requested)

    # Only names the model really has may be targeted; a suffix that does not
    # exist silently produces zero adapters, which looks like a successful run.

    import torch

    present: list[str] = []
    for name, module in model.named_modules():
        if isinstance(module, torch.nn.Linear):
            suffix = name.split(".")[-1]
            if suffix not in present:
                present.append(suffix)

    common = [s for s in COMMON_TARGET_SUFFIXES if s in present]
    if common:
        return common
    if not present:
        raise ValueError("model exposes no torch.nn.Linear layers to adapt")
    return present


def _encode(tokenizer, texts: list[str], max_length: int) -> list[list[int]]:
    encoded: list[list[int]] = []
    for text in texts:
        ids = tokenizer(str(text), truncation=True, max_length=max_length)["input_ids"]
        if ids:
            encoded.append(list(ids))
    if not encoded:
        raise ValueError("every training example tokenized to nothing")
    return encoded


def _make_batch(encoded: list[list[int]], indices: list[int], pad_id: int):
    """Right-pad a batch and mask padding out of the labels."""
    import torch

    max_len = max(len(encoded[i]) for i in indices)
    rows, masks, labels = [], [], []
    for i in indices:
        ids = encoded[i][:max_len]
        pad = max_len - len(ids)
        rows.append(ids + [pad_id] * pad)
        masks.append([1] * len(ids) + [0] * pad)
        labels.append(ids + [-100] * pad)
    return (
        torch.tensor(rows, dtype=torch.long),
        torch.tensor(masks, dtype=torch.long),
        torch.tensor(labels, dtype=torch.long),
    )


def _trainable_parameters(model) -> list:
    return [p for p in model.parameters() if p.requires_grad]


def train_module(
    *,
    base_model: str,
    examples: list[str],
    config: TrainConfig,
    output_root: str | os.PathLike = "storage/modules",
    retain_examples: Optional[list[str]] = None,
    model: Any = None,
    tokenizer: Any = None,
    scorer: Optional[Callable[[str], dict]] = None,
    probe_suite: str = "",
    probe_suite_hash: str = "",
    progress: Optional[Callable[[dict], None]] = None,
    notes: str = "",
) -> ModuleManifest:
    """
    Fit a LoRA delta for ``config.capability`` and write it to disk.

    Args:
        base_model: hub id or path the delta is bound to.
        examples: prompts/text the delta should fit (the capability to acquire).
        retain_examples: optional text to protect, used as a retention term.
        model/tokenizer: preloaded objects; loaded from ``base_model`` if absent.
        scorer: ``callable(module_dir) -> dict`` returning any of
            ``score_before``, ``score_after``, ``collateral``, ``verdict``.
            Without it the manifest is saved unverified.

    Returns the manifest, which is also written to the module directory.
    """
    import torch
    from peft import LoraConfig, get_peft_model
    from transformers import AutoModelForCausalLM, AutoTokenizer

    if not examples:
        raise ValueError("train_module requires at least one example")

    torch.manual_seed(config.seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(config.seed)

    dtype_map = {
        "float16": torch.float16,
        "bfloat16": torch.bfloat16,
        "float32": torch.float32,
    }
    torch_dtype = dtype_map.get(config.torch_dtype, torch.float32)
    if not torch.cuda.is_available() and torch_dtype != torch.float32:
        # fp16 training on CPU is not supported by the optimisers here.
        logger.warning("no CUDA device; training the delta in float32")
        torch_dtype = torch.float32

    if tokenizer is None:
        tokenizer = AutoTokenizer.from_pretrained(base_model)
    if getattr(tokenizer, "pad_token", None) is None:
        tokenizer.pad_token = tokenizer.eos_token

    if model is None:
        model = AutoModelForCausalLM.from_pretrained(
            base_model,
            dtype=torch_dtype,
            low_cpu_mem_usage=True,
        )
    if config.device:
        model = model.to(config.device)

    target_modules = _resolve_target_modules(model, config.target_modules)
    lora_config = LoraConfig(
        r=config.lora_r,
        lora_alpha=config.lora_alpha,
        lora_dropout=config.lora_dropout,
        target_modules=target_modules,
        bias="none",
        task_type="CAUSAL_LM",
    )
    peft_model = get_peft_model(model, lora_config)
    peft_model.train()

    pad_id = tokenizer.pad_token_id if tokenizer.pad_token_id is not None else 0
    encoded = _encode(tokenizer, examples, config.max_length)
    encoded_retain = _encode(tokenizer, retain_examples, config.max_length) if retain_examples else []

    params = _trainable_parameters(peft_model)
    if not params:
        raise RuntimeError("no trainable LoRA parameters were created")
    optimizer = torch.optim.AdamW(params, lr=config.learning_rate, weight_decay=config.weight_decay)

    logger.info(
        "training module capability=%s steps=%d lr=%g r=%d targets=%s",
        config.capability, config.num_steps, config.learning_rate,
        config.lora_r, ",".join(target_modules),
    )

    device = next(peft_model.parameters()).device
    forget_cursor = 0
    retain_cursor = 0
    history: list[dict] = []

    for step in range(config.num_steps):
        optimizer.zero_grad(set_to_none=True)

        batch_indices = [
            (forget_cursor + i) % len(encoded)
            for i in range(max(1, config.batch_size))
        ]
        forget_cursor = (forget_cursor + config.batch_size) % len(encoded)
        input_ids, attention_mask, labels = _make_batch(encoded, batch_indices, pad_id)
        outputs = peft_model(
            input_ids=input_ids.to(device),
            attention_mask=attention_mask.to(device),
            labels=labels.to(device),
        )
        forget_loss = outputs.loss

        retain_loss = None
        total_loss = forget_loss
        if encoded_retain:
            retain_indices = [
                (retain_cursor + i) % len(encoded_retain)
                for i in range(max(1, config.batch_size))
            ]
            retain_cursor = (retain_cursor + config.batch_size) % len(encoded_retain)
            r_ids, r_mask, r_labels = _make_batch(encoded_retain, retain_indices, pad_id)
            retain_outputs = peft_model(
                input_ids=r_ids.to(device),
                attention_mask=r_mask.to(device),
                labels=r_labels.to(device),
            )
            retain_loss = retain_outputs.loss
            total_loss = forget_loss + config.retain_weight * retain_loss

        total_loss.backward()
        torch.nn.utils.clip_grad_norm_(params, config.max_grad_norm)
        optimizer.step()

        entry = {
            "step": step + 1,
            "forget_loss": round(float(forget_loss.detach()), 5),
            "total_loss": round(float(total_loss.detach()), 5),
            "progress": round((step + 1) / config.num_steps, 4),
        }
        if retain_loss is not None:
            entry["retain_loss"] = round(float(retain_loss.detach()), 5)
        history.append(entry)
        if progress:
            progress(entry)
        if (step + 1) % 10 == 0:
            logger.info(
                "step %d/%d forget_loss=%.5f%s",
                step + 1, config.num_steps, float(forget_loss.detach()),
                "" if retain_loss is None else f" retain_loss={float(retain_loss.detach()):.5f}",
            )

    peft_model.eval()

    manifest = ModuleManifest.create(
        capability=config.capability,
        base_model=base_model,
        tokenizer_identity=tokenizer_identity(tokenizer),
        method="lora",
        training=config.to_dict(),
        lora={
            "r": config.lora_r,
            "alpha": config.lora_alpha,
            "dropout": config.lora_dropout,
            "target_modules": target_modules,
            "task_type": "CAUSAL_LM",
        },
        probe_suite=probe_suite,
        probe_suite_hash=probe_suite_hash,
        examples=len(encoded),
        notes=notes,
    )

    module_dir = Path(output_root) / manifest.id
    module_dir.mkdir(parents=True, exist_ok=True)
    peft_model.save_pretrained(str(module_dir))
    manifest.files = {"weights": ADAPTER_WEIGHTS, "training_history": "training_history.json"}

    import json

    (module_dir / "training_history.json").write_text(
        json.dumps(
            {
                "steps": history,
                "final_forget_loss": history[-1]["forget_loss"] if history else None,
                "retained_examples": len(encoded_retain),
            },
            indent=2,
        ),
        encoding="utf-8",
    )

    if scorer is not None:
        measured = scorer(str(module_dir)) or {}
        manifest.record_scores(
            score_before=measured.get("score_before"),
            score_after=measured.get("score_after"),
            collateral=measured.get("collateral"),
            verdict=measured.get("verdict"),
        )
    else:
        logger.warning(
            "module %s saved without measurement; manifest stays unverified", manifest.id
        )

    manifest.save(module_dir)
    return manifest


def relearn(
    *,
    base_model: str,
    capability: str,
    examples: list[str],
    retain_examples: Optional[list[str]] = None,
    config: Optional[TrainConfig] = None,
    **kwargs,
) -> ModuleManifest:
    """
    Acquire or repair a capability.

    Identical mechanics to ``train_module``; named separately because "relearn"
    is what the fabric does after an eviction, and the retention term is what
    keeps the repair from costing other capabilities.
    """
    cfg = config or TrainConfig(capability=capability)
    cfg.capability = capability
    return train_module(
        base_model=base_model,
        examples=examples,
        config=cfg,
        retain_examples=retain_examples,
        **kwargs,
    )
