"""Calls router."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timezone
import uuid
import json

from app.database import get_db
from app.dependencies import get_current_context, CurrentContext
from app.models.call_session import CallSession, CallStatus, RecordingStatus, CallDirection
from app.models.artifact import Artifact, ArtifactType, ArtifactStatus
from app.schemas.calls import CallSessionCreate, CallSessionWebhook, CallSessionResponse
from app.services.audit_log_service import AuditLogService, AuditAction, AuditEntityType

router = APIRouter(prefix="/calls", tags=["calls"])


@router.get("", response_model=list[CallSessionResponse])
async def list_calls(
    employee_id: str = None,
    db: Session = Depends(get_db),
    context: CurrentContext = Depends(get_current_context),
):
    """List call sessions."""
    query = db.query(CallSession).filter(CallSession.workspace_id == context.workspace_id)
    if employee_id:
        query = query.filter(CallSession.employee_id == employee_id)
    return query.order_by(CallSession.created_at.desc()).all()


@router.post("", response_model=CallSessionResponse)
async def create_call(
    call_create: CallSessionCreate,
    db: Session = Depends(get_db),
    context: CurrentContext = Depends(get_current_context),
):
    """Create call session (stub - no actual call placed)."""
    call_session = CallSession(
        id=str(uuid.uuid4()),
        workspace_id=context.workspace_id,
        employee_id=call_create.employee_id,
        provider="TWILIO",  # Stub
        direction=call_create.direction,
        status=CallStatus.CREATED,
        to_number=call_create.to_number,
        from_number=call_create.from_number,
    )
    db.add(call_session)
    db.commit()
    db.refresh(call_session)

    # Log audit
    AuditLogService.log_creation(
        db=db,
        workspace_id=context.workspace_id,
        user_id=context.user_id,
        entity_type=AuditEntityType.ARTIFACT,
        entity_id=call_session.id,
        initial_values={"direction": call_session.direction},
    )

    return call_session


@router.post("/{call_id}/webhook")
async def call_webhook(
    call_id: str,
    webhook_data: CallSessionWebhook,
    db: Session = Depends(get_db),
    context: CurrentContext = Depends(get_current_context),
):
    """Webhook endpoint for call status updates (stub)."""
    call_session = (
        db.query(CallSession)
        .filter(CallSession.id == call_id, CallSession.workspace_id == context.workspace_id)
        .first()
    )
    if not call_session:
        raise HTTPException(status_code=404, detail="Call not found")

    old_status = call_session.status
    call_session.status = webhook_data.status
    if webhook_data.recording_provider_url:
        call_session.recording_provider_url = webhook_data.recording_provider_url
        call_session.recording_status = RecordingStatus.UPLOADED

    if call_session.status == CallStatus.ENDED:
        call_session.ended_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(call_session)

    # Log audit
    AuditLogService.log_status_change(
        db=db,
        workspace_id=context.workspace_id,
        user_id=context.user_id,
        entity_type=AuditEntityType.ARTIFACT,
        entity_id=call_session.id,
        old_status=old_status,
        new_status=webhook_data.status,
    )

    return {"message": "Call status updated"}


@router.post("/{call_id}/upload-to-drive")
async def upload_call_to_drive(
    call_id: str,
    db: Session = Depends(get_db),
    context: CurrentContext = Depends(get_current_context),
):
    """Request call recording upload to Google Drive (stub)."""
    call_session = (
        db.query(CallSession)
        .filter(CallSession.id == call_id, CallSession.workspace_id == context.workspace_id)
        .first()
    )
    if not call_session:
        raise HTTPException(status_code=404, detail="Call not found")

    # Stub: pretend upload happens
    call_session.recording_drive_file_id = f"file_{call_id}"
    call_session.recording_drive_link = f"https://drive.google.com/file/d/file_{call_id}/view"
    db.commit()

    # Log audit
    AuditLogService.log_action(
        db=db,
        workspace_id=context.workspace_id,
        user_id=context.user_id,
        action=AuditAction.DRIVE_UPLOAD,
        entity_type=AuditEntityType.ARTIFACT,
        entity_id=call_session.id,
    )

    return {"message": "Upload to Drive initiated", "drive_link": call_session.recording_drive_link}


@router.post("/{call_id}/generate-summary")
async def generate_call_summary(
    call_id: str,
    db: Session = Depends(get_db),
    context: CurrentContext = Depends(get_current_context),
):
    """Generate call summary artifact (stub)."""
    call_session = (
        db.query(CallSession)
        .filter(CallSession.id == call_id, CallSession.workspace_id == context.workspace_id)
        .first()
    )
    if not call_session:
        raise HTTPException(status_code=404, detail="Call not found")

    # Create artifact for call summary
    artifact = Artifact(
        id=str(uuid.uuid4()),
        workspace_id=context.workspace_id,
        employee_id=call_session.employee_id,
        thread_id=None,
        type=ArtifactType.CALL_SUMMARY,
        status=ArtifactStatus.DRAFT,
        title=f"Call Summary - {call_session.to_number}",
        content_json=json.dumps(
            {
                "call_id": call_session.id,
                "duration": "5 minutes",
                "summary": "[AI-generated summary placeholder]",
            }
        ),
    )
    db.add(artifact)
    db.commit()
    db.refresh(artifact)

    # Log audit
    AuditLogService.log_creation(
        db=db,
        workspace_id=context.workspace_id,
        user_id=context.user_id,
        entity_type=AuditEntityType.ARTIFACT,
        entity_id=artifact.id,
        initial_values={"type": "CALL_SUMMARY", "call_id": call_id},
    )

    return {"artifact_id": artifact.id, "type": "CALL_SUMMARY"}
