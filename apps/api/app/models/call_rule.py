"""Call rule model - telephony rules and settings."""
from sqlalchemy import Column, String, DateTime, Boolean, Integer, Text
from datetime import datetime

from app.database import Base


class CallRule(Base):
    """Call rules and restrictions."""

    __tablename__ = "call_rules"

    id = Column(String, primary_key=True, index=True)
    workspace_id = Column(String, index=True, nullable=False)
    employee_id = Column(String, index=True, nullable=False)
    allowed_countries_json = Column(Text, nullable=True)  # JSON list
    allowed_time_windows_json = Column(Text, nullable=True)  # JSON per timezone
    max_calls_per_day = Column(Integer, default=100, nullable=False)
    approval_required = Column(Boolean, default=False, nullable=False)
    recording_enabled = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    def __repr__(self) -> str:
        return f"<CallRule(employee_id={self.employee_id})>"
