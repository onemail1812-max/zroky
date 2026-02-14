"""Employee model."""
from sqlalchemy import Column, String, DateTime
from datetime import datetime

from app.database import Base


class Employee(Base):
    """Employee model."""

    __tablename__ = "employees"

    id = Column(String, primary_key=True, index=True)
    workspace_id = Column(String, index=True, nullable=False)
    user_id = Column(String, index=True, nullable=False)
    role = Column(String, default="member", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self) -> str:
        return f"<Employee(id={self.id}, workspace_id={self.workspace_id})>"
