"""Guidelines router.

Adds support for optional Reference Playbooks (Video-based) inside guideline.content_json.

Behavioral rules (MANDATORY):
- Reference playbooks are advisory only.
- They do NOT override user guidelines or approval rules.
- They are used for style and workflow reference, NOT for content copying.
- Metadata only: NO video downloading, transcription, scraping, parsing, or analysis.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import uuid
import json
from typing import Any, Dict

from app.database import get_db
from app.dependencies import get_current_context, CurrentContext
from app.models.guideline import Guideline
from app.schemas.guidelines import GuidelineUpdate, GuidelineResponse, GuidelineContent

router = APIRouter(prefix="/guidelines", tags=["guidelines"])


def _safe_parse_json(text: str) -> Dict[str, Any]:
    """Parse stored JSON text into a dict safely."""
    try:
        data = json.loads(text) if text else {}
        return data if isinstance(data, dict) else {}
    except Exception:
        return {}


def _validate_guideline_content(content_json: Dict[str, Any]) -> None:
    """Validate structured portions of guideline content.

    This is intentionally permissive to avoid breaking existing guideline payloads.
    It enforces schema only for supported structured keys like 'reference_playbooks'.
    """
    try:
        # GuidelineContent allows extra keys; validates reference_playbooks if present.
        GuidelineContent(**content_json)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Invalid guideline content_json: {e}")


def _to_response(guideline: Guideline) -> GuidelineResponse:
    """Convert SQLAlchemy model to API response with dict content_json."""
    content_obj = (
        guideline.content_json
        if isinstance(guideline.content_json, dict)
        else _safe_parse_json(guideline.content_json)
    )
    return GuidelineResponse(
        id=guideline.id,
        workspace_id=guideline.workspace_id,
        employee_id=guideline.employee_id,
        schema_version=guideline.schema_version,
        content_json=content_obj,
        content_text=guideline.content_text,
        created_at=guideline.created_at,
        updated_at=guideline.updated_at,
    )


@router.get("/{employee_id}", response_model=GuidelineResponse)
async def get_guideline(
    employee_id: str,
    db: Session = Depends(get_db),
    context: CurrentContext = Depends(get_current_context),
):
    """Get guideline for employee."""
    guideline = (
        db.query(Guideline)
        .filter(Guideline.workspace_id == context.workspace_id, Guideline.employee_id == employee_id)
        .first()
    )
    if not guideline:
        # Create default guideline
        guideline = Guideline(
            id=str(uuid.uuid4()),
            workspace_id=context.workspace_id,
            employee_id=employee_id,
            content_json=json.dumps({}),
        )
        db.add(guideline)
        db.commit()
        db.refresh(guideline)

    return _to_response(guideline)


@router.put("/{employee_id}", response_model=GuidelineResponse)
async def update_guideline(
    employee_id: str,
    guideline_update: GuidelineUpdate,
    db: Session = Depends(get_db),
    context: CurrentContext = Depends(get_current_context),
):
    """Update guideline.

    Supports optional:
      guideline_update.content_json["reference_playbooks"] = [
        {
          "type": "video",
          "source": "youtube|vimeo|other",
          "url": "...",
          "title": "optional",
          "notes": "optional"
        }
      ]
    """
    if not isinstance(guideline_update.content_json, dict):
        raise HTTPException(status_code=422, detail="content_json must be an object")

    # Validate structured schema (reference_playbooks if present)
    _validate_guideline_content(guideline_update.content_json)

    guideline = (
        db.query(Guideline)
        .filter(Guideline.workspace_id == context.workspace_id, Guideline.employee_id == employee_id)
        .first()
    )
    if not guideline:
        guideline = Guideline(
            id=str(uuid.uuid4()),
            workspace_id=context.workspace_id,
            employee_id=employee_id,
            content_json=json.dumps(guideline_update.content_json),
            content_text=guideline_update.content_text,
        )
        db.add(guideline)
    else:
        guideline.content_json = json.dumps(guideline_update.content_json)
        # Backward-compatible: only overwrite if explicitly provided
        if guideline_update.content_text is not None:
            guideline.content_text = guideline_update.content_text

    db.commit()
    db.refresh(guideline)

    # Log audit (preserve existing behavior to avoid side-effects)
    from app.services.audit_log_service import AuditLogService, AuditEntityType

    AuditLogService.log_update(
        db=db,
        workspace_id=context.workspace_id,
        user_id=context.user_id,
        entity_type=AuditEntityType.ARTIFACT,
        entity_id=guideline.id,
        old_values={"content": "updated"},
        new_values={"content": "updated"},
    )

    return _to_response(guideline)
"""Guidelines router."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import uuid
import json

from app.database import get_db
from app.dependencies import get_current_context, CurrentContext
from app.models.guideline import Guideline
from app.schemas.guidelines import GuidelineUpdate, GuidelineResponse

router = APIRouter(prefix="/guidelines", tags=["guidelines"])


@router.get("/{employee_id}", response_model=GuidelineResponse)
async def get_guideline(
    employee_id: str,
    db: Session = Depends(get_db),
    context: CurrentContext = Depends(get_current_context),
):
    """Get guideline for employee."""
    guideline = (
        db.query(Guideline)
        .filter(Guideline.workspace_id == context.workspace_id, Guideline.employee_id == employee_id)
        .first()
    )
    if not guideline:
        # Create default guideline
        guideline = Guideline(
            id=str(uuid.uuid4()),
            workspace_id=context.workspace_id,
            employee_id=employee_id,
            content_json=json.dumps({}),
        )
        db.add(guideline)
        db.commit()
        db.refresh(guideline)
    return guideline


@router.put("/{employee_id}", response_model=GuidelineResponse)
async def update_guideline(
    employee_id: str,
    guideline_update: GuidelineUpdate,
    db: Session = Depends(get_db),
    context: CurrentContext = Depends(get_current_context),
):
    """Update guideline."""
    guideline = (
        db.query(Guideline)
        .filter(Guideline.workspace_id == context.workspace_id, Guideline.employee_id == employee_id)
        .first()
    )
    if not guideline:
        guideline = Guideline(
            id=str(uuid.uuid4()),
            workspace_id=context.workspace_id,
            employee_id=employee_id,
            content_json=json.dumps(guideline_update.content_json),
            content_text=guideline_update.content_text,
        )
        db.add(guideline)
    else:
        guideline.content_json = json.dumps(guideline_update.content_json)
        if guideline_update.content_text:
            guideline.content_text = guideline_update.content_text

    db.commit()
    db.refresh(guideline)

    # Log audit
    from app.services.audit_log_service import AuditLogService, AuditEntityType
    AuditLogService.log_update(
        db=db,
        workspace_id=context.workspace_id,
        user_id=context.user_id,
        entity_type=AuditEntityType.ARTIFACT,
        entity_id=guideline.id,
        old_values={"content": "updated"},
        new_values={"content": "updated"},
    )

    return guideline
