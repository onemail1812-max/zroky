"""Employee assignment model - admin assigns employees to users."""
from sqlalchemy import Column, String, Boolean, DateTime
from datetime import datetime, timezone

from app.database import Base


class EmployeeAssignment(Base):
    """Employee assignment to user."""

    __tablename__ = "employee_assignments"

    id = Column(String, primary_key=True, index=True)
    workspace_id = Column(String, index=True, nullable=False)
    employee_id = Column(String, index=True, nullable=False)
    user_id = Column(String, index=True, nullable=False)
    is_enabled = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    def __repr__(self) -> str:
        return f"<EmployeeAssignment(employee_id={self.employee_id}, user_id={self.user_id})>"
