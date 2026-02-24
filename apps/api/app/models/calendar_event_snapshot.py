from sqlalchemy import Column, String, DateTime, Boolean, Text
from datetime import datetime
from app.db.base_class import Base

class CalendarEventSnapshot(Base):
    """STUB: Persisted calendar events (stateless foundation handles live fetches)."""
    __tablename__ = "calendar_event_snapshots"
    id = Column(String, primary_key=True, index=True)
    workspace_id = Column(String, index=True, nullable=False)
    title = Column(String, nullable=True)
    start_at = Column(DateTime, nullable=True)
    end_at = Column(DateTime, nullable=True)
    organizer = Column(String, nullable=True)
    is_cancelled = Column(Boolean, default=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class CalendarConflict(Base):
    """STUB: Persisted calendar conflicts."""
    __tablename__ = "calendar_conflicts"
    id = Column(String, primary_key=True, index=True)
    workspace_id = Column(String, index=True, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
