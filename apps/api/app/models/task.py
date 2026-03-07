"""Task model."""
from sqlalchemy import Column, String, DateTime, Text
from datetime import datetime, timezone

from app.database import Base


class Task(Base):
    """Task model."""

    __tablename__ = "tasks"

    id = Column(String, primary_key=True, index=True)
    workspace_id = Column(String, index=True, nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text)
    status = Column(String, default="open", nullable=False)
    assigned_to = Column(String, index=True)
    created_by = Column(String, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    def __repr__(self) -> str:
        return f"<Task(id={self.id}, title={self.title})>"
