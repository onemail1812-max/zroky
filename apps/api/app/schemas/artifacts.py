"""Artifact schemas."""
from typing import Optional
from pydantic import BaseModel
from datetime import datetime


class ArtifactCreate(BaseModel):
    """Create artifact."""

    employee_id: str
    type: str
    title: Optional[str] = None
    content_json: dict


class ArtifactUpdate(BaseModel):
    """Update artifact."""

    title: Optional[str] = None
    content_json: Optional[dict] = None
    status: Optional[str] = None


class ArtifactResponse(BaseModel):
    """Artifact response."""

    id: str
    workspace_id: str
    employee_id: str
    thread_id: Optional[str]
    type: str
    status: str
    title: Optional[str]
    content_json: dict
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
