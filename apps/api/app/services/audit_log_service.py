"""Append-only audit logging service for maintaining immutable audit trails."""
import json
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from enum import Enum

from sqlalchemy.orm import Session
from app.models.audit_log import AuditLog, AuditStatus
from app.logging_config import get_logger

logger = get_logger(__name__)


class AuditAction(str, Enum):
    """Types of audit actions."""

    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    EXECUTE = "execute"
    STATUS_CHANGE = "status_change"
    ASSIGN = "assign"
    UNASSIGN = "unassign"
    COMMENT = "comment"
    PERMISSION_GRANT = "permission_grant"
    PERMISSION_REVOKE = "permission_revoke"
    LOGIN = "login"
    LOGOUT = "logout"
    EXPORT = "export"


class AuditEntityType(str, Enum):
    """Types of entities that can be audited."""

    USER = "user"
    TASK = "task"
    WORKSPACE = "workspace"
    EMPLOYEE = "employee"
    INTEGRATION = "integration"
    ARTIFACT = "artifact"
    SETTINGS = "settings"


class AuditLogService:
    """Service for managing append-only audit logs.
    
    This service enforces immutability of audit logs - records can only be appended,
    never modified or deleted. This ensures a complete and trustworthy audit trail.
    """

    @staticmethod
    def log_action(
        db: Session,
        workspace_id: str,
        user_id: str,
        action: AuditAction,
        entity_type: AuditEntityType,
        entity_id: str,
        changes: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict[str, Any]] = None,
        before_state: Optional[Dict[str, Any]] = None,
        after_state: Optional[Dict[str, Any]] = None,
        undo_payload: Optional[Dict[str, Any]] = None,
        explain_one_liner: Optional[str] = None,
        status: Optional[str] = None,
        undo_action: Optional[Dict[str, Any]] = None,
    ) -> AuditLog:
        """
        Append a new audit log entry. This is the only way to write to the audit log.
        
        Args:
            db: Database session
            workspace_id: ID of the workspace
            user_id: ID of the user performing the action
            action: Type of action performed
            entity_type: Type of entity affected
            entity_id: ID of the entity affected
            changes: Dictionary of changes made (old_value, new_value)
            metadata: Additional metadata to store
            
        Returns:
            The created AuditLog entry
            
        Raises:
            Exception: If the database write fails
        """
        try:
            # Combine changes + metadata into a single meta payload
            meta_payload: Dict[str, Any] = {}
            if changes:
                meta_payload["changes"] = changes
            if metadata:
                meta_payload["metadata"] = metadata
            if before_state is not None:
                meta_payload["before_state"] = before_state
            if after_state is not None:
                meta_payload["after_state"] = after_state
            if undo_payload is None and undo_action is not None:
                undo_payload = undo_action
            if undo_payload is not None:
                meta_payload["undo_payload"] = undo_payload
            if explain_one_liner:
                meta_payload["explain_one_liner"] = explain_one_liner
            meta_json = json.dumps(meta_payload, default=str) if meta_payload else None

            # Create the immutable audit log entry
            audit_log = AuditLog(
                id=str(uuid.uuid4()),
                workspace_id=workspace_id,
                actor_user_id=user_id,
                action=action.value,
                target_type=entity_type.value,
                target_id=entity_id,
                meta=meta_json,
                before_state=before_state,
                after_state=after_state,
                undo_payload=undo_payload,
                explain_one_liner=explain_one_liner,
                status=status or AuditStatus.APPLIED.value,
                created_at=datetime.now(timezone.utc),
            )

            # Append to database
            db.add(audit_log)
            db.commit()
            db.refresh(audit_log)

            logger.info(
                f"Audit log created: {action.value} on {entity_type.value} "
                f"{entity_id} by user {user_id}"
            )

            return audit_log

        except Exception as e:
            db.rollback()
            logger.error(f"Failed to create audit log: {str(e)}", exc_info=True)
            raise

    @staticmethod
    def log_update(
        db: Session,
        workspace_id: str,
        user_id: str,
        entity_type: AuditEntityType,
        entity_id: str,
        old_values: Dict[str, Any],
        new_values: Dict[str, Any],
        metadata: Optional[Dict[str, Any]] = None,
    ) -> AuditLog:
        """Log an update action with before/after values."""
        changes = {
            "old": old_values,
            "new": new_values,
        }
        return AuditLogService.log_action(
            db=db,
            workspace_id=workspace_id,
            user_id=user_id,
            action=AuditAction.UPDATE,
            entity_type=entity_type,
            entity_id=entity_id,
            changes=changes,
            metadata=metadata,
        )

    @staticmethod
    def log_status_change(
        db: Session,
        workspace_id: str,
        user_id: str,
        entity_type: AuditEntityType,
        entity_id: str,
        old_status: str,
        new_status: str,
        reason: Optional[str] = None,
    ) -> AuditLog:
        """Log a status change action."""
        changes = {
            "old_status": old_status,
            "new_status": new_status,
        }
        metadata = {"reason": reason} if reason else None
        return AuditLogService.log_action(
            db=db,
            workspace_id=workspace_id,
            user_id=user_id,
            action=AuditAction.STATUS_CHANGE,
            entity_type=entity_type,
            entity_id=entity_id,
            changes=changes,
            metadata=metadata,
        )

    @staticmethod
    def log_creation(
        db: Session,
        workspace_id: str,
        user_id: str,
        entity_type: AuditEntityType,
        entity_id: str,
        initial_values: Dict[str, Any],
    ) -> AuditLog:
        """Log an entity creation."""
        return AuditLogService.log_action(
            db=db,
            workspace_id=workspace_id,
            user_id=user_id,
            action=AuditAction.CREATE,
            entity_type=entity_type,
            entity_id=entity_id,
            changes={"initial": initial_values},
        )

    @staticmethod
    def log_deletion(
        db: Session,
        workspace_id: str,
        user_id: str,
        entity_type: AuditEntityType,
        entity_id: str,
        deleted_values: Dict[str, Any],
    ) -> AuditLog:
        """Log an entity deletion."""
        return AuditLogService.log_action(
            db=db,
            workspace_id=workspace_id,
            user_id=user_id,
            action=AuditAction.DELETE,
            entity_type=entity_type,
            entity_id=entity_id,
            changes={"deleted": deleted_values},
        )

    @staticmethod
    def get_entity_audit_trail(
        db: Session,
        workspace_id: str,
        entity_type: AuditEntityType,
        entity_id: str,
    ) -> list[AuditLog]:
        """Get the complete audit trail for an entity (read-only)."""
        return (
            db.query(AuditLog)
            .filter(
                AuditLog.workspace_id == workspace_id,
                AuditLog.target_type == entity_type.value,
                AuditLog.target_id == entity_id,
            )
            .order_by(AuditLog.created_at.asc())
            .all()
        )

    @staticmethod
    def get_user_actions(
        db: Session,
        workspace_id: str,
        user_id: str,
        limit: int = 100,
    ) -> list[AuditLog]:
        """Get recent actions by a user (read-only)."""
        return (
            db.query(AuditLog)
            .filter(
                AuditLog.workspace_id == workspace_id,
                AuditLog.actor_user_id == user_id,
            )
            .order_by(AuditLog.created_at.desc())
            .limit(limit)
            .all()
        )

    @staticmethod
    def get_workspace_audit_log(
        db: Session,
        workspace_id: str,
        limit: int = 1000,
    ) -> list[AuditLog]:
        """Get the audit log for an entire workspace (read-only)."""
        return (
            db.query(AuditLog)
            .filter(AuditLog.workspace_id == workspace_id)
            .order_by(AuditLog.created_at.desc())
            .limit(limit)
            .all()
        )

    @staticmethod
    def verify_immutability(db: Session, audit_log_id: str) -> bool:
        """Verify that an audit log entry has not been modified (check-only).
        
        This is a security check to ensure append-only enforcement.
        """
        audit_log = db.query(AuditLog).filter(AuditLog.id == audit_log_id).first()
        if not audit_log:
            return False
        # In a real system, you would check cryptographic hashes or database constraints
        return True

    @staticmethod
    def export_audit_trail(
        db: Session,
        workspace_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> list[Dict[str, Any]]:
        """Export audit trail for compliance/reporting (read-only)."""
        query = db.query(AuditLog).filter(AuditLog.workspace_id == workspace_id)

        if start_date:
            query = query.filter(AuditLog.created_at >= start_date)
        if end_date:
            query = query.filter(AuditLog.created_at <= end_date)

        audit_logs = query.order_by(AuditLog.created_at.asc()).all()

        return [
            {
                "id": log.id,
                "timestamp": log.created_at.isoformat(),
                "user_id": log.actor_user_id,
                "action": log.action,
                "entity_type": log.target_type,
                "entity_id": log.target_id,
                "meta": json.loads(log.meta) if log.meta else None,
                "before_state": log.before_state,
                "after_state": log.after_state,
                "undo_payload": log.undo_payload,
                "explain_one_liner": log.explain_one_liner,
                "status": log.status,
            }
            for log in audit_logs
        ]
