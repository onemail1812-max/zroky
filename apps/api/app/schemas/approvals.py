"""Approval schemas."""
from typing import Optional
from pydantic import BaseModel
from datetime import datetime


class ApprovalDecisionRequest(BaseModel):
    """Approve or reject action."""

    decision: str  # APPROVED or REJECTED
    reason: Optional[str] = None


class ApprovalResponse(BaseModel):
    """Approval response."""

    id: str
    workspace_id: str
    action_id: str
    requested_by_user_id: str
    decided_by_user_id: Optional[str]
    decision: str
    reason: Optional[str]
    created_at: datetime
    decided_at: Optional[datetime]

    class Config:
        from_attributes = True
