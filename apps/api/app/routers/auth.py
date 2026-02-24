"""Authentication router for login/register."""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
import re
import uuid

from app.database import get_db
from app.models.user import User
from app.models.workspace import Workspace
from app.models.membership import Membership, MembershipRole
from app.security import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str | None = None
    workspace_name: str | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


def _slugify(value: str) -> str:
    value = value.lower().strip()
    value = re.sub(r"[^a-z0-9]+", "-", value).strip("-")
    return value or "workspace"


def _unique_slug(db: Session, base: str) -> str:
    slug = base
    counter = 1
    while db.query(Workspace).filter(Workspace.slug == slug).first():
        slug = f"{base}-{counter}"
        counter += 1
    return slug


@router.post("/register")
@limiter.limit("5/hour")
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    """Create user + workspace + membership and return access token."""
    existing = db.query(User).filter(User.email == request.email.lower()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    user_id = str(uuid.uuid4())
    user = User(
        id=user_id,
        email=request.email.lower(),
        hashed_password=hash_password(request.password),
        full_name=request.full_name,
        is_active=True,
    )
    db.add(user)

    workspace_name = request.workspace_name or f"{request.full_name or 'My'} Workspace"
    workspace_id = str(uuid.uuid4())
    slug = _unique_slug(db, _slugify(workspace_name))
    workspace = Workspace(
        id=workspace_id,
        name=workspace_name,
        slug=slug,
        owner_id=user_id,
    )
    db.add(workspace)

    membership = Membership(
        id=str(uuid.uuid4()),
        workspace_id=workspace_id,
        user_id=user_id,
        role=MembershipRole.ADMIN,
    )
    db.add(membership)

    db.commit()

    token = create_access_token({"sub": user_id, "workspace_id": workspace_id})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"id": user_id, "email": user.email, "full_name": user.full_name},
        "workspace": {"id": workspace_id, "name": workspace.name, "slug": workspace.slug},
    }


@router.post("/login")
@limiter.limit("10/minute")
def login(request: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate user and return access token."""
    user = db.query(User).filter(User.email == request.email.lower()).first()
    if not user or not verify_password(request.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    membership = db.query(Membership).filter(Membership.user_id == user.id).first()
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No workspace membership for user",
        )

    token = create_access_token({"sub": user.id, "workspace_id": membership.workspace_id})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"id": user.id, "email": user.email, "full_name": user.full_name},
        "workspace_id": membership.workspace_id,
        "role": membership.role,
    }


@router.get("/me")
def me(
    token_payload: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return current user profile and memberships."""
    user_id = token_payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing user identity",
        )
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    memberships = db.query(Membership).filter(Membership.user_id == user_id).all()
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "memberships": [
            {
                "workspace_id": m.workspace_id,
                "role": m.role,
            }
            for m in memberships
        ],
    }
