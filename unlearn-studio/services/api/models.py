"""
SQLAlchemy Database Models for Unlearn Studio.

These models represent the persistent state of the platform including
projects, models, versions, jobs, evaluations, and audit events.
"""

from datetime import datetime
from typing import Optional, List
from sqlalchemy import (
    create_engine, Column, Integer, String, Text, Float, Boolean,
    DateTime, ForeignKey, JSON, Enum as SQLEnum, Index
)
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.sql import func
import enum

Base = declarative_base()


class ModelStatus(str, enum.Enum):
    """Model lifecycle status."""
    UPLOADING = "uploading"
    VALIDATING = "validating"
    READY = "ready"
    UNLEARNING = "unlearning"
    EVALUATING = "evaluating"
    ERROR = "error"
    ARCHIVED = "archived"


class JobStatus(str, enum.Enum):
    """Job execution status."""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class UnlearningMethod(str, enum.Enum):
    """Supported unlearning methods."""
    GRADIENT_BASELINE = "gradient_baseline"
    RETAIN_AWARE = "retain_aware"


class Verdict(str, enum.Enum):
    """Evaluation verdict."""
    PASS = "pass"
    PASS_WITH_REVIEW = "pass_with_review"
    FAIL = "fail"


class Project(Base):
    """A project groups related models and experiments."""
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    models = relationship("Model", back_populates="project", cascade="all, delete-orphan")


class Model(Base):
    """A base model (e.g., a GPT-2 variant) uploaded to the platform."""
    __tablename__ = "models"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(SQLEnum(ModelStatus), default=ModelStatus.UPLOADING)

    # Model metadata
    architecture = Column(String(100), nullable=True)
    parameter_count = Column(Integer, nullable=True)
    model_size_bytes = Column(Integer, nullable=True)
    tokenizer_type = Column(String(100), nullable=True)
    dtype = Column(String(50), nullable=True)
    model_hash = Column(String(64), nullable=True, index=True)
    estimated_vram_gb = Column(Float, nullable=True)
    is_compatible = Column(Boolean, default=True)

    # Storage
    storage_path = Column(String(500), nullable=True)
    storage_type = Column(String(50), default="local")  # local, s3, etc.

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    project = relationship("Project", back_populates="models")
    versions = relationship("ModelVersion", back_populates="model", cascade="all, delete-orphan")
    evaluation_runs = relationship("EvaluationRun", back_populates="model", cascade="all, delete-orphan")


class ModelVersion(Base):
    """A versioned snapshot of a model, including lineage."""
    __tablename__ = "model_versions"

    id = Column(Integer, primary_key=True, index=True)
    model_id = Column(Integer, ForeignKey("models.id"), nullable=False)
    version_number = Column(Integer, nullable=False, default=1)
    parent_version_id = Column(Integer, ForeignKey("model_versions.id"), nullable=True)

    # Version metadata
    label = Column(String(255), nullable=True)  # e.g., "Python Unlearned v2"
    description = Column(Text, nullable=True)
    model_hash = Column(String(64), nullable=True)
    storage_path = Column(String(500), nullable=True)

    # Lineage
    unlearning_job_id = Column(Integer, ForeignKey("unlearning_jobs.id"), nullable=True)
    training_job_id = Column(Integer, nullable=True)

    # Stats
    parameter_count = Column(Integer, nullable=True)
    model_size_bytes = Column(Integer, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    model = relationship("Model", back_populates="versions")
    parent_version = relationship("ModelVersion", remote_side=[id], backref="child_versions")

    __table_args__ = (
        Index("ix_model_version", "model_id", "version_number", unique=True),
    )


class Target(Base):
    """A knowledge/capability target for unlearning."""
    __tablename__ = "targets"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)  # e.g., "python"
    display_name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(100), nullable=False)  # e.g., "programming"
    language = Column(String(50), nullable=True)
    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Dataset(Base):
    """A versioned dataset for probing, forgetting, or retaining."""
    __tablename__ = "datasets"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    dataset_type = Column(String(50), nullable=False)  # probe, forget, retain, evaluation
    language = Column(String(50), nullable=True)

    # Content
    data_hash = Column(String(64), nullable=True, index=True)
    version = Column(String(50), nullable=True)
    sample_count = Column(Integer, nullable=True)
    storage_path = Column(String(500), nullable=True)

    # Metadata
    categories = Column(JSON, nullable=True)  # List of categories
    metadata_json = Column(JSON, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())


class UnlearningJob(Base):
    """An unlearning job tracking the full lifecycle of an unlearning experiment."""
    __tablename__ = "unlearning_jobs"

    id = Column(Integer, primary_key=True, index=True)
    model_id = Column(Integer, ForeignKey("models.id"), nullable=False)
    source_version_id = Column(Integer, ForeignKey("model_versions.id"), nullable=False)
    target_version_id = Column(Integer, ForeignKey("model_versions.id"), nullable=True)

    # Configuration
    target_name = Column(String(100), nullable=False)  # e.g., "python"
    method = Column(SQLEnum(UnlearningMethod), nullable=False)
    config_json = Column(JSON, nullable=False)

    # Datasets
    forget_dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=True)
    retain_dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=True)
    evaluation_dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=True)

    # Status
    status = Column(SQLEnum(JobStatus), default=JobStatus.PENDING)
    progress = Column(Float, default=0.0)  # 0-100
    current_step = Column(String(100), nullable=True)

    # Metrics during training
    forget_loss = Column(Float, nullable=True)
    retain_loss = Column(Float, nullable=True)
    total_loss = Column(Float, nullable=True)

    # GPU info
    gpu_device = Column(String(50), nullable=True)
    gpu_utilization = Column(Float, nullable=True)
    gpu_memory_used_gb = Column(Float, nullable=True)
    gpu_memory_total_gb = Column(Float, nullable=True)

    # Timing
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    estimated_remaining_seconds = Column(Integer, nullable=True)

    # Error handling
    error_message = Column(Text, nullable=True)
    error_traceback = Column(Text, nullable=True)

    # Checkpoints
    checkpoint_path = Column(String(500), nullable=True)
    checkpoint_step = Column(Integer, nullable=True)

    # Audit
    created_by = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    forget_dataset = relationship("Dataset", foreign_keys=[forget_dataset_id])
    retain_dataset = relationship("Dataset", foreign_keys=[retain_dataset_id])


class EvaluationRun(Base):
    """An evaluation run comparing original vs. unlearned model."""
    __tablename__ = "evaluation_runs"

    id = Column(Integer, primary_key=True, index=True)
    model_id = Column(Integer, ForeignKey("models.id"), nullable=False)
    unlearning_job_id = Column(Integer, ForeignKey("unlearning_jobs.id"), nullable=True)
    source_version_id = Column(Integer, ForeignKey("model_versions.id"), nullable=False)
    target_version_id = Column(Integer, ForeignKey("model_versions.id"), nullable=True)

    # Evaluation suite
    suite_hash = Column(String(64), nullable=True)
    suite_version = Column(String(50), nullable=True)

    # Status
    status = Column(SQLEnum(JobStatus), default=JobStatus.PENDING)
    progress = Column(Float, default=0.0)

    # Overall results
    verdict = Column(SQLEnum(Verdict), nullable=True)
    forgetting_score = Column(Float, nullable=True)  # 0-1, higher = more forgetting
    retention_score = Column(Float, nullable=True)  # 0-1, higher = more retention
    collateral_damage = Column(Float, nullable=True)  # 0-1, lower = less damage
    robustness_score = Column(Float, nullable=True)  # 0-1, higher = more robust

    # Detailed results
    results_json = Column(JSON, nullable=True)

    # Compute info
    compute_cost_seconds = Column(Float, nullable=True)
    gpu_device = Column(String(50), nullable=True)

    # Audit
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    model = relationship("Model", back_populates="evaluation_runs")
    metrics = relationship("Metric", back_populates="evaluation_run", cascade="all, delete-orphan")


class Metric(Base):
    """Individual metric result from an evaluation."""
    __tablename__ = "metrics"

    id = Column(Integer, primary_key=True, index=True)
    evaluation_run_id = Column(Integer, ForeignKey("evaluation_runs.id"), nullable=False)
    category = Column(String(100), nullable=False)  # e.g., "python", "javascript"
    subcategory = Column(String(100), nullable=True)  # e.g., "syntax", "debugging"

    # Scores
    score_before = Column(Float, nullable=True)
    score_after = Column(Float, nullable=True)
    delta = Column(Float, nullable=True)
    delta_percent = Column(Float, nullable=True)

    # Details
    sample_count = Column(Integer, nullable=True)
    details_json = Column(JSON, nullable=True)
    probe_type = Column(String(50), nullable=True)  # direct, paraphrase, indirect, etc.

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    evaluation_run = relationship("EvaluationRun", back_populates="metrics")

    __table_args__ = (
        Index("ix_metric_category", "evaluation_run_id", "category"),
    )


class Artifact(Base):
    """An artifact (model file, dataset, report, etc.)."""
    __tablename__ = "artifacts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    artifact_type = Column(String(50), nullable=False)  # model, dataset, report, checkpoint

    # Storage
    storage_path = Column(String(500), nullable=False)
    storage_type = Column(String(50), default="local")
    file_size_bytes = Column(Integer, nullable=True)
    file_hash = Column(String(64), nullable=True)
    mime_type = Column(String(100), nullable=True)

    # Metadata
    metadata_json = Column(JSON, nullable=True)

    # Access control
    is_signed = Column(Boolean, default=False)
    expires_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_artifact_hash", "file_hash"),
    )


class AuditEvent(Base):
    """Audit log for tracking all system events."""
    __tablename__ = "audit_events"

    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(String(100), nullable=False, index=True)
    resource_type = Column(String(50), nullable=True)  # model, job, evaluation, etc.
    resource_id = Column(Integer, nullable=True)

    # Event details
    message = Column(Text, nullable=True)
    details_json = Column(JSON, nullable=True)

    # Actor
    user_id = Column(String(255), nullable=True)
    ip_address = Column(String(45), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_audit_resource", "resource_type", "resource_id"),
        Index("ix_audit_time", "created_at"),
    )


class SoftwareEnvironment(Base):
    """Records the software environment for reproducibility."""
    __tablename__ = "software_environments"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, nullable=True)  # Reference to unlearning or evaluation job

    # Python environment
    python_version = Column(String(50), nullable=True)
    pytorch_version = Column(String(50), nullable=True)
    transformers_version = Column(String(50), nullable=True)

    # GPU info
    gpu_name = Column(String(100), nullable=True)
    gpu_driver_version = Column(String(50), nullable=True)
    cuda_version = Column(String(50), nullable=True)
    gpu_memory_gb = Column(Float, nullable=True)

    # System info
    os_name = Column(String(100), nullable=True)
    hostname = Column(String(255), nullable=True)

    # Package versions
    packages_json = Column(JSON, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
