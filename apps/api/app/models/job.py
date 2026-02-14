"""Job model - background job scheduler."""
from sqlalchemy import Column, String, DateTime, Text, Integer, Enum as SQLEnum
from datetime import datetime
import enum

from app.database import Base


class JobStatus(str, enum.Enum):
    """Job status."""

    PENDING = "PENDING"
    RUNNING = "RUNNING"
    DONE = "DONE"
    FAILED = "FAILED"


class Job(Base):
    """Background job record."""

    __tablename__ = "jobs"

    id = Column(String, primary_key=True, index=True)
    workspace_id = Column(String, index=True, nullable=False)
    type = Column(String, nullable=False)
    payload_json = Column(Text, nullable=True)  # JSON serialized payload
    run_at = Column(DateTime, nullable=False, index=True)
    status = Column(SQLEnum(JobStatus), default=JobStatus.PENDING, nullable=False)
    attempts = Column(Integer, default=0, nullable=False)
    last_error = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self) -> str:
        return f"<Job(type={self.type}, status={self.status})>"
