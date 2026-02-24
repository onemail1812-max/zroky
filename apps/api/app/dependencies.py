"""Authentication and authorization dependencies."""
from fastapi import Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.membership import Membership, MembershipRole
from app.models.user import User
from app.models.workspace import Workspace
import uuid
import re
from app.security import get_current_user


class CurrentContext:
    """Current request context with workspace, user, and role info."""

    def __init__(self, workspace_id: str, user_id: str, role: MembershipRole):
        self.workspace_id = workspace_id
        self.user_id = user_id
        self.role = role

    def is_admin(self) -> bool:
        return self.role == MembershipRole.ADMIN


async def get_current_context(
    request: Request,
    db: Session = Depends(get_db),
    token_payload: dict = Depends(get_current_user),
) -> CurrentContext:
    try:
        """Get current request context from auth token + membership."""
        user_id = token_payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing user identity",
            )

        # Prefer workspace from token or header; fallback to first membership
        workspace_id = token_payload.get("workspace_id") or request.headers.get("x-workspace-id")
        if workspace_id == "default":
            workspace_id = None


        query = db.query(Membership).filter(Membership.user_id == user_id)
        if workspace_id:
            membership = query.filter(Membership.workspace_id == workspace_id).first()
        else:
            membership = query.first()

        # If workspace_id didn't match, try ANY membership for this user
        if not membership and workspace_id:
            membership = db.query(Membership).filter(Membership.user_id == user_id).first()

        if not membership:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User profile or workspace not found. Please complete onboarding.",
            )

        return CurrentContext(
            workspace_id=membership.workspace_id,
            user_id=user_id,
            role=membership.role,
        )
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback_str = traceback.format_exc()
        try:
            with open("last_error.txt", "w") as f:
                f.write(f"Dependency Error: {traceback_str}")
        except:
            pass
        print(f"Dependency Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Context Error: {str(e)}")


async def enforce_admin(context: CurrentContext = Depends(get_current_context)) -> CurrentContext:
    """Enforce admin role."""
    if not context.is_admin():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return context
