"""
Celery Worker Tasks for Unlearn Studio.

These tasks run on GPU-enabled workers and handle:
1. Model validation and metadata extraction
2. Unlearning job execution
3. Evaluation runs
4. Report generation
"""

import os
import time
import json
import hashlib
import logging
import traceback
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, Any, Optional

from .celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, name="worker.validate_model", max_retries=2)
def validate_model(self, model_id: int, storage_path: str) -> Dict[str, Any]:
    """
    Validate an uploaded model and extract metadata.
    
    This runs in an isolated worker and never exposes the model
    to the API server process.
    """
    task_id = self.request.id
    logger.info(f"[{task_id}] Starting model validation for model_id={model_id}")
    
    try:
        # Update task state
        self.update_state(state="PROGRESS", meta={"step": "loading_model", "progress": 10})
        
        # Import ML libraries inside the worker
        import torch
        from transformers import AutoConfig, AutoTokenizer
        
        # Load config (safe, no model weights loaded yet)
        logger.info(f"[{task_id}] Loading model config...")
        config = AutoConfig.from_pretrained(storage_path)
        
        self.update_state(state="PROGRESS", meta={"step": "extracting_metadata", "progress": 30})
        
        # Extract architecture info
        architecture = config.model_type
        parameter_count = sum(p.numel() for p in 
            AutoModelForCausalLM.from_pretrained(storage_path, low_cpu_mem_usage=True).parameters()
        ) if hasattr(config, 'vocab_size') else 0
        
        # Estimate VRAM (rough: 2 bytes per param for fp16, 4 for fp32)
        dtype_size = 2 if config.torch_dtype == torch.float16 else 4
        estimated_vram_gb = (parameter_count * dtype_size) / (1024**3) * 1.2  # 20% overhead
        
        # Get tokenizer info
        tokenizer = AutoTokenizer.from_pretrained(storage_path)
        tokenizer_type = tokenizer.__class__.__name__
        
        # Compute hash
        model_hash = _compute_directory_hash(storage_path)
        
        # Get model size
        model_size = _compute_directory_size(storage_path)
        
        self.update_state(state="PROGRESS", meta={"step": "completed", "progress": 100})
        
        result = {
            "status": "valid",
            "architecture": architecture,
            "parameter_count": parameter_count,
            "tokenizer_type": tokenizer_type,
            "dtype": str(config.torch_dtype),
            "model_hash": model_hash,
            "model_size_bytes": model_size,
            "estimated_vram_gb": round(estimated_vram_gb, 2),
            "is_compatible": True,
        }
        
        logger.info(f"[{task_id}] Model validation complete: {result}")
        return result
        
    except Exception as e:
        logger.error(f"[{task_id}] Model validation failed: {e}")
        logger.error(traceback.format_exc())
        return {
            "status": "error",
            "error": str(e),
            "traceback": traceback.format_exc(),
        }


@celery_app.task(bind=True, name="worker.run_unlearning", max_retries=1)
def run_unlearning(self, job_id: int, config_json: str) -> Dict[str, Any]:
    """
    Execute an unlearning job.
    
    This is the core ML task that:
    1. Loads the source model
    2. Loads forget/retain datasets
    3. Runs the unlearning algorithm
    4. Saves the new model version
    5. Returns metrics
    """
    task_id = self.request.id
    config = json.loads(config_json)
    
    logger.info(f"[{task_id}] Starting unlearning job_id={job_id}")
    logger.info(f"[{task_id}] Config: {config}")
    
    try:
        import torch
        from transformers import AutoModelForCausalLM, AutoTokenizer
        
        self.update_state(state="PROGRESS", meta={"step": "loading_model", "progress": 5})
        
        # Load source model
        source_path = config["source_path"]
        model = AutoModelForCausalLM.from_pretrained(
            source_path,
            torch_dtype=torch.float16 if config.get("dtype") == "float16" else torch.float32,
            device_map="auto" if torch.cuda.is_available() else None,
        )
        tokenizer = AutoTokenizer.from_pretrained(source_path)
        
        self.update_state(state="PROGRESS", meta={"step": "loading_datasets", "progress": 15})
        
        # Load datasets
        forget_data = _load_dataset(config["forget_dataset_path"])
        retain_data = _load_dataset(config["retain_dataset_path"])
        
        self.update_state(state="PROGRESS", meta={"step": "preparing_training", "progress": 25})
        
        # Initialize unlearning method
        method_name = config["method"]
        learning_rate = config.get("learning_rate", 1e-5)
        steps = config.get("steps", 100)
        batch_size = config.get("batch_size", 4)
        retain_weight = config.get("retain_weight", 1.0)
        
        optimizer = torch.optim.AdamW(model.parameters(), lr=learning_rate)
        
        total_forget_loss = 0
        total_retain_loss = 0
        
        # Training loop
        model.train()
        for step in range(steps):
            # Forget objective: maximize loss on forget data (make model worse)
            forget_loss = _compute_forget_loss(model, tokenizer, forget_data, batch_size)
            
            # Retain objective: minimize loss on retain data
            retain_loss = _compute_retain_loss(model, tokenizer, retain_data, batch_size)
            
            # Combined loss
            if method_name == "retain_aware":
                loss = -forget_loss + retain_weight * retain_loss
            else:  # gradient_baseline
                loss = -forget_loss
            
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()
            
            total_forget_loss += forget_loss.item()
            total_retain_loss += retain_loss.item()
            
            # Update progress
            progress = 25 + (step / steps) * 65
            self.update_state(
                state="PROGRESS",
                meta={
                    "step": f"training_step_{step}",
                    "progress": round(progress, 1),
                    "current_step": step,
                    "total_steps": steps,
                    "forget_loss": round(forget_loss.item(), 4),
                    "retain_loss": round(retain_loss.item(), 4),
                }
            )
            
            if step % 10 == 0:
                logger.info(
                    f"[{task_id}] Step {step}/{steps}: "
                    f"forget_loss={forget_loss.item():.4f}, "
                    f"retain_loss={retain_loss.item():.4f}"
                )
        
        self.update_state(state="PROGRESS", meta={"step": "saving_model", "progress": 92})
        
        # Save new model version
        output_path = config["output_path"]
        os.makedirs(output_path, exist_ok=True)
        model.save_pretrained(output_path)
        tokenizer.save_pretrained(output_path)
        
        self.update_state(state="PROGRESS", meta={"step": "completed", "progress": 100})
        
        result = {
            "status": "completed",
            "output_path": output_path,
            "final_forget_loss": round(total_forget_loss / steps, 4),
            "final_retain_loss": round(total_retain_loss / steps, 4),
            "steps_completed": steps,
        }
        
        logger.info(f"[{task_id}] Unlearning job complete: {result}")
        return result
        
    except Exception as e:
        logger.error(f"[{task_id}] Unlearning job failed: {e}")
        logger.error(traceback.format_exc())
        return {
            "status": "failed",
            "error": str(e),
            "traceback": traceback.format_exc(),
        }


@celery_app.task(bind=True, name="worker.run_evaluation", max_retries=1)
def run_evaluation(self, eval_id: int, config_json: str) -> Dict[str, Any]:
    """
    Run evaluation comparing original vs. unlearned model.
    
    Tests:
    - Target forgetting (Python)
    - Retention (JS, TS, C++, general)
    - Robustness (paraphrases, indirect prompts)
    - Collateral damage assessment
    """
    task_id = self.request.id
    config = json.loads(config_json)
    
    logger.info(f"[{task_id}] Starting evaluation eval_id={eval_id}")
    
    try:
        import torch
        from transformers import AutoModelForCausalLM, AutoTokenizer
        
        self.update_state(state="PROGRESS", meta={"step": "loading_models", "progress": 5})
        
        # Load both models
        original_model = AutoModelForCausalLM.from_pretrained(
            config["original_model_path"],
            torch_dtype=torch.float16,
            device_map="auto" if torch.cuda.is_available() else None,
        )
        unlearned_model = AutoModelForCausalLM.from_pretrained(
            config["unlearned_model_path"],
            torch_dtype=torch.float16,
            device_map="auto" if torch.cuda.is_available() else None,
        )
        tokenizer = AutoTokenizer.from_pretrained(config["original_model_path"])
        
        self.update_state(state="PROGRESS", meta={"step": "loading_evaluation_suite", "progress": 15})
        
        # Load evaluation probes
        eval_probes = _load_evaluation_probes(config["evaluation_probes_path"])
        
        results = {
            "target": {},
            "retain": {},
            "robustness": {},
        }
        
        total_categories = len(eval_probes)
        completed = 0
        
        for category, probes in eval_probes.items():
            self.update_state(
                state="PROGRESS",
                meta={
                    "step": f"evaluating_{category}",
                    "progress": round(15 + (completed / total_categories) * 80, 1),
                }
            )
            
            # Evaluate both models on this category
            original_scores = _evaluate_probes(original_model, tokenizer, probes)
            unlearned_scores = _evaluate_probes(unlearned_model, tokenizer, probes)
            
            # Compute delta
            avg_original = sum(original_scores) / len(original_scores) if original_scores else 0
            avg_unlearned = sum(unlearned_scores) / len(unlearned_scores) if unlearned_scores else 0
            delta = avg_unlearned - avg_original
            delta_percent = (delta / avg_original * 100) if avg_original > 0 else 0
            
            results[category] = {
                "score_before": round(avg_original, 4),
                "score_after": round(avg_unlearned, 4),
                "delta": round(delta, 4),
                "delta_percent": round(delta_percent, 2),
                "sample_count": len(probes),
            }
            
            completed += 1
        
        self.update_state(state="PROGRESS", meta={"step": "computing_metrics", "progress": 95})
        
        # Compute overall metrics
        target_delta = results.get("python", {}).get("delta", 0)
        retain_deltas = [
            v["delta"] for k, v in results.items() 
            if k in ["javascript", "typescript", "cpp", "general_programming", "general_reasoning"]
        ]
        avg_retain_delta = sum(retain_deltas) / len(retain_deltas) if retain_deltas else 0
        
        # Compute verdict
        verdict = _compute_verdict(target_delta, avg_retain_delta)
        
        self.update_state(state="PROGRESS", meta={"step": "completed", "progress": 100})
        
        result = {
            "status": "completed",
            "results": results,
            "forgetting_score": round(abs(target_delta), 4),
            "retention_score": round(1 - abs(avg_retain_delta), 4),
            "collateral_damage": round(abs(avg_retain_delta), 4),
            "verdict": verdict,
        }
        
        logger.info(f"[{task_id}] Evaluation complete: verdict={verdict}")
        return result
        
    except Exception as e:
        logger.error(f"[{task_id}] Evaluation failed: {e}")
        logger.error(traceback.format_exc())
        return {
            "status": "failed",
            "error": str(e),
            "traceback": traceback.format_exc(),
        }


# --- Helper Functions ---

def _compute_directory_hash(path: str) -> str:
    """Compute SHA-256 hash of all files in a directory."""
    hasher = hashlib.sha256()
    for root, dirs, files in os.walk(path):
        for fname in sorted(files):
            fpath = os.path.join(root, fname)
            with open(fpath, "rb") as f:
                for chunk in iter(lambda: f.read(8192), b""):
                    hasher.update(chunk)
    return hasher.hexdigest()


def _compute_directory_size(path: str) -> int:
    """Compute total size of all files in a directory."""
    total = 0
    for root, dirs, files in os.walk(path):
        for fname in files:
            total += os.path.getsize(os.path.join(root, fname))
    return total


def _load_dataset(path: str) -> list:
    """Load a dataset from JSON/JSONL file."""
    data = []
    with open(path, "r") as f:
        for line in f:
            line = line.strip()
            if line:
                data.append(json.loads(line))
    return data


def _load_evaluation_probes(path: str) -> Dict[str, list]:
    """Load evaluation probes organized by category."""
    with open(path, "r") as f:
        return json.load(f)


def _compute_forget_loss(model, tokenizer, forget_data, batch_size):
    """
    Compute forget loss: maximize loss on forget data.
    
    For gradient baseline, we want to increase loss (make model worse).
    This is done by negating the loss in the optimizer step.
    """
    import torch
    
    total_loss = torch.tensor(0.0, device=model.device)
    count = 0
    
    for i in range(0, min(len(forget_data), batch_size * 5), batch_size):
        batch = forget_data[i:i+batch_size]
        if not batch:
            break
            
        texts = [item.get("prompt", "") for item in batch]
        inputs = tokenizer(texts, return_tensors="pt", padding=True, truncation=True)
        inputs = {k: v.to(model.device) for k, v in inputs.items()}
        
        outputs = model(**inputs, labels=inputs["input_ids"])
        total_loss += outputs.loss
        count += 1
    
    return total_loss / max(count, 1)


def _compute_retain_loss(model, tokenizer, retain_data, batch_size):
    """Compute retain loss: minimize loss on retain data."""
    import torch
    
    total_loss = torch.tensor(0.0, device=model.device)
    count = 0
    
    for i in range(0, min(len(retain_data), batch_size * 5), batch_size):
        batch = retain_data[i:i+batch_size]
        if not batch:
            break
            
        texts = [item.get("prompt", "") for item in batch]
        inputs = tokenizer(texts, return_tensors="pt", padding=True, truncation=True)
        inputs = {k: v.to(model.device) for k, v in inputs.items()}
        
        outputs = model(**inputs, labels=inputs["input_ids"])
        total_loss += outputs.loss
        count += 1
    
    return total_loss / max(count, 1)


def _evaluate_probes(model, tokenizer, probes):
    """Evaluate a model on a set of probes and return scores."""
    import torch
    
    scores = []
    model.eval()
    
    with torch.no_grad():
        for probe in probes:
            prompt = probe.get("prompt", "")
            expected = probe.get("expected_pattern", "")
            
            inputs = tokenizer(prompt, return_tensors="pt", truncation=True, max_length=512)
            inputs = {k: v.to(model.device) for k, v in inputs.items()}
            
            outputs = model.generate(
                **inputs,
                max_new_tokens=256,
                temperature=0.1,
                do_sample=False,
            )
            
            response = tokenizer.decode(outputs[0][inputs["input_ids"].shape[1]:], skip_special_tokens=True)
            
            # Simple pattern matching for scoring
            score = _pattern_match_score(response, expected, probe.get("language", ""))
            scores.append(score)
    
    return scores


def _pattern_match_score(response: str, expected: str, language: str) -> float:
    """
    Score a response based on pattern matching.
    
    Returns 0.0-1.0 where 1.0 means perfect match.
    """
    if not expected:
        return 0.5  # Can't evaluate without expected pattern
    
    response_lower = response.lower().strip()
    expected_lower = expected.lower().strip()
    
    # Exact match
    if expected_lower in response_lower:
        return 1.0
    
    # Partial keyword match
    keywords = [w for w in expected_lower.split() if len(w) > 3]
    if keywords:
        matched = sum(1 for kw in keywords if kw in response_lower)
        keyword_score = matched / len(keywords)
    else:
        keyword_score = 0.0
    
    # Language-specific heuristics
    if language == "python":
        # Check for Python-specific patterns
        python_indicators = ["def ", "class ", "import ", "from ", "return", "print("]
        python_score = sum(1 for ind in python_indicators if ind in response_lower) / len(python_indicators)
    elif language in ["javascript", "typescript"]:
        js_indicators = ["function ", "const ", "let ", "var ", "=>", "return"]
        python_score = sum(1 for ind in js_indicators if ind in response_lower) / len(js_indicators)
    else:
        python_score = 0.0
    
    return (keyword_score * 0.7 + python_score * 0.3)


def _compute_verdict(target_delta: float, avg_retain_delta: float) -> str:
    """Compute the final verdict based on thresholds."""
    # Thresholds (configurable)
    FORGETTING_THRESHOLD = -0.3  # At least 30% drop in target capability
    RETENTION_THRESHOLD = -0.1   # No more than 10% drop in retained capabilities
    
    if target_delta < FORGETTING_THRESHOLD and avg_retain_delta > RETENTION_THRESHOLD:
        return "pass"
    elif target_delta < FORGETTING_THRESHOLD * 0.5:
        return "pass_with_review"
    else:
        return "fail"
