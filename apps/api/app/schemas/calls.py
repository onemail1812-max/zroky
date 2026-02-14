"""Call session schemas."""
from typing import Optional
from pydantic import BaseModel
from datetime import datetime


class CallSessionCreate(BaseModel):
    """Create call session."""

    employee_id: str
    direction: str
    to_number: Optional[str] = None
    from_number: Optional[str] = None


class CallSessionWebhook(BaseModel):
    """Call webhook update."""

    status: str
    recording_provider_url: Optional[str] = None


class CallSessionResponse(BaseModel):
    """Call session response."""

    id: str
    workspace_id: str
    employee_id: str
    provider: str
    direction: str
    status: str
    from_number: Optional[str]
    to_number: Optional[str]
    started_at: Optional[datetime]
    ended_at: Optional[datetime]
    recording_drive_link: Optional[str]
    recording_status: str
    created_at: datetime

    class Config:
        from_attributes = True
