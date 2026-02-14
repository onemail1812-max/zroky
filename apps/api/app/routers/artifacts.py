"""Artifacts router."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import uuid
import json

from app.database import get_db
from app.dependencies import get_current_context, CurrentContext
from app.models.artifact import Artifact
from app.schemas.artifacts import ArtifactCreate, ArtifactUpdate, ArtifactResponse

router = APIRouter(prefix="/artifacts", tags=["artifacts"])


@router.get("", response_model=list[ArtifactResponse])
async def list_artifacts(
    employee_id: str = None,
    db: Session = Depends(get_db),
    context: CurrentContext = Depends(get_current_context),
):
    """List artifacts."""
    query = db.query(Artifact).filter(Artifact.workspace_id == context.workspace_id)
    if employee_id:
        query = query.filter(Artifact.employee_id == employee_id)
    return query.order_by(Artifact.created_at.desc()).all()


@router.post("", response_model=ArtifactResponse)
async def create_artifact(
    artifact_create: ArtifactCreate,
    db: Session = Depends(get_db),
    context: CurrentContext = Depends(get_current_context),
):
    """Create artifact."""
    artifact = Artifact(
        id=str(uuid.uuid4()),
        workspace_id=context.workspace_id,
        employee_id=artifact_create.employee_id,
        type=artifact_create.type,
        title=artifact_create.title,
        content_json=json.dumps(artifact_create.content_json),
    )
    db.add(artifact)
    db.commit()
    db.refresh(artifact)

    # Log audit
    from app.services.audit_log_service import AuditLogService, AuditAction, AuditEntityType
    AuditLogService.log_creation(
        db=db,
        workspace_id=context.workspace_id,
        user_id=context.user_id,
        entity_type=AuditEntityType.ARTIFACT,
        entity_id=artifact.id,
        initial_values={"type": artifact.type, "title": artifact.title},
    )

    return artifact


@router.put("/{artifact_id}", response_model=ArtifactResponse)
async def update_artifact(
    artifact_id: str,
    artifact_update: ArtifactUpdate,
    db: Session = Depends(get_db),
    context: CurrentContext = Depends(get_current_context),
):
    """Update artifact."""
    artifact = (
        db.query(Artifact)
        .filter(Artifact.id == artifact_id, Artifact.workspace_id == context.workspace_id)
        .first()
    )
    if not artifact:
        raise HTTPException(status_code=404, detail="Artifact not found")

    old_values = {"title": artifact.title, "status": artifact.status}

    if artifact_update.title is not None:
        artifact.title = artifact_update.title
    if artifact_update.content_json is not None:
        artifact.content_json = json.dumps(artifact_update.content_json)
    if artifact_update.status is not None:
        artifact.status = artifact_update.status

    db.commit()
    db.refresh(artifact)

    # Log audit
    from app.services.audit_log_service import AuditLogService, AuditEntityType
    AuditLogService.log_update(
        db=db,
        workspace_id=context.workspace_id,
        user_id=context.user_id,
        entity_type=AuditEntityType.ARTIFACT,
        entity_id=artifact.id,
        old_values=old_values,
        new_values={"title": artifact.title, "status": artifact.status},
    )

    return artifact
