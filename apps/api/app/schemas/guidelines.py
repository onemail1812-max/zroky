
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field


class ReferencePlaybook(BaseModel):
    """Metadata-only reference playbook.

    NOTE: This is advisory only. It must not override user guidelines or approval rules.
    It is used as style/workflow reference, not for content copying.
    """

    type: Literal["video"] = "video"
    source: Literal["youtube", "vimeo", "other"]
    url: str
    title: Optional[str] = None
    notes: Optional[str] = None


class GuidelineContent(BaseModel):
    """Structured guideline content.

    This model is intentionally permissive to avoid breaking existing guideline payloads.
    It adds an optional 'reference_playbooks' field while allowing other keys.
    """

    reference_playbooks: Optional[List[ReferencePlaybook]] = Field(default=None)

    class Config:
        extra = "allow"  # Preserve existing keys like "instructions", "tone", etc.


class GuidelineUpdate(BaseModel):
    """Update guideline."""

    # Existing API sends a JSON object; now optionally includes reference_playbooks.
    content_json: Dict[str, Any]
    content_text: Optional[str] = None


class GuidelineResponse(BaseModel):
    """Guideline response."""

    id: str
    workspace_id: str
    employee_id: str
    schema_version: str
    content_json: Dict[str, Any]
    content_text: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
