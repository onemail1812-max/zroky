from __future__ import annotations
from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, String, Text, Integer
from app.database import Base
from app.db_types import SafeJSON

class TriagedThread(Base):
    """
    Consolidated thread view for Aaliyah's Inbox.
    Represents an entire conversation thread normalized across providers.
    """
    __tablename__ = "triaged_threads"

    id = Column(String, primary_key=True, index=True)
    workspace_id = Column(String, index=True, nullable=False)
    provider = Column(String, index=True, nullable=False) # google | microsoft
    external_thread_id = Column(String, index=True, nullable=False) # Provider's thread_id
    
    sender = Column(String, nullable=True) # Usually the sender of the latest message
    subject = Column(String, nullable=True)
    snippet = Column(Text, nullable=True)
    
    last_received_at = Column(DateTime, nullable=True, index=True)
    last_sent_at = Column(DateTime, nullable=True, index=True)
    followup_due_at = Column(DateTime, nullable=True, index=True)
    
    # Aggregated state across the thread
    category = Column(String, nullable=False, index=True, default="inbox")
    priority = Column(String, nullable=False, index=True, default="Medium")
    
    is_noise = Column(Boolean, nullable=False, default=False)
    is_read = Column(Boolean, nullable=False, default=False)
    
    requires_approval = Column(Boolean, default=False, nullable=False)
    approval_reason = Column(String, nullable=True)
    awaiting_reply = Column(Boolean, default=False, nullable=False)
    has_draft = Column(Boolean, default=False, nullable=False)
    
    message_count = Column(Integer, default=1, nullable=False)
    
    confidence = Column(String, nullable=True)
    reasoning = Column(Text, nullable=True)
    
    draft_json = Column(SafeJSON(), nullable=True)
    metadata_json = Column(SafeJSON(), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<TriagedThread {self.id} subject={self.subject} provider={self.provider}>"
