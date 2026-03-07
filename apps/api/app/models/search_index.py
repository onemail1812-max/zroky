from __future__ import annotations
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, DateTime, Integer, Boolean
from app.database import Base
from app.db_types import SafeJSON

class EmailIndex(Base):
    __tablename__ = "email_index"

    id = Column(String, primary_key=True, index=True)
    workspace_id = Column(String, index=True, nullable=False)
    thread_id = Column(String, index=True, nullable=False)
    provider = Column(String, index=True, nullable=False)
    
    subject = Column(String, nullable=True)
    sender = Column(String, nullable=True)
    participants = Column(SafeJSON, nullable=True) # List of strings
    
    last_message_at = Column(DateTime, nullable=True, index=True)
    snippet = Column(Text, nullable=True)
    latest_reply_text = Column(Text, nullable=True)
    
    queue = Column(String, nullable=True) # e.g. "inbox", "sent"
    tags = Column(SafeJSON, nullable=True)
    message_count = Column(Integer, default=1)
    
    searchable_text = Column(Text, nullable=True) # Normalized combined field
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)


class CalendarIndex(Base):
    __tablename__ = "calendar_index"

    id = Column(String, primary_key=True, index=True)
    workspace_id = Column(String, index=True, nullable=False)
    event_id = Column(String, index=True, nullable=False) # External ID
    provider = Column(String, index=True, nullable=False)
    
    title = Column(String, nullable=True)
    attendees = Column(SafeJSON, nullable=True)
    
    start_at = Column(DateTime, nullable=False, index=True)
    end_at = Column(DateTime, nullable=False)
    location = Column(String, nullable=True)
    
    description_snippet = Column(Text, nullable=True)
    searchable_text = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
