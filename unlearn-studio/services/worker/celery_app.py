"""
NullMind - Celery Worker
Background job processing for unlearning and evaluation tasks.
"""

import os
import logging
import time
import json
from datetime import datetime, timezone

from celery import Celery

logger = logging.getLogger(__name__)

# Celery configuration
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery(
    "nullmind",
    broker=REDIS_URL,
    backend=REDIS_URL,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=3600,  # 1 hour max
    task_soft_time_limit=3500,
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=10,
)


@celery_app.task(bind=True, name="unlearning.run_unlearning")
def run_unlearning_task(
    self,
    job_id: str,
    model_id: str,
    source_version_id: str,
    method: str,
    config: dict,
):
    """
    Execute an unlearning job in the background.

    This runs on a GPU worker and updates the job status throughout.
    """
    logger.info(f"Starting unlearning task for job {job_id}")

    def update_progress(entry):
        """Update job progress in database."""
        self.update_state(
            state="PROGRESS",
            meta={
                "step": entry.get("step", 0),
                "progress": entry.get("progress", 0),
                "loss": entry.get("loss", entry.get("forget_loss", 0)),
                "forget_loss": entry.get("forget_loss", 0),
                "retain_loss": entry.get("retain_loss", 0),
            },
        )

    try:
        # Update job status to running
        _update_job_status(job_id, "running", started_at=datetime.now(timezone.utc))

        # Load source model
        from ml.config import ModelConfig, UnlearningConfig
        from ml.models.adapter import HuggingFaceAdapter
        from ml.unlearning.engine import UnlearningEngine
        from ml.datasets.python_probes import build_python_forget_dataset
        from ml.datasets.retain_suite import build_retain_suite

        model_config = ModelConfig()
        adapter = HuggingFaceAdapter()

        # Get model path from version
        storage_path = _get_model_path(source_version_id)
        adapter.load(storage_path, model_config)

        # Build datasets
        forget_dataset = build_python_forget_dataset()
        retain_suite = build_retain_suite()

        forget_prompts = [p.prompt for p in forget_dataset.probes]
        retain_prompts = [p.prompt for p in retain_suite.probes]

        # Configure unlearning
        unlearning_config = UnlearningConfig(**config)

        # Run unlearning
        engine = UnlearningEngine(unlearning_config)
        result = engine.run_unlearning(
            model=adapter.get_model(),
            tokenizer=adapter.get_tokenizer(),
            forget_prompts=forget_prompts,
            retain_prompts=retain_prompts,
            method_id=method,
            config=unlearning_config,
            progress_callback=update_progress,
        )

        # Save unlearned model
        from ml.config import AppConfig
        app_config = AppConfig.from_env()
        version_dir = adapter.save(app_config.storage.models_dir, f"v{config.get('version_number', 2)}_unlearned")

        # Update job status to completed
        _update_job_status(
            job_id,
            "completed",
            completed_at=datetime.now(timezone.utc),
            progress=1.0,
            training_log=result,
        )

        adapter.unload()
        logger.info(f"Unlearning task completed for job {job_id}")

        return {"job_id": job_id, "status": "completed", "version_dir": version_dir}

    except Exception as e:
        logger.error(f"Unlearning task failed for job {job_id}: {e}")
        _update_job_status(job_id, "failed", error=str(e))
        raise


@celery_app.task(bind=True, name="evaluation.run_evaluation")
def run_evaluation_task(
    self,
    eval_id: str,
    model_id: str,
    model_version_id: str,
    eval_type: str = "baseline",
):
    """Execute an evaluation run in the background."""
    logger.info(f"Starting evaluation task for {eval_id}")

    try:
        from ml.config import AppConfig
        from ml.models.adapter import HuggingFaceAdapter
        from ml.evaluation.engine import EvaluationEngine
        from ml.datasets.python_probes import build_python_probe_suite
        from ml.datasets.retain_suite import build_retain_suite

        adapter = HuggingFaceAdapter()
        config = AppConfig.from_env()

        # Load model
        storage_path = _get_model_path(model_version_id)
        adapter.load(storage_path, config.model)

        # Build probe suites
        python_probes = build_python_probe_suite()
        retain_suite = build_retain_suite()
        combined = python_probes
        for probe in retain_suite.probes:
            combined.add_probe(probe)

        # Run evaluation
        eval_engine = EvaluationEngine(config.evaluation)
        eval_run = eval_engine.run_evaluation(
            adapter,
            combined,
            model_id=model_id,
            run_id=eval_id,
        )

        # Save results
        eval_run.save(f"{config.storage.evaluations_dir}/{eval_id}.json")

        adapter.unload()
        logger.info(f"Evaluation task completed for {eval_id}")

        return {"eval_id": eval_id, "status": "completed"}

    except Exception as e:
        logger.error(f"Evaluation task failed for {eval_id}: {e}")
        raise


def _update_job_status(job_id: str, status: str, **kwargs):
    """Update job status in database."""
    # In production, this would update the database
    # For now, log the update
    logger.info(f"Job {job_id} status: {status} {kwargs}")


def _get_model_path(version_id: str) -> str:
    """Get model storage path from version ID."""
    # In production, query database
    # For now, return a default path
    return f"storage/models/{version_id}"
