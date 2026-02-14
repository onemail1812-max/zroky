"""FastAPI application entry point."""
import logging
from fastapi import FastAPI, Depends, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.orm import Session

from app.config import settings
from app.database import Base, engine, get_db
from app.logging import setup_logging
from app.security import get_current_user
from app.models.user import User
from app.models.membership import Membership

from app.agents.aaliyah.api import (
    core_router as aaliyah_router,
    connectors_router,
    booking_router,
    knowledge_router,
)
from app.routers import oauth


setup_logging()
logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    debug=settings.debug,
)

print("--- ZROKY API STARTING ---")
print(f"Router prefix: {aaliyah_router.prefix}")

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_request: Request, exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": {
                "code": "validation_error",
                "message": "Request validation failed",
                "details": exc.errors(),
            }
        },
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(_request: Request, exc: HTTPException) -> JSONResponse:
    detail = exc.detail
    if isinstance(detail, dict) and "code" in detail and "message" in detail:
        payload = {"error": detail}
    elif isinstance(detail, str):
        payload = {"error": {"code": "http_error", "message": detail}}
    else:
        payload = {"error": {"code": "http_error", "message": "Request failed"}}
    return JSONResponse(status_code=exc.status_code, content=payload, headers=exc.headers)


@app.exception_handler(Exception)
async def unhandled_exception_handler(_request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled exception: %s", str(exc))
    
    content = {
        "error": {
            "code": "internal_error", 
            "message": "Internal server error"
        }
    }
    
    if settings.debug:
        import traceback
        content["error"]["message"] = f"Internal server error: {str(exc)}"
        content["error"]["traceback"] = traceback.format_exc()
        
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=content,
    )


@app.on_event("startup")
async def startup_event() -> None:
    # 1. Security Config Check
    if settings.env == "production":
        if not settings.secret_key or len(settings.secret_key) < 32:
            logger.critical("⚠️ PRODUCTION SECURITY WARNING: Weak or missing SECRET_KEY!")
            # In strict mode we might want to raise SystemExit, but logging is a good first step
        
        if settings.oauth_encryption_key == "0123456789abcdef0123456789abcdef":
             logger.critical("⚠️ PRODUCTION SECURITY WARNING: Using default OAUTH_ENCRYPTION_KEY! Rotations required immediately.")
             
        if not settings.clerk_jwks_url:
             logger.critical("⚠️ PRODUCTION SECURITY WARNING: Clerk JWKS URL missing. Auth will fail.")

    # 2. Ensure all models are registered before create_all.
    import app.models  # noqa: F401

    # Dev-friendly: auto-create tables for SQLite to avoid "no such table" errors.
    if settings.database_url.startswith("sqlite"):
        Base.metadata.create_all(bind=engine)


@app.on_event("shutdown")
async def shutdown_event() -> None:
    # Need to import the module object to access stop_auto_sync_workers, currently in routes.py
    from app.agents.aaliyah.api import stop_auto_sync_workers
    await stop_auto_sync_workers()
    
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=settings.cors_credentials,
    allow_methods=settings.cors_methods,
    allow_headers=settings.cors_headers,
)

# Phase-2 surfaces
# ...
app.include_router(aaliyah_router) # Aaliyah V2 (Autonomous Agent)
app.include_router(oauth.router)
app.include_router(connectors_router)
app.include_router(booking_router)
app.include_router(knowledge_router, prefix="/aaliyah", tags=["knowledge"])


@app.get("/")
async def root():
    return {"message": "Welcome to Zroky API", "version": settings.app_version}


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "api"}


@app.get("/version")
async def get_version():
    return {"name": "zroky-api", "version": settings.app_version}


@app.get("/me")
async def get_current_user_profile(
    token_payload: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_id = token_payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Missing user identity")

    user = db.query(User).filter(User.id == user_id).first()
    membership = db.query(Membership).filter(Membership.user_id == user_id).first()

    if not user or not membership:
        # Auto-provision user + workspace on first login
        email = token_payload.get("email") or f"{user_id}@clerk.local"
        full_name = (
            token_payload.get("user_metadata", {}).get("full_name")
            if isinstance(token_payload.get("user_metadata"), dict)
            else None
        )
        if not user:
            user = User(
                id=user_id,
                email=email,
                hashed_password="",
                full_name=full_name,
                is_active=True,
            )
            db.add(user)
            db.commit()

        if not membership:
            import re
            import uuid
            from app.models.workspace import Workspace

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

            name = (
                token_payload.get("user_metadata", {}).get("workspace_name")
                if isinstance(token_payload.get("user_metadata"), dict)
                else None
            ) or f"{(email.split('@')[0] if email else 'My').title()} Workspace"
            slug = _unique_slug(_slugify(name))
            workspace = Workspace(
                id=str(uuid.uuid4()),
                name=name,
                slug=slug,
                owner_id=user_id,
            )
            db.add(workspace)
            db.commit()

            from app.models.membership import MembershipRole

            membership = Membership(
                id=str(uuid.uuid4()),
                workspace_id=workspace.id,
                user_id=user_id,
                role=MembershipRole.ADMIN,
            )
            db.add(membership)
            db.commit()

    membership = membership or db.query(Membership).filter(Membership.user_id == user_id).first()
    return {
        "user_id": user.id,
        "workspace_id": membership.workspace_id if membership else None,
        "role": membership.role if membership else None,
        "email": user.email,
        "full_name": user.full_name,
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        app,
        host=settings.server_host,
        port=settings.server_port,
        reload=settings.debug,
    )
