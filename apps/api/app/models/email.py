from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Boolean, Integer, JSON
from app.database import Base
from app.db_types import SafeJSON

class EmailMessage(Base):
    """Normalized Email Message for both Gmail and Outlook."""
    __tablename__ = "email_messages"

    id = Column(String, primary_key=True, index=True)
    workspace_id = Column(String, ForeignKey("workspaces.id"), nullable=False, index=True)
    integration_id = Column(String, ForeignKey("integrations.id"), nullable=False, index=True)
    
    # Metadata
    provider = Column(String, nullable=False) # google | microsoft
    thread_id = Column(String, index=True) # Provider thread ID
    message_id = Column(String, unique=True, index=True) # Provider message ID
    
    # Content
    subject = Column(String, nullable=True)
    sender = Column(SafeJSON(), nullable=False) # {name, email}
    recipients = Column(SafeJSON(), nullable=True) # [{name, email}, ...]
    snippet = Column(String, nullable=True)
    body_cleaned = Column(Text, nullable=True) # Cleaned text for LLM/Reading
    
    # Timestamps
    received_at = Column(DateTime, default=datetime.utcnow, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # State
    is_read = Column(Boolean, default=False)
    labels = Column(SafeJSON(), default=list) # ["priority", "newsletter", "s:needs_reply"]

    def __repr__(self):
        return f"<EmailMessage {self.id} subject={self.subject}>"
