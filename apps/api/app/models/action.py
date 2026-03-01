"""Action model - state machine for external operations."""
from sqlalchemy import Column, String, DateTime, Text, Enum as SQLEnum
from datetime import datetime
import enum

from app.database import Base


class ActionType(str, enum.Enum):
    """Action types."""

    EMAIL_SEND = "EMAIL_SEND"
    CALENDAR_BOOK = "CALENDAR_BOOK"
    SOCIAL_PUBLISH = "SOCIAL_PUBLISH"
    SOCIAL_SCHEDULE = "SOCIAL_SCHEDULE"
    ATS_UPDATE_STAGE = "ATS_UPDATE_STAGE"
    CALL_PLACE = "CALL_PLACE"
    CALL_TRANSFER = "CALL_TRANSFER"
    DRIVE_UPLOAD = "DRIVE_UPLOAD"
    RECORD_CALL = "RECORD_CALL"
    PUBLISH_ARTIFACT = "PUBLISH_ARTIFACT"


class RiskLevel(str, enum.Enum):
    """Risk level for action approval."""

    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class ActionState(str, enum.Enum):
    """Action state in workflow."""

    CREATED = "CREATED"
    DRAFTED = "DRAFTED"
    AWAITING_APPROVAL = "AWAITING_APPROVAL"
    APPROVED = "APPROVED"
    EXECUTING = "EXECUTING"
    EXECUTED = "EXECUTED"
    FAILED = "FAILED"
    CANCELED = "CANCELED"


class Action(Base):
    """State machine action for external operations."""

    __tablename__ = "actions"

    id = Column(String, primary_key=True, index=True)
    workspace_id = Column(String, index=True, nullable=False)
    employee_id = Column(String, index=True, nullable=False)
    type = Column(SQLEnum(ActionType, native_enum=False), nullable=False)
    risk_level = Column(SQLEnum(RiskLevel, native_enum=False), nullable=False)
    state = Column(SQLEnum(ActionState, native_enum=False), default=ActionState.CREATED, nullable=False)
    target_type = Column(String, nullable=True)  # e.g. artifact, call_session
    target_id = Column(String, nullable=True)
    input_json = Column(Text, nullable=True)  # JSON serialized input
    result_json = Column(Text, nullable=True)  # JSON serialized result
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self) -> str:
        return f"<Action(type={self.type}, state={self.state})>"
