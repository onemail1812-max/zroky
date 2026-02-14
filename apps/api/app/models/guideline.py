
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, Optional

from sqlalchemy import Column, DateTime, String, Text
from sqlalchemy.sql import func

from app.database import Base


class Guideline(Base):
    __tablename__ = "guidelines"

    id = Column(String, primary_key=True, index=True)
    workspace_id = Column(String, index=True, nullable=False)
    employee_id = Column(String, index=True, nullable=False)

    # Versioning allows future evolution of guideline structure without breakage
    schema_version = Column(String, default="v1", nullable=False)

    # Free-form JSON (stored as text) that includes:
    # - instructions
    # - tone preferences
    # - do / do-not rules
    # - OPTIONAL: reference_playbooks[]
    content_json = Column(Text, nullable=False)

    # Optional human-readable summary
    content_text = Column(Text, nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
