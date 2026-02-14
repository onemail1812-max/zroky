"""Schedules router."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime
import uuid

from app.database import get_db
from app.dependencies import get_current_context, CurrentContext
from app.models.schedule import Schedule, ScheduleStatus
from app.models.artifact import Artifact
from app.schemas.schedules import ScheduleCreate, ScheduleResponse

router = APIRouter(prefix="/schedules", tags=["schedules"])


@router.get("", response_model=list[ScheduleResponse])
async def list_schedules(
    artifact_id: str | None = None,
    status: ScheduleStatus | None = None,
    from_dt: datetime | None = Query(default=None, description="Filter: scheduled_for >= from_dt"),
    to_dt: datetime | None = Query(default=None, description="Filter: scheduled_for <= to_dt"),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    context: CurrentContext = Depends(get_current_context),
):
    """
    List schedules for the active workspace.

    Production-safe:
    - Workspace-scoped always
    - Optional filters
    - Pagination
    """
    q = db.query(Schedule).filter(Schedule.workspace_id == context.workspace_id)

    if artifact_id:
        q = q.filter(Schedule.artifact_id == artifact_id)

    if status:
        q = q.filter(Schedule.status == status)

    if from_dt:
        q = q.filter(Schedule.scheduled_for >= from_dt)

    if to_dt:
        q = q.filter(Schedule.scheduled_for <= to_dt)

    return (
        q.order_by(Schedule.scheduled_for.asc())
        .offset(offset)
        .limit(limit)
        .all()
    )


@router.post("", response_model=ScheduleResponse)
async def create_schedule(
    schedule_create: ScheduleCreate,
    db: Session = Depends(get_db),
    context: CurrentContext = Depends(get_current_context),
):
    """Create schedule for artifact."""
    artifact = (
        db.query(Artifact)
        .filter(
            Artifact.id == schedule_create.artifact_id,
            Artifact.workspace_id == context.workspace_id,
        )
        .first()
    )
    if not artifact:
        raise HTTPException(status_code=404, detail="Artifact not found")

    schedule = Schedule(
        id=str(uuid.uuid4()),
        workspace_id=context.workspace_id,
        artifact_id=schedule_create.artifact_id,
        scheduled_for=schedule_create.scheduled_for,
        status=ScheduleStatus.SCHEDULED,
    )
    db.add(schedule)
    db.commit()
    db.refresh(schedule)

    # Log audit (existing pattern)
    from app.services.audit_log_service import AuditLogService, AuditAction, AuditEntityType

    AuditLogService.log_action(
        db=db,
        workspace_id=context.workspace_id,
        user_id=context.user_id,
        action=AuditAction.CREATE,
        entity_type=AuditEntityType.ARTIFACT,
        entity_id=schedule.artifact_id,
        changes={"scheduled_for": schedule.scheduled_for.isoformat()},
    )

    return schedule
