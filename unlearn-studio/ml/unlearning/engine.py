"""
Unlearn Studio - Unlearning Engine
Implements unlearning methods for selective capability reduction.

IMPORTANT SCIENTIFIC DISCLAIMER:
This implementation performs model editing / gradient-based forgetting.
It does NOT guarantee complete machine unlearning in the theoretical sense.
The results are evaluated empirically through controlled probing experiments.
We use language like 'capability reduction', 'measured forgetting', and
'residual capability' rather than claiming complete knowledge deletion.
"""

import copy
import json
import logging
import math
import time
import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import torch
import torch.nn.functional as F
from torch.utils.data import DataLoader, Dataset

from ml.config import UnlearningConfig

logger = logging.getLogger(__name__)


def _make_scheduler(optimizer, config: UnlearningConfig):
    """Create a learning rate scheduler, falling back to LambdaLR for small step counts."""
    if config.num_steps <= 10:
        # OneCycleLR has division-by-zero bugs with very small total_steps.
        # Use a simple linear warmup + constant schedule instead.
        warmup = max(config.warmup_steps, 1)
        def lr_lambda(step):
            if step < warmup:
                return (step + 1) / warmup
            return 1.0
        return torch.optim.lr_scheduler.LambdaLR(optimizer, lr_lambda)
    else:
        pct_start = min(config.warmup_steps / max(config.num_steps, 1), 0.99)
        return torch.optim.lr_scheduler.OneCycleLR(
            optimizer,
            max_lr=config.learning_rate,
            total_steps=config.num_steps,
            pct_start=pct_start,
        )


# =============================================================================
# Dataset classes
# =============================================================================

class UnlearningDataset(Dataset):
    """Dataset for unlearning training."""

    def __init__(self, prompts: list[str], tokenizer, max_length: int = 256):
        self.prompts = prompts
        self.tokenizer = tokenizer
        self.max_length = max_length

    def __len__(self):
        return len(self.prompts)

    def __getitem__(self, idx):
        prompt = self.prompts[idx]
        encoding = self.tokenizer(
            prompt,
            truncation=True,
            max_length=self.max_length,
            padding="max_length",
            return_tensors="pt",
        )
        return {
            "input_ids": encoding["input_ids"].squeeze(0),
            "attention_mask": encoding["attention_mask"].squeeze(0),
        }


# =============================================================================
# Unlearning Methods
# =============================================================================

class UnlearningMethod(ABC):
    """Abstract base class for unlearning methods."""

    @abstractmethod
    def run(
        self,
        model,
        tokenizer,
        forget_prompts: list[str],
        retain_prompts: list[str],
        config: UnlearningConfig,
        progress_callback=None,
    ) -> dict:
        """
        Run the unlearning process.

        Args:
            model: The model to unlearn from
            tokenizer: The tokenizer
            forget_prompts: Prompts representing knowledge to forget
            retain_prompts: Prompts representing knowledge to retain
            config: Unlearning configuration
            progress_callback: Optional callback for progress updates

        Returns:
            Dictionary with training metadata
        """
        ...


class GradientForgettingBaseline(UnlearningMethod):
    """
    METHOD 1: Gradient-based forgetting baseline.

    This method increases loss on target (Python) examples, causing the model
    to move AWAY from producing Python content. It does this by:

    1. Computing loss on forget examples
    2. Negating the gradient (maximizing loss instead of minimizing)
    3. Taking a step that increases the loss on forget examples

    This is a simple baseline that does NOT attempt to preserve other knowledge.
    It serves as a comparison point for more sophisticated methods.

    Scientific note: This method may cause collateral damage to unrelated
    capabilities because it does not have a retention mechanism.
    """

    def run(
        self,
        model,
        tokenizer,
        forget_prompts: list[str],
        retain_prompts: list[str],
        config: UnlearningConfig,
        progress_callback=None,
    ) -> dict:
        logger.info("=" * 60)
        logger.info("Starting Gradient Forgetting Baseline")
        logger.info(f"  Steps: {config.num_steps}")
        logger.info(f"  Learning rate: {config.learning_rate}")
        logger.info(f"  Forget samples: {len(forget_prompts)}")
        logger.info("=" * 60)

        model.train()
        optimizer = torch.optim.AdamW(
            model.parameters(),
            lr=config.learning_rate,
            weight_decay=config.weight_decay,
        )

        # Learning rate scheduler with warmup
        scheduler = _make_scheduler(optimizer, config)

        forget_dataset = UnlearningDataset(forget_prompts, tokenizer, max_length=256)
        forget_loader = DataLoader(
            forget_dataset,
            batch_size=config.batch_size,
            shuffle=True,
            drop_last=True,
        )

        training_log = {
            "method": "gradient_forgetting_baseline",
            "start_time": datetime.now(timezone.utc).isoformat(),
            "steps": [],
            "config": asdict(config),
        }

        total_loss = 0.0
        step_count = 0

        for step in range(config.num_steps):
            # Cycle through data
            for batch in forget_loader:
                input_ids = batch["input_ids"].to(model.device)
                attention_mask = batch["attention_mask"].to(model.device)

                # Forward pass
                outputs = model(
                    input_ids=input_ids,
                    attention_mask=attention_mask,
                    labels=input_ids,
                )
                loss = outputs.loss

                # NEGATE gradient: we want to MAXIMIZE loss (move away from Python)
                neg_loss = -loss

                # Backward pass
                optimizer.zero_grad()
                neg_loss.backward()

                # Gradient clipping
                torch.nn.utils.clip_grad_norm_(
                    model.parameters(),
                    config.max_grad_norm,
                )

                optimizer.step()
                scheduler.step()

                step_loss = loss.item()
                total_loss += step_loss
                step_count += 1

                progress = (step + 1) / config.num_steps
                avg_loss = total_loss / step_count

                log_entry = {
                    "step": step + 1,
                    "loss": round(step_loss, 4),
                    "avg_loss": round(avg_loss, 4),
                    "lr": round(scheduler.get_last_lr()[0], 8),
                    "progress": round(progress, 4),
                }
                training_log["steps"].append(log_entry)

                if progress_callback:
                    progress_callback(log_entry)

                if (step + 1) % 10 == 0:
                    logger.info(
                        f"  Step {step+1}/{config.num_steps}: "
                        f"loss={step_loss:.4f}, avg_loss={avg_loss:.4f}"
                    )

                break  # Only do one batch per step for gradient-forgetting

        training_log["end_time"] = datetime.now(timezone.utc).isoformat()
        training_log["total_steps"] = step_count
        training_log["final_avg_loss"] = round(total_loss / max(step_count, 1), 4)

        model.eval()
        logger.info("Gradient Forgetting Baseline complete")
        return training_log


class RetainAwareUnlearning(UnlearningMethod):
    """
    METHOD 2: Retain-aware / preservation-aware unlearning.

    This method combines two objectives:
    1. FORGET objective: Increase loss on target (Python) examples
       (move away from Python capability)
    2. RETAIN objective: Minimize loss on non-target examples
       (preserve other capabilities)

    total_loss = forget_loss_weight * forget_loss - retain_weight * retain_loss

    Conceptually:
    - forget_loss pushes the model to stop producing Python
    - retain_loss keeps the model's other capabilities stable

    Scientific note: The weights (forget_weight, retain_weight) control the
    tradeoff between forgetting and retention. This does NOT guarantee
    perfect unlearning — it's an optimization that empirically reduces
    target capability while attempting to preserve other capabilities.
    The actual results must be measured through evaluation, not assumed.
    """

    def run(
        self,
        model,
        tokenizer,
        forget_prompts: list[str],
        retain_prompts: list[str],
        config: UnlearningConfig,
        progress_callback=None,
    ) -> dict:
        logger.info("=" * 60)
        logger.info("Starting Retain-Aware Unlearning")
        logger.info(f"  Steps: {config.num_steps}")
        logger.info(f"  Learning rate: {config.learning_rate}")
        logger.info(f"  Forget weight: {config.forget_loss_weight}")
        logger.info(f"  Retain weight: {config.retain_loss_weight}")
        logger.info(f"  Forget samples: {len(forget_prompts)}")
        logger.info(f"  Retain samples: {len(retain_prompts)}")
        logger.info("=" * 60)

        model.train()
        optimizer = torch.optim.AdamW(
            model.parameters(),
            lr=config.learning_rate,
            weight_decay=config.weight_decay,
        )

        scheduler = _make_scheduler(optimizer, config)

        forget_dataset = UnlearningDataset(forget_prompts, tokenizer, max_length=256)
        retain_dataset = UnlearningDataset(retain_prompts, tokenizer, max_length=256)

        forget_loader = DataLoader(
            forget_dataset,
            batch_size=config.batch_size,
            shuffle=True,
            drop_last=True,
        )
        retain_loader = DataLoader(
            retain_dataset,
            batch_size=config.batch_size,
            shuffle=True,
            drop_last=True,
        )

        training_log = {
            "method": "retain_aware_unlearning",
            "start_time": datetime.now(timezone.utc).isoformat(),
            "steps": [],
            "config": asdict(config),
        }

        total_forget_loss = 0.0
        total_retain_loss = 0.0
        step_count = 0

        # Create infinite iterators for cycling
        forget_iter = iter(forget_loader)
        retain_iter = iter(retain_loader)

        for step in range(config.num_steps):
            # Get forget batch (cycle if needed)
            try:
                forget_batch = next(forget_iter)
            except StopIteration:
                forget_iter = iter(forget_loader)
                forget_batch = next(forget_iter)

            # Get retain batch (cycle if needed)
            try:
                retain_batch = next(retain_iter)
            except StopIteration:
                retain_iter = iter(retain_loader)
                retain_batch = next(retain_iter)

            # --- FORGET LOSS (maximize = negate gradient) ---
            forget_ids = forget_batch["input_ids"].to(model.device)
            forget_mask = forget_batch["attention_mask"].to(model.device)

            forget_outputs = model(
                input_ids=forget_ids,
                attention_mask=forget_mask,
                labels=forget_ids,
            )
            forget_loss = forget_outputs.loss

            # --- RETAIN LOSS (minimize = standard gradient) ---
            retain_ids = retain_batch["input_ids"].to(model.device)
            retain_mask = retain_batch["attention_mask"].to(model.device)

            retain_outputs = model(
                input_ids=retain_ids,
                attention_mask=retain_mask,
                labels=retain_ids,
            )
            retain_loss = retain_outputs.loss

            # --- COMBINED LOSS ---
            # Increase forget loss (move away from Python) while decreasing retain loss
            # total = -forget_weight * forget_loss + retain_weight * retain_loss
            # Negating forget: gradient ascent on forget, gradient descent on retain
            total_loss = (
                -config.forget_loss_weight * forget_loss +
                config.retain_loss_weight * retain_loss
            )

            # Backward pass
            optimizer.zero_grad()
            total_loss.backward()

            # Gradient clipping
            torch.nn.utils.clip_grad_norm_(
                model.parameters(),
                config.max_grad_norm,
            )

            optimizer.step()
            scheduler.step()

            step_forget_loss = forget_loss.item()
            step_retain_loss = retain_loss.item()
            total_forget_loss += step_forget_loss
            total_retain_loss += step_retain_loss
            step_count += 1

            progress = (step + 1) / config.num_steps

            log_entry = {
                "step": step + 1,
                "forget_loss": round(step_forget_loss, 4),
                "retain_loss": round(step_retain_loss, 4),
                "avg_forget_loss": round(total_forget_loss / step_count, 4),
                "avg_retain_loss": round(total_retain_loss / step_count, 4),
                "lr": round(scheduler.get_last_lr()[0], 8),
                "progress": round(progress, 4),
            }
            training_log["steps"].append(log_entry)

            if progress_callback:
                progress_callback(log_entry)

            if (step + 1) % 10 == 0:
                logger.info(
                    f"  Step {step+1}/{config.num_steps}: "
                    f"forget_loss={step_forget_loss:.4f}, "
                    f"retain_loss={step_retain_loss:.4f}"
                )

        training_log["end_time"] = datetime.now(timezone.utc).isoformat()
        training_log["total_steps"] = step_count
        training_log["final_avg_forget_loss"] = round(total_forget_loss / max(step_count, 1), 4)
        training_log["final_avg_retain_loss"] = round(total_retain_loss / max(step_count, 1), 4)

        model.eval()
        logger.info("Retain-Aware Unlearning complete")
        return training_log


# =============================================================================
# Unlearning Engine
# =============================================================================

class UnlearningEngine:
    """
    Main unlearning engine that orchestrates the unlearning process.
    """

    METHODS = {
        "gradient_forgetting": GradientForgettingBaseline,
        "retain_aware": RetainAwareUnlearning,
    }

    def __init__(self, config: Optional[UnlearningConfig] = None):
        self.config = config or UnlearningConfig()

    def get_available_methods(self) -> list[dict]:
        """List available unlearning methods with descriptions."""
        return [
            {
                "id": "gradient_forgetting",
                "name": "Gradient Forgetting Baseline",
                "description": (
                    "Maximizes loss on target examples, pushing the model away from "
                    "producing Python. Simple baseline without retention preservation. "
                    "May cause collateral damage to unrelated capabilities."
                ),
                "pros": ["Simple", "Fast", "Good baseline for comparison"],
                "cons": ["No retention mechanism", "May cause collateral damage"],
            },
            {
                "id": "retain_aware",
                "name": "Retain-Aware Unlearning",
                "description": (
                    "Combines forgetting objective (move away from Python) with "
                    "retention objective (preserve other capabilities). Uses a weighted "
                    "loss: total = -forget_weight * forget_loss + retain_weight * retain_loss"
                ),
                "pros": [
                    "Balances forgetting and retention",
                    "Less collateral damage",
                    "Experimentally justified tradeoff",
                ],
                "cons": [
                    "Requires tuning weights",
                    "Not theoretically guaranteed unlearning",
                ],
            },
        ]

    def run_unlearning(
        self,
        model,
        tokenizer,
        forget_prompts: list[str],
        retain_prompts: list[str],
        method_id: str = "retain_aware",
        config: Optional[UnlearningConfig] = None,
        progress_callback=None,
    ) -> dict:
        """
        Run the unlearning process.

        Args:
            model: The model to unlearn from
            tokenizer: The tokenizer
            forget_prompts: Prompts to forget
            retain_prompts: Prompts to retain
            method_id: Which unlearning method to use
            config: Optional override for unlearning config
            progress_callback: Optional progress callback

        Returns:
            Dictionary with training metadata and results
        """
        if method_id not in self.METHODS:
            raise ValueError(f"Unknown method: {method_id}. Available: {list(self.METHODS.keys())}")

        method_class = self.METHODS[method_id]
        method = method_class()
        cfg = config or self.config

        logger.info(f"Running unlearning with method: {method_id}")

        # Set seed for reproducibility
        torch.manual_seed(cfg.seed)
        if torch.cuda.is_available():
            torch.cuda.manual_seed_all(cfg.seed)

        start_time = time.time()

        result = method.run(
            model=model,
            tokenizer=tokenizer,
            forget_prompts=forget_prompts,
            retain_prompts=retain_prompts,
            config=cfg,
            progress_callback=progress_callback,
        )

        result["duration_seconds"] = round(time.time() - start_time, 2)
        result["method_id"] = method_id
        result["seed"] = cfg.seed

        return result
