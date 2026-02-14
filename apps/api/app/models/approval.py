"""Approval model - approval workflow for high-risk actions."""
from sqlalchemy import Column, String, DateTime, Text, Enum as SQLEnum
from datetime import datetime
import enum

from app.database import Base


class ApprovalDecision(str, enum.Enum):
    """Approval decision."""

    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class Approval(Base):
    """Approval workflow."""

    __tablename__ = "approvals"

    id = Column(String, primary_key=True, index=True)
    workspace_id = Column(String, index=True, nullable=False)
    action_id = Column(String, index=True, nullable=False)
    requested_by_user_id = Column(String, nullable=False)
    decided_by_user_id = Column(String, nullable=True)
    decision = Column(SQLEnum(ApprovalDecision), default=ApprovalDecision.PENDING, nullable=False)
    reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    decided_at = Column(DateTime, nullable=True)

    def __repr__(self) -> str:
        return f"<Approval(action_id={self.action_id}, decision={self.decision})>"
