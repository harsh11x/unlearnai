"""
Unlearn Studio - Projects API Routes
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from services.api.database import get_db, Project

router = APIRouter()


class ProjectCreate(BaseModel):
    name: str
    description: str = ""


class ProjectResponse(BaseModel):
    id: str
    name: str
    description: str
    created_at: str


@router.get("/")
def list_projects(db: Session = Depends(get_db)):
    projects = db.query(Project).all()
    return [
        {
            "id": p.id,
            "name": p.name,
            "description": p.description,
            "created_at": p.created_at.isoformat() if p.created_at else "",
        }
        for p in projects
    ]


@router.post("/")
def create_project(data: ProjectCreate, db: Session = Depends(get_db)):
    project = Project(name=data.name, description=data.description)
    db.add(project)
    db.commit()
    db.refresh(project)
    return {"id": project.id, "name": project.name, "description": project.description}


@router.get("/{project_id}")
def get_project(project_id: str, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    from services.api.database import Model
    models = db.query(Model).filter(Model.project_id == project_id).all()

    return {
        "id": project.id,
        "name": project.name,
        "description": project.description,
        "created_at": project.created_at.isoformat() if project.created_at else "",
        "models": [
            {
                "id": m.id,
                "name": m.name,
                "status": m.status.value if m.status else "unknown",
                "architecture": m.architecture,
                "parameter_count_formatted": m.parameter_count_formatted,
            }
            for m in models
        ],
    }
