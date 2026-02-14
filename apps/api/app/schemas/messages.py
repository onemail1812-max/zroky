"""Message schemas."""
from typing import Optional, Any
from pydantic import BaseModel, field_validator
from datetime import datetime
import json


class MessageCreate(BaseModel):
    """Create message."""

    content_text: str
    content_json: Optional[dict] = None


class MessageResponse(BaseModel):
    """Message response."""

    id: str
    thread_id: str
    employee_id: str
    author_type: str
    author_user_id: Optional[str]
    content_text: str
    content_json: Optional[dict]
    created_at: datetime

    @field_validator('content_json', mode='before')
    @classmethod
    def parse_content_json(cls, v: Any) -> Optional[dict]:
        """Parse content_json from string if needed."""
        if v is None:
            return None
        if isinstance(v, dict):
            return v
        if isinstance(v, str):
            try:
                return json.loads(v)
            except (json.JSONDecodeError, ValueError):
                return None
        return None

    class Config:
        from_attributes = True
