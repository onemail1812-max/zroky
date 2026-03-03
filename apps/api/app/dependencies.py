"""Authentication and authorization dependencies."""
from fastapi import Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.membership import Membership, MembershipRole
from app.models.user import User
from app.models.workspace import Workspace
import uuid
import re
import logging
from app.security import get_current_user

logger = logging.getLogger(__name__)


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
        if not token_payload:
            token_payload = {}
            
        user_id = token_payload.get("sub")
        if not user_id:
            logger.error("Missing user identity in token_payload")
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

        # [CRITICAL FIX]: If a brand new user hits the app before hitting `/me`, 
        # throwing a 403 here violently disrupts the DB `yield` sequence in FastAPI, causing a 500 proxy crash. 
        # Instead, we seamlessly auto-provision a default workspace.
        if not membership:
            from app.models.workspace import Workspace
            from app.models.user import User
            
            try:
                # 1. Ensure User exists
                user_prof = db.query(User).filter(User.id == user_id).first()
                if not user_prof:
                    user_prof = User(
                        id=user_id,
                        email=token_payload.get("email") or f"{user_id}@clerk.local",
                        hashed_password="",
                        full_name=token_payload.get("user_metadata", {}).get("full_name") if isinstance(token_payload.get("user_metadata"), dict) else None,
                        is_active=True,
                    )
                    db.add(user_prof)
                    
                # 2. Auto-provision Sandbox Workspace
                def _slugify(value: str) -> str:
                    value = value.lower().strip()
                    value = re.sub(r"[^a-z0-9]+", "-", value).strip("-")
                    return value or "workspace"

                def _unique_slug(base: str) -> str:
                    slug = base
                    counter = 1
                    while db.query(Workspace).filter(Workspace.slug == slug).first():
                        slug = f"{base}-{counter}"
                        counter += 1
                    return slug

                user_meta = token_payload.get("user_metadata")
                ws_name = user_meta.get("workspace_name") if isinstance(user_meta, dict) else None
                name = ws_name or f"{(user_prof.email.split('@')[0] if user_prof.email else 'My').title()} Workspace"
                slug = _unique_slug(_slugify(name))
                
                ws_id = workspace_id or str(uuid.uuid4())
                workspace = Workspace(
                    id=ws_id,
                    name=name,
                    slug=slug,
                    owner_id=user_id,
                    onboarding_status="pending"
                )
                db.add(workspace)

                membership = Membership(
                    id=str(uuid.uuid4()),
                    workspace_id=ws_id,
                    user_id=user_id,
                    role=MembershipRole.ADMIN,
                )
                db.add(membership)
                db.commit()
                logger.info(f"✅ Auto-provisioned sandbox workspace {ws_id} for new user {user_id} to prevent 403 crash.")
            except Exception as e:
                db.rollback()
                logger.error(f"Failed to auto-provision workspace: {e}", exc_info=True)
                raise HTTPException(status_code=500, detail="Database error during provisioning")

        return CurrentContext(
            workspace_id=membership.workspace_id,
            user_id=user_id,
            role=membership.role,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Dependency Error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Context Error: {str(e)}")


async def enforce_admin(context: CurrentContext = Depends(get_current_context)) -> CurrentContext:
    """Enforce admin role."""
    if not context.is_admin():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return context
