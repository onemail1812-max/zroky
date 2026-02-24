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
            # Auto-provision user + workspace + membership for new users
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                user = User(
                    id=user_id,
                    email=token_payload.get("email") or f"{user_id}@clerk.local",
                    hashed_password="",
                    full_name=token_payload.get("user_metadata", {}).get("full_name")
                    if isinstance(token_payload.get("user_metadata"), dict)
                    else None,
                    is_active=True,
                )
                db.add(user)
                db.commit()

            # Create workspace — use the workspace_id from token if provided
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

            # Safely extract workspace_name
            user_meta = token_payload.get("user_metadata")
            ws_name = None
            if isinstance(user_meta, dict):
                ws_name = user_meta.get("workspace_name")

            name = ws_name or f"{(user.email.split('@')[0] if user.email else 'My').title()} Workspace"
            slug = _unique_slug(_slugify(name))
            
            # Use the workspace_id from token so future requests match
            ws_id = workspace_id or str(uuid.uuid4())
            workspace = Workspace(
                id=ws_id,
                name=name,
                slug=slug,
                owner_id=user_id,
            )
            db.add(workspace)
            db.commit()

            membership = Membership(
                id=str(uuid.uuid4()),
                workspace_id=ws_id,
                user_id=user_id,
                role=MembershipRole.ADMIN,
            )
            db.add(membership)
            db.commit()
            workspace_id = ws_id

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
