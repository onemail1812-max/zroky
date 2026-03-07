from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Enum, Integer
from app.database import Base
from app.db_types import SafeJSON
import enum

class DraftStatus(str, enum.Enum):
    PENDING = "pending"
    PENDING_APPROVAL = "pending_approval"
    READY = "ready"
    SENT = "sent"
    FAILED = "failed"

class Draft(Base):
    """Auto-generated or Manual Draft Reply."""
    __tablename__ = "drafts"

    id = Column(String, primary_key=True, index=True)
    workspace_id = Column(String, ForeignKey("workspaces.id"), nullable=False, index=True)
    email_message_id = Column(String, index=True) # Removed FK for flexibility or fixed later
    
    # Content
    subject = Column(String, nullable=True) # Usually Re: Original Subject
    body = Column(Text, nullable=True)
    
    # Metadata
    status = Column(String, default=DraftStatus.PENDING, index=True) # pending, ready, sent
    ai_generated_reasoning = Column(String, nullable=True) # Why drafted?
    
    # New Fields
    intent = Column(String, nullable=True)
    risk_labels = Column(SafeJSON(), nullable=True)
    missing_info = Column(SafeJSON(), nullable=True)
    version = Column(Integer, default=1, nullable=False)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    def __repr__(self):
        return f"<Draft {self.id} for msg={self.email_message_id}>"
