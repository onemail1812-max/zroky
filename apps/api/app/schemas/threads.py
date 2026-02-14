"""Thread schemas."""
from typing import Optional
from pydantic import BaseModel
from datetime import datetime


class ThreadCreate(BaseModel):
    """Create thread."""

    employee_id: str
    title: Optional[str] = None


class ThreadResponse(BaseModel):
    """Thread response."""

    id: str
    workspace_id: str
    employee_id: str
    title: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
