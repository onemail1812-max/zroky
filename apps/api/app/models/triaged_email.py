"""Normalized and triaged inbox records for Inbox Zero view."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, String, Text

from app.database import Base
from app.db_types import SafeJSON


class TriagedEmail(Base):
    __tablename__ = "triaged_emails"

    id = Column(String, primary_key=True, index=True)
    workspace_id = Column(String, index=True, nullable=False)
    provider = Column(String, index=True, nullable=False)
    external_message_id = Column(String, index=True, nullable=False)
    thread_id = Column(String, index=True, nullable=True)
    sender = Column(String, nullable=True)
    subject = Column(String, nullable=True)
    snippet = Column(Text, nullable=False, default="")
    received_at = Column(DateTime, nullable=True, index=True)
    category = Column(String, nullable=False, index=True)
    priority = Column(String, nullable=False, index=True)
    is_noise = Column(Boolean, nullable=False, default=False)
    is_read = Column(Boolean, nullable=False, default=False)
    confidence = Column(String, nullable=True)
    reasoning = Column(Text, nullable=True)
    metadata_json = Column(SafeJSON(), nullable=True)
    
    # New Workflow Fields
    requires_approval = Column(Boolean, default=False, nullable=False)
    approval_reason = Column(String, nullable=True)
    awaiting_reply = Column(Boolean, default=False, nullable=False)
    last_outbound_at = Column(DateTime, nullable=True)
    followup_due_at = Column(DateTime, nullable=True)
    followup_snoozed_until = Column(DateTime, nullable=True)
    
    # Restore Support
    previous_category = Column(String, nullable=True)
    
    # Priority & Approvals Support
    deadline_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
