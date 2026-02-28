"""SendToken model for persistent action idempotency in v2.1."""
from sqlalchemy import Column, String, DateTime, Index
from datetime import datetime
from app.database import Base

class SendToken(Base):
    """
    Stores idempotency tokens for outbound actions to prevent duplicates
    across distributed workers or server restarts.
    """
    __tablename__ = "send_tokens"

    # Hashed token (e.g., md5(workspace_id + thread_id + body_content))
    token_hash = Column(String, primary_key=True, index=True)
    
    workspace_id = Column(String, index=True, nullable=False)
    entity_id = Column(String, index=True, nullable=False) # e.g., email_id or thread_id
    
    action_type = Column(String, nullable=False) # e.g., "SEND_REPLY"
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=False)

    __table_args__ = (
        Index("ix_send_tokens_lookup", "workspace_id", "entity_id", "token_hash"),
    )

    def __repr__(self) -> str:
        return f"<SendToken(token_hash={self.token_hash[:8]}, entity_id={self.entity_id})>"
