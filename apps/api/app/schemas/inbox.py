from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class InboxThreadResponse(BaseModel):
    id: str
    thread_id: str
    provider: str
    sender: str
    subject: str
    snippet: str
    received_at: Optional[datetime]
    category: str
    priority: str
    is_noise: bool
    is_read: bool
    confidence: Optional[str]
    reasoning: Optional[str]
    requires_approval: bool
    approval_reason: Optional[str] = None
    deadline_at: Optional[datetime] = None
    awaiting_reply: bool
    draft_preview: Optional[str] = None
    draft: Optional[dict] = None


class InboxThreadsListResponse(BaseModel):
    items: List[InboxThreadResponse]
    count: int


class InboxCountsResponse(BaseModel):
    by_category: dict[str, int]
    by_priority: dict[str, int]
    total_unread: int


class ProviderTotalsResponse(BaseModel):
    google: int
    microsoft: int
    total: int


class SnoozeRequest(BaseModel):
    days: int
    hours: int = 0


class MoveRequest(BaseModel):
    category: str


class UpdateDraftRequest(BaseModel):
    to: Optional[str] = None
    subject: Optional[str] = None
    body: str
    attachments: Optional[List[dict]] = None
