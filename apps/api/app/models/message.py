"""Message model - chat messages in threads."""
from sqlalchemy import Column, String, DateTime, Text, Enum as SQLEnum
from datetime import datetime, timezone
import enum

from app.database import Base


class AuthorType(str, enum.Enum):
    """Message author type."""

    USER = "USER"
    AI = "AI"
    SYSTEM = "SYSTEM"


class Message(Base):
    """Chat message."""

    __tablename__ = "messages"

    id = Column(String, primary_key=True, index=True)
    workspace_id = Column(String, index=True, nullable=False)
    thread_id = Column(String, index=True, nullable=False)
    employee_id = Column(String, index=True, nullable=False)
    author_type = Column(SQLEnum(AuthorType, native_enum=False), nullable=False)
    author_user_id = Column(String, index=True, nullable=True)
    content_text = Column(Text, nullable=False)
    content_json = Column(Text, nullable=True)  # JSON serialized
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)

    def __repr__(self) -> str:
        return f"<Message(thread_id={self.thread_id}, author={self.author_type})>"
