import enum
from sqlalchemy import Column, String, DateTime, Text
from datetime import datetime, timezone
from app.database import Base
from app.db_types import SafeJSON


class AuditStatus(str, enum.Enum):
    APPLIED = "APPLIED"
    UNDONE = "UNDONE"
    FAILED = "FAILED"

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String, primary_key=True, index=True)
    workspace_id = Column(String, index=True, nullable=False)
    actor_user_id = Column(String, index=True, nullable=True)
    action = Column(String, index=True, nullable=False)
    target_type = Column(String, nullable=True)
    target_id = Column(String, nullable=True) # Can be thread_id
    
    # Specific Context
    thread_id = Column(String, index=True, nullable=True)
    provider = Column(String, nullable=True)

    # f4c5 renamed from metadata -> meta, while keeping DB column name "metadata"
    meta = Column("metadata", Text)  # JSON serialized - additional context

    # Structured undo metadata (JSON)
    before_state = Column(SafeJSON(), nullable=True)
    after_state = Column(SafeJSON(), nullable=True)
    undo_payload = Column(SafeJSON(), nullable=True)
    explain_one_liner = Column(String, nullable=True)
    status = Column(String, default=AuditStatus.APPLIED.value, nullable=False)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
