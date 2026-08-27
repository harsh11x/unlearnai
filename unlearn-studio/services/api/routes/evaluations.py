"""
Unlearn Studio - Evaluations API Routes
Handles evaluation runs and results.
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from services.api.database import (
    get_db, Model, ModelVersion, EvaluationRun, Metric, EvalStatus,
)

router = APIRouter()


class EvaluationCreate(BaseModel):
    model_id: str
    model_version_id: str
    eval_type: str = "baseline"  # baseline, post_unlearning, comparison


@router.post("/")
def create_evaluation(data: EvaluationCreate, db: Session = Depends(get_db)):
    """Create a new evaluation run."""
    model = db.query(Model).filter(Model.id == data.model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")

    version = db.query(ModelVersion).filter(ModelVersion.id == data.model_version_id).first()
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")

    eval_run = EvaluationRun(
        id=str(uuid.uuid4()),
        model_id=data.model_id,
        model_version_id=data.model_version_id,
        eval_type=data.eval_type,
        status=EvalStatus.PENDING,
    )
    db.add(eval_run)
    db.commit()

    return {
        "id": eval_run.id,
        "model_id": eval_run.model_id,
        "model_version_id": eval_run.model_version_id,
        "eval_type": eval_run.eval_type,
        "status": eval_run.status.value,
    }


@router.get("/{eval_id}")
def get_evaluation(eval_id: str, db: Session = Depends(get_db)):
    """Get evaluation results."""
    eval_run = db.query(EvaluationRun).filter(EvaluationRun.id == eval_id).first()
    if not eval_run:
        raise HTTPException(status_code=404, detail="Evaluation not found")

    metrics = db.query(Metric).filter(Metric.evaluation_run_id == eval_id).all()

    return {
        "id": eval_run.id,
        "model_id": eval_run.model_id,
        "model_version_id": eval_run.model_version_id,
        "eval_type": eval_run.eval_type,
        "status": eval_run.status.value if eval_run.status else "unknown",
        "metrics": eval_run.metrics,
        "overall_score": eval_run.overall_score,
        "duration_seconds": eval_run.duration_seconds,
        "hardware_info": eval_run.hardware_info,
        "software_versions": eval_run.software_versions,
        "capability_scores": [
            {
                "capability": m.capability,
                "score": m.score,
                "probe_count": m.probe_count,
                "matched_count": m.matched_count,
            }
            for m in metrics
        ],
        "created_at": eval_run.created_at.isoformat() if eval_run.created_at else "",
    }


@router.get("/")
def list_evaluations(model_id: str = None, db: Session = Depends(get_db)):
    """List evaluation runs."""
    query = db.query(EvaluationRun)
    if model_id:
        query = query.filter(EvaluationRun.model_id == model_id)
    evals = query.order_by(EvaluationRun.created_at.desc()).all()

    return [
        {
            "id": e.id,
            "model_id": e.model_id,
            "model_version_id": e.model_version_id,
            "eval_type": e.eval_type,
            "status": e.status.value if e.status else "unknown",
            "overall_score": e.overall_score,
            "created_at": e.created_at.isoformat() if e.created_at else "",
        }
        for e in evals
    ]


@router.get("/reports/{report_id}")
def get_report(report_id: str):
    """Get a stored evaluation report."""
    from pathlib import Path
    import json

    report_path = Path(f"storage/reports/{report_id}.json")
    if not report_path.exists():
        raise HTTPException(status_code=404, detail="Report not found")

    with open(report_path) as f:
        report = json.load(f)

    return report


@router.get("/reports/list")
def list_reports():
    """List all available reports."""
    from pathlib import Path
    import json

    reports_dir = Path("storage/reports")
    if not reports_dir.exists():
        return []

    reports = []
    for report_file in sorted(reports_dir.glob("*.json"), reverse=True):
        try:
            with open(report_file) as f:
                data = json.load(f)
            reports.append({
                "id": data.get("report_id", report_file.stem),
                "model": data.get("model", {}),
                "target": data.get("target", {}),
                "method": data.get("method", {}).get("name", ""),
                "verdict": data.get("final_verdict", {}).get("verdict", ""),
                "generated_at": data.get("generated_at", ""),
            })
        except Exception:
            continue

    return reports
