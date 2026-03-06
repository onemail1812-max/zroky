from sqlalchemy import Column, String, DateTime, Boolean, Text
from datetime import datetime
from app.db.base_class import Base
from app.db_types import SafeJSON

class CalendarEventSnapshot(Base):
    """Persisted calendar events for briefing and conflict detection."""
    __tablename__ = "calendar_event_snapshots"
    id = Column(String, primary_key=True, index=True)
    workspace_id = Column(String, index=True, nullable=False)
    provider = Column(String, nullable=True)
    external_event_id = Column(String, index=True, nullable=True)
    title = Column(String, nullable=True)
    start_at = Column(DateTime, nullable=True)
    end_at = Column(DateTime, nullable=True)
    is_all_day = Column(Boolean, default=False)
    organizer = Column(String, nullable=True)
    attendees = Column(SafeJSON(), nullable=True)
    is_cancelled = Column(Boolean, default=False)
    metadata_json = Column(SafeJSON(), nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class CalendarConflict(Base):
    """Persisted calendar conflicts."""
    __tablename__ = "calendar_conflicts"
    id = Column(String, primary_key=True, index=True)
    workspace_id = Column(String, index=True, nullable=False)
    event_a_id = Column(String, nullable=True)
    event_b_id = Column(String, nullable=True)
    conflict_type = Column(String, nullable=True)
    conflict_minutes = Column(String, nullable=True)
    explain = Column(Text, nullable=True)
    metadata_json = Column(SafeJSON(), nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
