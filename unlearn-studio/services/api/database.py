"""
Unlearn Studio - Database Models
SQLAlchemy models for all database entities.
"""

import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import (
    Column, String, Integer, Float, Text, Boolean, DateTime,
    ForeignKey, JSON, Enum as SAEnum, create_engine,
)
from sqlalchemy.orm import DeclarativeBase, relationship, Session
import enum


class Base(DeclarativeBase):
    pass


# =============================================================================
# Enums
# =============================================================================

class ModelStatus(str, enum.Enum):
    UPLOADING = "uploading"
    VALIDATING = "validating"
    READY = "ready"
    ERROR = "error"


class JobStatus(str, enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class EvalStatus(str, enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


# =============================================================================
# Database Entities
# =============================================================================

def generate_uuid() -> str:
    return str(uuid.uuid4())


class Project(Base):
    __tablename__ = "projects"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    description = Column(Text, default="")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    models = relationship("Model", back_populates="project")


class Model(Base):
    __tablename__ = "models"

    id = Column(String, primary_key=True, default=generate_uuid)
    project_id = Column(String, ForeignKey("projects.id"), nullable=False)
    name = Column(String, nullable=False)
    status = Column(SAEnum(ModelStatus), default=ModelStatus.UPLOADING)
    architecture = Column(String, default="")
    parameter_count = Column(Integer, default=0)
    parameter_count_formatted = Column(String, default="")
    tokenizer_type = Column(String, default="")
    vocab_size = Column(Integer, default=0)
    dtype = Column(String, default="")
    model_format = Column(String, default="")
    model_hash = Column(String, default="")
    model_size_bytes = Column(Integer, default=0)
    model_size_formatted = Column(String, default="")
    estimated_vram_gb = Column(Float, default=0.0)
    storage_path = Column(String, default="")
    upload_path = Column(String, default="")
    is_compatible = Column(Boolean, default=True)
    metadata_json = Column(JSON, default=dict)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    versions = relationship("ModelVersion", back_populates="model")
    project = relationship("Project", back_populates="models")


class ModelVersion(Base):
    __tablename__ = "model_versions"

    id = Column(String, primary_key=True, default=generate_uuid)
    model_id = Column(String, ForeignKey("models.id"), nullable=False)
    version_number = Column(Integer, nullable=False)
    version_tag = Column(String, nullable=False)  # v1, v2, v2_unlearned, etc.
    parent_version_id = Column(String, ForeignKey("model_versions.id"), nullable=True)
    storage_path = Column(String, default="")
    model_hash = Column(String, default="")
    status = Column(String, default="active")
    metadata_json = Column(JSON, default=dict)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    model = relationship("Model", back_populates="versions")
    parent_version = relationship("ModelVersion", remote_side=[id])


class Target(Base):
    __tablename__ = "targets"

    id = Column(String, primary_key=True, default=generate_uuid)
    model_version_id = Column(String, ForeignKey("model_versions.id"), nullable=False)
    capability = Column(String, nullable=False)  # e.g., "python"
    description = Column(Text, default="")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Dataset(Base):
    __tablename__ = "datasets"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    dataset_type = Column(String, nullable=False)  # forget, retain, evaluate
    language = Column(String, default="")
    description = Column(Text, default="")
    hash = Column(String, default="")
    sample_count = Column(Integer, default=0)
    storage_path = Column(String, default="")
    metadata_json = Column(JSON, default=dict)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class UnlearningJob(Base):
    __tablename__ = "unlearning_jobs"

    id = Column(String, primary_key=True, default=generate_uuid)
    model_id = Column(String, ForeignKey("models.id"), nullable=False)
    source_version_id = Column(String, ForeignKey("model_versions.id"), nullable=False)
    result_version_id = Column(String, ForeignKey("model_versions.id"), nullable=True)
    target_capability = Column(String, nullable=False)
    method = Column(String, nullable=False)
    config_json = Column(JSON, default=dict)
    status = Column(SAEnum(JobStatus), default=JobStatus.PENDING)
    progress = Column(Float, default=0.0)
    current_step = Column(Integer, default=0)
    total_steps = Column(Integer, default=0)
    loss = Column(Float, default=0.0)
    forget_metric = Column(Float, default=0.0)
    retain_metric = Column(Float, default=0.0)
    gpu_utilization = Column(Float, default=0.0)
    gpu_memory_used = Column(Float, default=0.0)
    logs = Column(Text, default="")
    training_log = Column(JSON, default=dict)
    error = Column(Text, nullable=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class EvaluationRun(Base):
    __tablename__ = "evaluation_runs"

    id = Column(String, primary_key=True, default=generate_uuid)
    model_id = Column(String, ForeignKey("models.id"), nullable=False)
    model_version_id = Column(String, ForeignKey("model_versions.id"), nullable=False)
    eval_type = Column(String, nullable=False)  # baseline, post_unlearning
    status = Column(SAEnum(EvalStatus), default=EvalStatus.PENDING)
    metrics = Column(JSON, default=dict)
    overall_score = Column(Float, default=0.0)
    duration_seconds = Column(Float, default=0.0)
    hardware_info = Column(JSON, default=dict)
    software_versions = Column(JSON, default=dict)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Metric(Base):
    __tablename__ = "metrics"

    id = Column(String, primary_key=True, default=generate_uuid)
    evaluation_run_id = Column(String, ForeignKey("evaluation_runs.id"), nullable=False)
    capability = Column(String, nullable=False)
    score = Column(Float, default=0.0)
    probe_count = Column(Integer, default=0)
    matched_count = Column(Integer, default=0)
    evidence = Column(JSON, default=dict)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Artifact(Base):
    __tablename__ = "artifacts"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    artifact_type = Column(String, nullable=False)  # model, report, dataset, etc.
    storage_path = Column(String, nullable=False)
    size_bytes = Column(Integer, default=0)
    hash = Column(String, default="")
    metadata_json = Column(JSON, default=dict)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(String, primary_key=True, default=generate_uuid)
    event_type = Column(String, nullable=False)
    entity_type = Column(String, nullable=False)
    entity_id = Column(String, nullable=False)
    details = Column(JSON, default=dict)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


# =============================================================================
# Database Session
# =============================================================================

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "sqlite:///unlearn_studio.db"
)

engine = create_engine(DATABASE_URL, echo=False)


def get_db():
    """Dependency for getting database sessions."""
    from sqlalchemy.orm import Session as SessionType
    db = SessionType(engine)
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initialize database tables."""
    Base.metadata.create_all(bind=engine)


def seed_db():
    """Seed database with initial data."""
    from sqlalchemy.orm import Session
    with Session(engine) as session:
        # Create default project
        existing = session.query(Project).filter(Project.name == "Default Project").first()
        if not existing:
            project = Project(
                name="Default Project",
                description="Default project for unlearning experiments",
            )
            session.add(project)
            session.commit()
