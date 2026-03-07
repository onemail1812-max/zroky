"""Templates for email drafting."""
from __future__ import annotations
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, DateTime
from app.database import Base

class DraftTemplate(Base):
    __tablename__ = "draft_templates"
    
    id = Column(String, primary_key=True, index=True)
    workspace_id = Column(String, index=True, nullable=False)
    name = Column(String, nullable=False)
    subject = Column(String, nullable=True) # Optional default subject
    body = Column(Text, nullable=False)     # Support for {{variables}}?
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    def __repr__(self) -> str:
        return f"<DraftTemplate(name={self.name})>"
