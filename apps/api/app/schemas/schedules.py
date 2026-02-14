"""Schedule schemas."""
from typing import Optional
from pydantic import BaseModel
from datetime import datetime


class ScheduleCreate(BaseModel):
    """Create schedule."""

    artifact_id: str
    scheduled_for: datetime


class ScheduleResponse(BaseModel):
    """Schedule response."""

    id: str
    workspace_id: str
    artifact_id: str
    scheduled_for: datetime
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
