"""
NullMind - FastAPI Backend
Main application entry point.
"""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from services.api.routes import models, jobs, evaluations, projects


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    # Startup
    print("NullMind API starting...")
    os.makedirs("storage/models", exist_ok=True)
    os.makedirs("storage/datasets", exist_ok=True)
    os.makedirs("storage/artifacts", exist_ok=True)
    os.makedirs("storage/evaluations", exist_ok=True)
    os.makedirs("storage/reports", exist_ok=True)
    yield
    # Shutdown
    print("NullMind API shutting down...")


app = FastAPI(
    title="NullMind",
    description="AI Model Unlearning Platform - API",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(projects.router, prefix="/api/v1/projects", tags=["projects"])
app.include_router(models.router, prefix="/api/v1/models", tags=["models"])
app.include_router(jobs.router, prefix="/api/v1/jobs", tags=["jobs"])
app.include_router(evaluations.router, prefix="/api/v1/evaluations", tags=["evaluations"])


@app.get("/api/v1/health")
def health_check():
    return {"status": "healthy", "service": "nullmind-api"}
