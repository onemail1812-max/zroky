"""Workspace-scoped settings for Aaliyah runtime gate behavior."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, String

from app.database import Base


class AaliyahSettingsV2(Base):
    __tablename__ = "aaliyah_settings_v2"

    id = Column(String, primary_key=True, index=True)
    workspace_id = Column(String, index=True, nullable=False, unique=True)
    shadow_mode = Column(Boolean, nullable=False, default=True)
    auto_draft_enabled = Column(Boolean, nullable=False, default=True)
    allow_low_risk_autonomy = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
