"""Calendar event snapshots and conflict insights for scheduling awareness."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, String, Text

from app.database import Base
from app.db_types import SafeJSON


class CalendarEventSnapshot(Base):
    __tablename__ = "calendar_event_snapshots"

    id = Column(String, primary_key=True, index=True)
    workspace_id = Column(String, index=True, nullable=False)
    provider = Column(String, index=True, nullable=False)
    external_event_id = Column(String, index=True, nullable=False)
    title = Column(String, nullable=False)
    organizer = Column(String, nullable=True)
    start_at = Column(DateTime, nullable=False, index=True)
    end_at = Column(DateTime, nullable=False, index=True)
    is_all_day = Column(Boolean, nullable=False, default=False)
    is_cancelled = Column(Boolean, nullable=False, default=False)
    metadata_json = Column(SafeJSON(), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class CalendarConflict(Base):
    __tablename__ = "calendar_conflicts"

    id = Column(String, primary_key=True, index=True)
    workspace_id = Column(String, index=True, nullable=False)
    event_a_id = Column(String, index=True, nullable=False)
    event_b_id = Column(String, index=True, nullable=False)
    conflict_type = Column(String, nullable=False, index=True)  # overlap|tight_buffer
    conflict_minutes = Column(String, nullable=True)
    explain = Column(Text, nullable=True)
    metadata_json = Column(SafeJSON(), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
