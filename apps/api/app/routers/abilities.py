"""Abilities router."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import uuid
import json

from app.database import get_db
from app.dependencies import get_current_context, CurrentContext
from app.models.ability import Ability
from app.schemas.abilities import AbilityUpdate, AbilityResponse

router = APIRouter(prefix="/abilities", tags=["abilities"])


@router.get("/{employee_id}", response_model=AbilityResponse)
async def get_ability(
    employee_id: str,
    db: Session = Depends(get_db),
    context: CurrentContext = Depends(get_current_context),
):
    """Get ability for employee."""
    ability = (
        db.query(Ability)
        .filter(Ability.workspace_id == context.workspace_id, Ability.employee_id == employee_id)
        .first()
    )
    if not ability:
        # Create default ability
        ability = Ability(
            id=str(uuid.uuid4()),
            workspace_id=context.workspace_id,
            employee_id=employee_id,
            toggles_json=json.dumps({}),
        )
        db.add(ability)
        db.commit()
        db.refresh(ability)
    return ability


@router.put("/{employee_id}", response_model=AbilityResponse)
async def update_ability(
    employee_id: str,
    ability_update: AbilityUpdate,
    db: Session = Depends(get_db),
    context: CurrentContext = Depends(get_current_context),
):
    """Update ability."""
    ability = (
        db.query(Ability)
        .filter(Ability.workspace_id == context.workspace_id, Ability.employee_id == employee_id)
        .first()
    )
    if not ability:
        ability = Ability(
            id=str(uuid.uuid4()),
            workspace_id=context.workspace_id,
            employee_id=employee_id,
            toggles_json=json.dumps(ability_update.toggles_json),
            labels_json=json.dumps(ability_update.labels_json) if ability_update.labels_json else None,
            tool_permissions_json=json.dumps(ability_update.tool_permissions_json)
            if ability_update.tool_permissions_json
            else None,
        )
        db.add(ability)
    else:
        ability.toggles_json = json.dumps(ability_update.toggles_json)
        if ability_update.labels_json:
            ability.labels_json = json.dumps(ability_update.labels_json)
        if ability_update.tool_permissions_json:
            ability.tool_permissions_json = json.dumps(ability_update.tool_permissions_json)

    db.commit()
    db.refresh(ability)

    # Log audit
    from app.services.audit_log_service import AuditLogService, AuditEntityType
    AuditLogService.log_update(
        db=db,
        workspace_id=context.workspace_id,
        user_id=context.user_id,
        entity_type=AuditEntityType.ARTIFACT,
        entity_id=ability.id,
        old_values={"abilities": "updated"},
        new_values={"abilities": "updated"},
    )

    return ability
