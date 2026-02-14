"""Employee schemas."""
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime


class EmployeeBase(BaseModel):
    """Base employee schema."""

    name: str
    role: str
    bio: Optional[str] = None


class EmployeeResponse(EmployeeBase):
    """Employee response."""

    id: str
    traits: Optional[List[str]] = None

    class Config:
        from_attributes = True
