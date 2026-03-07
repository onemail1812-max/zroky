"""Call script model - call scripts and greetings."""
from sqlalchemy import Column, String, DateTime, Text
from datetime import datetime, timezone

from app.database import Base


class CallScript(Base):
    """Call script and instructions."""

    __tablename__ = "call_scripts"

    id = Column(String, primary_key=True, index=True)
    workspace_id = Column(String, index=True, nullable=False)
    employee_id = Column(String, index=True, nullable=False)
    greeting = Column(Text, nullable=False)
    general_instructions = Column(Text, nullable=True)
    end_call_conditions = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    def __repr__(self) -> str:
        return f"<CallScript(employee_id={self.employee_id})>"
