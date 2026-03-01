"""TriagedEmail model - persistent storage for AI-categorized emails."""
from sqlalchemy import Column, String, DateTime, Boolean, Float, Text, UniqueConstraint
from datetime import datetime
from app.database import Base
from app.db_types import SafeJSON

class TriagedEmail(Base):
    __tablename__ = "triaged_emails"
    __table_args__ = (
        UniqueConstraint('workspace_id', 'external_message_id', name='uix_workspace_external_msg'),
    )

    id = Column(String, primary_key=True, index=True)
    workspace_id = Column(String, index=True, nullable=False)
    provider = Column(String, nullable=False)
    external_message_id = Column(String, index=True, nullable=False)
    thread_id = Column(String, index=True, nullable=True)
    
    sender = Column(String, nullable=True)
    subject = Column(String, nullable=True)
    snippet = Column(Text, nullable=True)
    received_at = Column(DateTime, nullable=True)
    
    # AI Triage Data
    category = Column(String, index=True, nullable=True) # Priority, Needs Reply, etc.
    priority = Column(String, index=True, nullable=True) # High, Medium, Low
    is_noise = Column(Boolean, default=False)
    is_read = Column(Boolean, default=False)
    confidence = Column(String, nullable=True)
    reasoning = Column(Text, nullable=True)
    
    # Workflow Status
    requires_approval = Column(Boolean, default=False)
    approval_reason = Column(Text, nullable=True)
    deadline_at = Column(DateTime, nullable=True)
    awaiting_reply = Column(Boolean, default=False)
    
    # Advanced Workflow
    needs_clarity = Column(Boolean, default=False)
    can_draft = Column(Boolean, default=False)
    
    followup_due_at = Column(DateTime, nullable=True)
    followup_snoozed_until = Column(DateTime, nullable=True)
    
    # Extensibility
    metadata_json = Column(SafeJSON(), nullable=True)
    previous_category = Column(String, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def __repr__(self) -> str:
        return f"<TriagedEmail(id={self.id}, category={self.category}, priority={self.priority})>"
