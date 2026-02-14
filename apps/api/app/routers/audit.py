"""Audit router."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import enforce_admin, CurrentContext
from app.models.audit_log import AuditLog
from app.schemas.audit import AuditLogResponse

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("", response_model=list[AuditLogResponse])
async def get_audit_logs(
    limit: int = 100,
    db: Session = Depends(get_db),
    context: CurrentContext = Depends(enforce_admin),
):
    """Get audit logs (admin only)."""
    logs = (
        db.query(AuditLog)
        .filter(AuditLog.workspace_id == context.workspace_id)
        .order_by(AuditLog.created_at.desc())
        .limit(limit)
        .all()
    )
    return logs
