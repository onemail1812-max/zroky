"""Workspace model."""
from sqlalchemy import Column, String, DateTime
from datetime import datetime

from app.database import Base
from app.db_types import SafeJSON


class Workspace(Base):
    """Workspace model."""

    __tablename__ = "workspaces"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    slug = Column(String, unique=True, index=True, nullable=False)
    description = Column(String)
    owner_id = Column(String, index=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    settings_json = Column(SafeJSON(), nullable=True)
    style_profile_json = Column(SafeJSON(), nullable=True)
    onboarding_status = Column(String, default="pending", nullable=False)

    def __repr__(self) -> str:
        return f"<Workspace(id={self.id}, name={self.name})>"
