"""Call session model - telephony stubs."""
from sqlalchemy import Column, String, DateTime, Enum as SQLEnum
from datetime import datetime
import enum

from app.database import Base


class CallDirection(str, enum.Enum):
    """Call direction."""

    INBOUND = "INBOUND"
    OUTBOUND = "OUTBOUND"


class CallStatus(str, enum.Enum):
    """Call status."""

    CREATED = "CREATED"
    RINGING = "RINGING"
    CONNECTED = "CONNECTED"
    ENDED = "ENDED"
    FAILED = "FAILED"


class RecordingStatus(str, enum.Enum):
    """Recording upload status."""

    NONE = "NONE"
    PENDING = "PENDING"
    UPLOADED = "UPLOADED"
    FAILED = "FAILED"


class CallSession(Base):
    """Call session record."""

    __tablename__ = "call_sessions"

    id = Column(String, primary_key=True, index=True)
    workspace_id = Column(String, index=True, nullable=False)
    employee_id = Column(String, index=True, nullable=False)
    provider = Column(String, nullable=False)  # TWILIO, EXOTEL
    direction = Column(SQLEnum(CallDirection, native_enum=False), nullable=False)
    status = Column(SQLEnum(CallStatus, native_enum=False), default=CallStatus.CREATED, nullable=False)
    from_number = Column(String, nullable=True)
    to_number = Column(String, nullable=True)
    started_at = Column(DateTime, nullable=True)
    ended_at = Column(DateTime, nullable=True)
    recording_provider_url = Column(String, nullable=True)
    recording_drive_file_id = Column(String, nullable=True)
    recording_drive_link = Column(String, nullable=True)
    recording_status = Column(
        SQLEnum(RecordingStatus, native_enum=False), default=RecordingStatus.NONE, nullable=False
    )
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    def __repr__(self) -> str:
        return f"<CallSession(direction={self.direction}, status={self.status})>"
