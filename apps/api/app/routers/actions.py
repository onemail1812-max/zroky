"""Actions router."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timezone
import uuid
import json

from app.database import get_db
from app.dependencies import get_current_context, CurrentContext
from app.models.action import Action, ActionState, ActionType, RiskLevel
from app.models.approval import Approval, ApprovalDecision
from app.schemas.actions import ActionCreate, ActionTransition, ActionResponse
from app.services.audit_log_service import AuditLogService, AuditAction as AuditActionType, AuditEntityType

router = APIRouter(prefix="/actions", tags=["actions"])


@router.post("", response_model=ActionResponse)
async def create_action(
    action_create: ActionCreate,
    db: Session = Depends(get_db),
    context: CurrentContext = Depends(get_current_context),
):
    """Create action."""
    action = Action(
        id=str(uuid.uuid4()),
        workspace_id=context.workspace_id,
        employee_id=action_create.employee_id,
        type=action_create.type,
        risk_level=action_create.risk_level,
        target_type=action_create.target_type,
        target_id=action_create.target_id,
        input_json=json.dumps(action_create.input_json) if action_create.input_json else None,
    )
    db.add(action)
    db.commit()
    db.refresh(action)

    # Log audit
    AuditLogService.log_creation(
        db=db,
        workspace_id=context.workspace_id,
        user_id=context.user_id,
        entity_type=AuditEntityType.ARTIFACT,
        entity_id=action.id,
        initial_values={"type": action.type, "risk_level": action.risk_level},
    )

    return action


@router.post("/{action_id}/transition", response_model=ActionResponse)
async def transition_action(
    action_id: str,
    transition: ActionTransition,
    db: Session = Depends(get_db),
    context: CurrentContext = Depends(get_current_context),
):
    """Transition action state."""
    action = (
        db.query(Action)
        .filter(Action.id == action_id, Action.workspace_id == context.workspace_id)
        .first()
    )
    if not action:
        raise HTTPException(status_code=404, detail="Action not found")

    old_state = action.state
    action.state = transition.new_state
    db.commit()
    db.refresh(action)

    # Log audit
    AuditLogService.log_status_change(
        db=db,
        workspace_id=context.workspace_id,
        user_id=context.user_id,
        entity_type=AuditEntityType.ARTIFACT,
        entity_id=action.id,
        old_status=old_state,
        new_status=action.state,
    )

    return action


@router.post("/{action_id}/request-approval")
async def request_approval(
    action_id: str,
    db: Session = Depends(get_db),
    context: CurrentContext = Depends(get_current_context),
):
    """Request approval for action."""
    action = (
        db.query(Action)
        .filter(Action.id == action_id, Action.workspace_id == context.workspace_id)
        .first()
    )
    if not action:
        raise HTTPException(status_code=404, detail="Action not found")

    # Create approval record
    approval = Approval(
        id=str(uuid.uuid4()),
        workspace_id=context.workspace_id,
        action_id=action_id,
        requested_by_user_id=context.user_id,
        decision=ApprovalDecision.PENDING,
    )
    db.add(approval)

    # Update action state
    action.state = ActionState.AWAITING_APPROVAL
    db.commit()
    db.refresh(approval)

    # Log audit
    AuditLogService.log_action(
        db=db,
        workspace_id=context.workspace_id,
        user_id=context.user_id,
        action=AuditActionType.CREATE,
        entity_type=AuditEntityType.ARTIFACT,
        entity_id=approval.id,
        changes={"action_id": action_id},
    )

    return {"approval_id": approval.id, "status": "PENDING"}


@router.post("/{action_id}/approve")
async def approve_action(
    action_id: str,
    db: Session = Depends(get_db),
    context: CurrentContext = Depends(get_current_context),
):
    """Approve action."""
    action = (
        db.query(Action)
        .filter(Action.id == action_id, Action.workspace_id == context.workspace_id)
        .first()
    )
    if not action:
        raise HTTPException(status_code=404, detail="Action not found")

    approval = db.query(Approval).filter(Approval.action_id == action_id).first()
    if not approval:
        raise HTTPException(status_code=404, detail="Approval not found")

    approval.decision = ApprovalDecision.APPROVED
    approval.decided_by_user_id = context.user_id
    approval.decided_at = datetime.now(timezone.utc)
    action.state = ActionState.APPROVED

    db.commit()

    # Log audit
    AuditLogService.log_status_change(
        db=db,
        workspace_id=context.workspace_id,
        user_id=context.user_id,
        entity_type=AuditEntityType.ARTIFACT,
        entity_id=action.id,
        old_status=ActionState.AWAITING_APPROVAL,
        new_status=ActionState.APPROVED,
    )

    return {"message": "Action approved"}


@router.post("/{action_id}/reject")
async def reject_action(
    action_id: str,
    reason: str = None,
    db: Session = Depends(get_db),
    context: CurrentContext = Depends(get_current_context),
):
    """Reject action."""
    action = (
        db.query(Action)
        .filter(Action.id == action_id, Action.workspace_id == context.workspace_id)
        .first()
    )
    if not action:
        raise HTTPException(status_code=404, detail="Action not found")

    approval = db.query(Approval).filter(Approval.action_id == action_id).first()
    if not approval:
        raise HTTPException(status_code=404, detail="Approval not found")

    approval.decision = ApprovalDecision.REJECTED
    approval.decided_by_user_id = context.user_id
    approval.decided_at = datetime.now(timezone.utc)
    approval.reason = reason
    action.state = ActionState.CANCELED

    db.commit()

    # Log audit
    AuditLogService.log_status_change(
        db=db,
        workspace_id=context.workspace_id,
        user_id=context.user_id,
        entity_type=AuditEntityType.ARTIFACT,
        entity_id=action.id,
        old_status=ActionState.AWAITING_APPROVAL,
        new_status=ActionState.CANCELED,
    )

    return {"message": "Action rejected"}
