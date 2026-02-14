"""Action schemas."""
from typing import Optional
from pydantic import BaseModel
from datetime import datetime


class ActionCreate(BaseModel):
    """Create action."""

    employee_id: str
    type: str
    risk_level: str
    target_type: Optional[str] = None
    target_id: Optional[str] = None
    input_json: Optional[dict] = None


class ActionTransition(BaseModel):
    """Action state transition."""

    new_state: str


class ActionResponse(BaseModel):
    """Action response."""

    id: str
    workspace_id: str
    employee_id: str
    type: str
    risk_level: str
    state: str
    target_type: Optional[str]
    target_id: Optional[str]
    input_json: Optional[dict]
    result_json: Optional[dict]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
