
"""Meeting transcript and summary storage."""
from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from datetime import datetime

from app.database import Base
from app.db_types import SafeJSON

class MeetingTranscript(Base):
    __tablename__ = "meeting_transcripts"

    id = Column(String, primary_key=True, index=True)
    workspace_id = Column(String, index=True, nullable=False)
    event_id = Column(String, index=True, nullable=False)  # No FK — calendar_event_snapshots removed
    
    # Store the full raw text (potentially large)
    transcript_text = Column(Text, nullable=False)
    
    # Store structured summary (action items, decisions, summary)
    summary_json = Column(SafeJSON(), nullable=True)
    
    status = Column(String, default="pending", index=True) # pending, processing, completed, failed
    platform = Column(String, nullable=True) # zoom, teams, meet, manual
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
