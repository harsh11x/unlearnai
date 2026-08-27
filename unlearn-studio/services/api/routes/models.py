"""
Unlearn Studio - Models API Routes
Handles model upload, inspection, and management.
"""

import os
import shutil
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from sqlalchemy.orm import Session

from services.api.database import get_db, Model, ModelVersion, ModelStatus, Project

router = APIRouter()


class ModelUploadResponse(BaseModel):
    id: str
    name: str
    status: str


class ModelInspectResponse(BaseModel):
    id: str
    name: str
    architecture: str
    parameter_count: int
    parameter_count_formatted: str
    tokenizer_type: str
    vocab_size: int
    dtype: str
    model_format: str
    model_hash: str
    model_size_bytes: int
    model_size_formatted: str
    estimated_vram_gb: float
    is_compatible: bool


@router.post("/upload")
async def upload_model(
    file: UploadFile = File(...),
    project_id: str = "default",
    db: Session = Depends(get_db),
):
    """Upload a model file for validation and inspection."""
    # Validate file type
    allowed_extensions = [".safetensors", ".bin", ".pt", ".pth", ".gguf"]
    ext = Path(file.filename).suffix.lower()
    if ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported model format: {ext}. Allowed: {allowed_extensions}"
        )

    # Check file size
    max_size = 10 * 1024 * 1024 * 1024  # 10GB

    # Save uploaded file
    upload_dir = Path("storage/uploads")
    upload_dir.mkdir(parents=True, exist_ok=True)

    model_id = str(uuid.uuid4())
    file_path = upload_dir / f"{model_id}{ext}"

    with open(file_path, "wb") as buffer:
        content = await file.read()
        if len(content) > max_size:
            raise HTTPException(status_code=413, detail="File too large (max 10GB)")
        buffer.write(content)

    # Create model record
    model = Model(
        id=model_id,
        project_id=project_id,
        name=Path(file.filename).stem,
        status=ModelStatus.VALIDATING,
        upload_path=str(file_path),
    )
    db.add(model)
    db.commit()

    # Trigger async validation (in a real system, this would be a Celery task)
    # For now, we validate synchronously
    try:
        from ml.models.adapter import HuggingFaceAdapter
        adapter = HuggingFaceAdapter()
        metadata = adapter.inspect(str(file_path))

        model.architecture = metadata.architecture
        model.parameter_count = metadata.parameter_count
        model.parameter_count_formatted = metadata.parameter_count_formatted
        model.tokenizer_type = metadata.tokenizer_type
        model.vocab_size = metadata.vocab_size
        model.dtype = metadata.dtype
        model.model_format = metadata.model_format
        model.model_hash = metadata.model_hash
        model.model_size_bytes = metadata.model_size_bytes
        model.model_size_formatted = metadata.model_size_formatted
        model.estimated_vram_gb = metadata.estimated_vram_gb
        model.is_compatible = metadata.is_compatible
        model.status = ModelStatus.READY
        model.metadata_json = metadata.to_dict()

        # Create v1
        v1 = ModelVersion(
            model_id=model_id,
            version_number=1,
            version_tag="v1",
            storage_path=str(file_path),
            model_hash=metadata.model_hash,
        )
        db.add(v1)
        db.commit()

        return {
            "id": model_id,
            "name": model.name,
            "status": "ready",
            "metadata": metadata.to_dict(),
        }

    except Exception as e:
        model.status = ModelStatus.ERROR
        db.commit()
        raise HTTPException(status_code=422, detail=f"Model validation failed: {str(e)}")


@router.get("/{model_id}")
def get_model(model_id: str, db: Session = Depends(get_db)):
    """Get model details."""
    model = db.query(Model).filter(Model.id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")

    versions = db.query(ModelVersion).filter(ModelVersion.model_id == model_id).all()

    return {
        "id": model.id,
        "name": model.name,
        "status": model.status.value if model.status else "unknown",
        "architecture": model.architecture,
        "parameter_count": model.parameter_count,
        "parameter_count_formatted": model.parameter_count_formatted,
        "tokenizer_type": model.tokenizer_type,
        "vocab_size": model.vocab_size,
        "dtype": model.dtype,
        "model_format": model.model_format,
        "model_hash": model.model_hash,
        "model_size_bytes": model.model_size_bytes,
        "model_size_formatted": model.model_size_formatted,
        "estimated_vram_gb": model.estimated_vram_gb,
        "is_compatible": model.is_compatible,
        "metadata": model.metadata_json,
        "versions": [
            {
                "id": v.id,
                "version_tag": v.version_tag,
                "version_number": v.version_number,
                "status": v.status,
                "created_at": v.created_at.isoformat() if v.created_at else "",
            }
            for v in versions
        ],
        "created_at": model.created_at.isoformat() if model.created_at else "",
    }


@router.get("/{model_id}/versions")
def list_model_versions(model_id: str, db: Session = Depends(get_db)):
    """List all versions of a model."""
    model = db.query(Model).filter(Model.id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")

    versions = db.query(ModelVersion).filter(ModelVersion.model_id == model_id).all()
    return [
        {
            "id": v.id,
            "version_tag": v.version_tag,
            "version_number": v.version_number,
            "parent_version_id": v.parent_version_id,
            "storage_path": v.storage_path,
            "model_hash": v.model_hash,
            "status": v.status,
            "created_at": v.created_at.isoformat() if v.created_at else "",
        }
        for v in versions
    ]


@router.get("/list")
def list_models(project_id: str = "default", db: Session = Depends(get_db)):
    """List all models in a project."""
    models = db.query(Model).filter(Model.project_id == project_id).all()
    return [
        {
            "id": m.id,
            "name": m.name,
            "status": m.status.value if m.status else "unknown",
            "architecture": m.architecture,
            "parameter_count_formatted": m.parameter_count_formatted,
            "estimated_vram_gb": m.estimated_vram_gb,
            "created_at": m.created_at.isoformat() if m.created_at else "",
        }
        for m in models
    ]
