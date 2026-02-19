"""Integration model - provider connections (placeholders)."""
from sqlalchemy import Column, String, DateTime, Text, Enum as SQLEnum
from datetime import datetime
import enum

from app.database import Base


class IntegrationProvider(str, enum.Enum):
    """Integration providers."""

    GOOGLE_GMAIL = "GOOGLE_GMAIL"
    GOOGLE_CALENDAR = "GOOGLE_CALENDAR"
    GOOGLE_DRIVE = "GOOGLE_DRIVE"
    OUTLOOK = "OUTLOOK"
    IMAP = "IMAP"
    TWILIO = "TWILIO"
    EXOTEL = "EXOTEL"
    WORDPRESS = "WORDPRESS"
    WEBFLOW = "WEBFLOW"
    SLACK = "SLACK"
    LINKEDIN = "LINKEDIN"
    TWITTER = "TWITTER"


class IntegrationStatus(str, enum.Enum):
    """Integration connection status."""

    DISCONNECTED = "DISCONNECTED"
    CONNECTED = "CONNECTED"
    NEEDS_RECONNECT = "NEEDS_RECONNECT"
    ERROR = "ERROR"


class Integration(Base):
    """Provider integration connections."""

    __tablename__ = "integrations"

    id = Column(String, primary_key=True, index=True)
    workspace_id = Column(String, index=True, nullable=False)
    provider = Column(SQLEnum(IntegrationProvider), nullable=False)
    status = Column(SQLEnum(IntegrationStatus), default=IntegrationStatus.DISCONNECTED, nullable=False)
    scopes_json = Column(Text, nullable=True)  # JSON list of scopes
    token_encrypted = Column(Text, nullable=True)  # Encrypted token placeholder
    config_json = Column(Text, nullable=True)  # Provider-specific config
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self) -> str:
        return f"<Integration(provider={self.provider}, status={self.status})>"
