"""Ability model - employee abilities and permissions."""
from sqlalchemy import Column, String, DateTime, Text
from datetime import datetime

from app.database import Base


class Ability(Base):
    """Employee abilities and tool permissions."""

    __tablename__ = "abilities"

    id = Column(String, primary_key=True, index=True)
    workspace_id = Column(String, index=True, nullable=False)
    employee_id = Column(String, index=True, nullable=False)
    toggles_json = Column(Text, nullable=False)  # Feature toggles (e.g. draft_emails, record_calls)
    labels_json = Column(Text, nullable=True)  # Labels taxonomy
    tool_permissions_json = Column(Text, nullable=True)  # Read/write approvals per tool
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self) -> str:
        return f"<Ability(employee_id={self.employee_id})>"
