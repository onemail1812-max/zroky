"""Schedule model - publish/send schedule for artifacts."""
from sqlalchemy import Column, String, DateTime, Enum as SQLEnum
from datetime import datetime
import enum

from app.database import Base


class ScheduleStatus(str, enum.Enum):
    """Schedule status."""

    SCHEDULED = "SCHEDULED"
    RUNNING = "RUNNING"
    DONE = "DONE"
    FAILED = "FAILED"
    CANCELED = "CANCELED"


class Schedule(Base):
    """Schedule for artifact publication/sending."""

    __tablename__ = "schedules"

    id = Column(String, primary_key=True, index=True)
    workspace_id = Column(String, index=True, nullable=False)
    artifact_id = Column(String, index=True, nullable=False)
    scheduled_for = Column(DateTime, nullable=False, index=True)
    status = Column(SQLEnum(ScheduleStatus, native_enum=False), default=ScheduleStatus.SCHEDULED, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    def __repr__(self) -> str:
        return f"<Schedule(artifact_id={self.artifact_id}, status={self.status})>"
