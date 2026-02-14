"""Ability schemas."""
from typing import Optional
from pydantic import BaseModel
from datetime import datetime


class AbilityUpdate(BaseModel):
    """Update ability."""

    toggles_json: dict
    labels_json: Optional[dict] = None
    tool_permissions_json: Optional[dict] = None


class AbilityResponse(BaseModel):
    """Ability response."""

    id: str
    workspace_id: str
    employee_id: str
    toggles_json: dict
    labels_json: Optional[dict]
    tool_permissions_json: Optional[dict]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
