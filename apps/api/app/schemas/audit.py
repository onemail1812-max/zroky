"""Audit log schemas."""
from typing import Optional
from pydantic import BaseModel
from datetime import datetime


class AuditLogResponse(BaseModel):
    """Audit log response."""

    id: str
    workspace_id: str
    user_id: str
    action: str
    entity_type: str
    entity_id: Optional[str]
    changes: Optional[dict]
    metadata: Optional[dict]
    before_state: Optional[dict]
    after_state: Optional[dict]
    undo_payload: Optional[dict]
    explain_one_liner: Optional[str]
    status: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True
