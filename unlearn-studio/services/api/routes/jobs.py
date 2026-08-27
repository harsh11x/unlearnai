"""
NullMind - Jobs API Routes
Handles unlearning job creation, monitoring, and management.
"""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from services.api.database import (
    get_db, Model, ModelVersion, UnlearningJob, JobStatus, Dataset,
)

router = APIRouter()


class UnlearningJobCreate(BaseModel):
    model_id: str
    source_version_id: str
    target_capability: str = "python"
    method: str = "retain_aware"
    config: dict = {}


class UnlearningJobResponse(BaseModel):
    id: str
    model_id: str
    method: str
    status: str
    progress: float
    created_at: str


@router.post("/")
def create_unlearning_job(data: UnlearningJobCreate, db: Session = Depends(get_db)):
    """Create a new unlearning job."""
    # Validate model exists
    model = db.query(Model).filter(Model.id == data.model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")

    # Validate source version
    source_version = db.query(ModelVersion).filter(ModelVersion.id == data.source_version_id).first()
    if not source_version:
        raise HTTPException(status_code=404, detail="Source version not found")

    # Create job
    job = UnlearningJob(
        id=str(uuid.uuid4()),
        model_id=data.model_id,
        source_version_id=data.source_version_id,
        target_capability=data.target_capability,
        method=data.method,
        config_json=data.config,
        status=JobStatus.PENDING,
        total_steps=data.config.get("num_steps", 200),
    )
    db.add(job)

    # Create result version (new version for the unlearned model)
    latest_version = (
        db.query(ModelVersion)
        .filter(ModelVersion.model_id == data.model_id)
        .order_by(ModelVersion.version_number.desc())
        .first()
    )
    new_version_num = (latest_version.version_number + 1) if latest_version else 2

    result_version = ModelVersion(
        model_id=data.model_id,
        version_number=new_version_num,
        version_tag=f"v{new_version_num}_unlearned",
        parent_version_id=data.source_version_id,
        status="pending",
    )
    db.add(result_version)
    db.commit()

    job.result_version_id = result_version.id
    db.commit()

    # In production, dispatch to Celery worker
    # For now, return the job info
    return {
        "id": job.id,
        "model_id": job.model_id,
        "source_version_id": job.source_version_id,
        "result_version_id": job.result_version_id,
        "method": job.method,
        "target_capability": job.target_capability,
        "status": job.status.value,
        "total_steps": job.total_steps,
        "created_at": job.created_at.isoformat() if job.created_at else "",
    }


@router.get("/{job_id}")
def get_job(job_id: str, db: Session = Depends(get_db)):
    """Get unlearning job details."""
    job = db.query(UnlearningJob).filter(UnlearningJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    return {
        "id": job.id,
        "model_id": job.model_id,
        "source_version_id": job.source_version_id,
        "result_version_id": job.result_version_id,
        "target_capability": job.target_capability,
        "method": job.method,
        "config": job.config_json,
        "status": job.status.value if job.status else "unknown",
        "progress": job.progress,
        "current_step": job.current_step,
        "total_steps": job.total_steps,
        "loss": job.loss,
        "forget_metric": job.forget_metric,
        "retain_metric": job.retain_metric,
        "gpu_utilization": job.gpu_utilization,
        "gpu_memory_used": job.gpu_memory_used,
        "training_log": job.training_log,
        "error": job.error,
        "started_at": job.started_at.isoformat() if job.started_at else None,
        "completed_at": job.completed_at.isoformat() if job.completed_at else None,
        "created_at": job.created_at.isoformat() if job.created_at else "",
    }


@router.get("/")
def list_jobs(model_id: str = None, db: Session = Depends(get_db)):
    """List unlearning jobs."""
    query = db.query(UnlearningJob)
    if model_id:
        query = query.filter(UnlearningJob.model_id == model_id)
    jobs = query.order_by(UnlearningJob.created_at.desc()).all()

    return [
        {
            "id": j.id,
            "model_id": j.model_id,
            "method": j.method,
            "status": j.status.value if j.status else "unknown",
            "progress": j.progress,
            "target_capability": j.target_capability,
            "created_at": j.created_at.isoformat() if j.created_at else "",
        }
        for j in jobs
    ]


@router.post("/{job_id}/cancel")
def cancel_job(job_id: str, db: Session = Depends(get_db)):
    """Cancel a running job."""
    job = db.query(UnlearningJob).filter(UnlearningJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.status in [JobStatus.COMPLETED, JobStatus.FAILED]:
        raise HTTPException(status_code=400, detail="Job already finished")

    job.status = JobStatus.CANCELLED
    db.commit()

    return {"id": job.id, "status": "cancelled"}
