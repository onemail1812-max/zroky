"""Integrations router."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import uuid
import json

from app.database import get_db
from app.dependencies import get_current_context, CurrentContext, enforce_admin
from app.models.integration import Integration, IntegrationStatus
from app.schemas.integrations import IntegrationConnect, IntegrationConfigure, IntegrationResponse

router = APIRouter(prefix="/integrations", tags=["integrations"])


@router.get("", response_model=list[IntegrationResponse])
async def list_integrations(
    db: Session = Depends(get_db),
    context: CurrentContext = Depends(get_current_context),
):
    """List integrations."""
    integrations = db.query(Integration).filter(Integration.workspace_id == context.workspace_id).all()
    return integrations


@router.post("/connect", response_model=IntegrationResponse)
async def connect_integration(
    integration_connect: IntegrationConnect,
    db: Session = Depends(get_db),
    context: CurrentContext = Depends(enforce_admin),
):
    """Connect to a provider (stub - no real OAuth)."""
    # Check if already connected
    existing = (
        db.query(Integration)
        .filter(
            Integration.workspace_id == context.workspace_id,
            Integration.provider == integration_connect.provider,
        )
        .first()
    )
    if existing:
        existing.status = IntegrationStatus.CONNECTED
        db.commit()
        db.refresh(existing)
        return existing

    integration = Integration(
        id=str(uuid.uuid4()),
        workspace_id=context.workspace_id,
        provider=integration_connect.provider,
        status=IntegrationStatus.CONNECTED,  # Stub: pretend we're connected
        scopes_json=json.dumps([]),
    )
    db.add(integration)
    db.commit()
    db.refresh(integration)

    # Log audit
    from app.services.audit_log_service import AuditLogService, AuditEntityType
    AuditLogService.log_creation(
        db=db,
        workspace_id=context.workspace_id,
        user_id=context.user_id,
        entity_type=AuditEntityType.ARTIFACT,
        entity_id=integration.id,
        initial_values={"provider": integration.provider},
    )

    return integration


@router.post("/{integration_id}/configure", response_model=IntegrationResponse)
async def configure_integration(
    integration_id: str,
    config_request: IntegrationConfigure,
    db: Session = Depends(get_db),
    context: CurrentContext = Depends(enforce_admin),
):
    """Configure integration settings."""
    integration = (
        db.query(Integration)
        .filter(Integration.id == integration_id, Integration.workspace_id == context.workspace_id)
        .first()
    )
    if not integration:
        raise HTTPException(status_code=404, detail="Integration not found")

    integration.config_json = json.dumps(config_request.config_json)
    db.commit()
    db.refresh(integration)

    # Log audit
    from app.services.audit_log_service import AuditLogService, AuditEntityType
    AuditLogService.log_update(
        db=db,
        workspace_id=context.workspace_id,
        user_id=context.user_id,
        entity_type=AuditEntityType.ARTIFACT,
        entity_id=integration.id,
        old_values={},
        new_values={"config": "updated"},
    )

    return integration
