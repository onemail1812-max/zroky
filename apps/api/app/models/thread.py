"""Thread model - chat thread per employee per workspace."""
from sqlalchemy import Column, String, DateTime
from datetime import datetime

from app.database import Base


class Thread(Base):
    """Chat thread for employee."""

    __tablename__ = "threads"

    id = Column(String, primary_key=True, index=True)
    workspace_id = Column(String, index=True, nullable=False)
    employee_id = Column(String, index=True, nullable=False)
    title = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self) -> str:
        return f"<Thread(employee_id={self.employee_id}, workspace_id={self.workspace_id})>"
