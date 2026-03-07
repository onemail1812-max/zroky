"""Artifact model - generated outputs (posts, articles, leads, etc)."""
from sqlalchemy import Column, String, DateTime, Text, Enum as SQLEnum
from datetime import datetime, timezone
import enum

from app.database import Base


class ArtifactType(str, enum.Enum):
    """Artifact types."""

    SOCIAL_POST = "SOCIAL_POST"
    ARTICLE = "ARTICLE"
    LEAD_LIST = "LEAD_LIST"
    EMAIL_DRAFT = "EMAIL_DRAFT"
    CALL_SUMMARY = "CALL_SUMMARY"
    CONTRACT_SUMMARY = "CONTRACT_SUMMARY"
    BUSINESS_REPORT = "BUSINESS_REPORT"
    JD_STRUCTURED = "JD_STRUCTURED"
    MEETING_NOTES = "MEETING_NOTES"
    PROPOSAL = "PROPOSAL"


class ArtifactStatus(str, enum.Enum):
    """Artifact status."""

    DRAFT = "DRAFT"
    SCHEDULED = "SCHEDULED"
    PUBLISHED = "PUBLISHED"
    SENT = "SENT"
    ARCHIVED = "ARCHIVED"


class Artifact(Base):
    """Generated artifact (output from AI employee)."""

    __tablename__ = "artifacts"

    id = Column(String, primary_key=True, index=True)
    workspace_id = Column(String, index=True, nullable=False)
    employee_id = Column(String, index=True, nullable=False)
    thread_id = Column(String, nullable=True, index=True)
    type = Column(SQLEnum(ArtifactType, native_enum=False), nullable=False)
    status = Column(SQLEnum(ArtifactStatus, native_enum=False), default=ArtifactStatus.DRAFT, nullable=False)
    title = Column(String, nullable=True)
    content_json = Column(Text, nullable=False)  # JSON serialized
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    def __repr__(self) -> str:
        return f"<Artifact(type={self.type}, status={self.status})>"
