"""Memory entry model for hot/cold context persistence."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import Column, DateTime, String, Text

from app.database import Base
from app.db_types import SafeJSON


class MemoryEntry(Base):
    __tablename__ = "memory_entries"

    id = Column(String, primary_key=True, index=True)
    workspace_id = Column(String, index=True, nullable=False)
    source_type = Column(String, index=True, nullable=False)
    source_id = Column(String, index=True, nullable=False)
    content_text = Column(Text, nullable=False)
    embedding_json = Column(SafeJSON(), nullable=True)
    metadata_json = Column(SafeJSON(), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
