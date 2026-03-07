"""Membership model - user workspace membership with role."""
from sqlalchemy import Column, String, DateTime, Enum as SQLEnum
from datetime import datetime, timezone
import enum

from app.database import Base


class MembershipRole(str, enum.Enum):
    """Workspace membership roles."""

    ADMIN = "ADMIN"
    USER = "USER"


class Membership(Base):
    """Workspace membership."""

    __tablename__ = "memberships"

    id = Column(String, primary_key=True, index=True)
    workspace_id = Column(String, index=True, nullable=False)
    user_id = Column(String, index=True, nullable=False)
    role = Column(SQLEnum(MembershipRole, native_enum=False), default=MembershipRole.USER, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    def __repr__(self) -> str:
        return f"<Membership(workspace_id={self.workspace_id}, user_id={self.user_id}, role={self.role})>"
