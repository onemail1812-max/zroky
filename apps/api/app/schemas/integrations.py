"""Integration schemas."""
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime


class IntegrationConnect(BaseModel):
    """Connect integration."""

    provider: str


class IntegrationConfigure(BaseModel):
    """Configure integration."""

    config_json: dict


class IntegrationResponse(BaseModel):
    """Integration response."""

    id: str
    workspace_id: str
    provider: str
    status: str
    scopes_json: Optional[List[str]]
    config_json: Optional[dict]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
