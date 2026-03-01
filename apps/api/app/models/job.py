"""Job model - Advanced SQLite-backed background queue."""
from sqlalchemy import Column, String, DateTime, Text, Integer, Enum as SQLEnum, Float
from datetime import datetime
import enum

from app.database import Base


class JobStatus(str, enum.Enum):
    """Job status for lifecycle tracking."""

    PENDING = "PENDING"
    RUNNING = "RUNNING"
    DONE = "DONE"
    FAILED = "FAILED"
    DLQ = "DLQ"  # Dead Letter Queue for permanently failed jobs


class Job(Base):
    """Background job record with concurrency locking and crash recovery."""

    __tablename__ = "jobs"

    id = Column(String, primary_key=True, index=True)
    workspace_id = Column(String, index=True, nullable=True) # Optional, for multi-tenant awareness
    type = Column(String, nullable=False, index=True)
    dedupe_id = Column(String, index=True, nullable=True)    # Prevent duplicate identical jobs
    payload_json = Column(Text, nullable=True)               # JSON serialized payload
    
    run_at = Column(DateTime, nullable=False, index=True)
    status = Column(SQLEnum(JobStatus, native_enum=False), default=JobStatus.PENDING, nullable=False, index=True)
    
    attempts = Column(Integer, default=0, nullable=False)
    max_attempts = Column(Integer, default=3, nullable=False)
    
    # Locking mechanism for Crash Recovery & Concurrency
    locked_at = Column(DateTime, nullable=True)
    locked_by = Column(String, nullable=True)
    
    last_error = Column(Text, nullable=True)
    traceback_data = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self) -> str:
        return f"<Job(type={self.type}, status={self.status}, attempts={self.attempts})>"
