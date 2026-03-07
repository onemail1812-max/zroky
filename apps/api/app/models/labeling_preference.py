"""Workspace-scoped email labeling preferences and overrides."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, Integer, String

from app.database import Base
from app.db_types import SafeJSON


class LabelingPreference(Base):
    __tablename__ = "labeling_preferences"

    id = Column(String, primary_key=True, index=True)
    workspace_id = Column(String, index=True, nullable=False, unique=True)
    enabled_labels = Column(SafeJSON(), nullable=False)
    vip_senders = Column(SafeJSON(), nullable=False)
    internal_domains = Column(SafeJSON(), nullable=False)
    keyword_rules = Column(SafeJSON(), nullable=False)
    overrides_json = Column(SafeJSON(), nullable=False)
    auto_label_enabled = Column(Boolean, nullable=False, default=True)
    auto_sync_interval_seconds = Column(Integer, nullable=False, default=120)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
