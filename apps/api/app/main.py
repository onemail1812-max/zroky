"""FastAPI application entry point — Stateless Proxy Architecture."""
import logging
from fastapi import FastAPI, Depends, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.middleware.rate_limiter import RateLimiterMiddleware
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler
from app.core.limiter import limiter
from fastapi.exceptions import RequestValidationError
from sqlalchemy.orm import Session

from app.config import settings
from app.database import Base, engine, get_db
from app.logging_config import setup_logging
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
from app.routers import assist as assist_router
from app.api.routes.inbox import router as inbox_router
from app.api.routes.calendar import router as calendar_router
from app.api.routes.meetings import router as meetings_router


setup_logging()
logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    debug=False,
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# ── Exception Handlers ──────────────────────────────────────────────────

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


# ── Startup ─────────────────────────────────────────────────────────────

@app.on_event("startup")
async def startup_event() -> None:
    # Ensure all models are registered before create_all.
    import app.models  # noqa: F401
    import asyncio

    # Dev-friendly: auto-create tables for SQLite.
    if settings.database_url.startswith("sqlite"):
        Base.metadata.create_all(bind=engine)
        
    # Start the async background worker loop
    from app.core.queue import queue, JobType
    from app.workers.local_sync import process_sync_provider, process_ai_triage, process_drafting
    from app.workers.followup_worker import process_auto_followup
    handlers = {
        JobType.SYNC_PROVIDER.value: process_sync_provider,
        JobType.AI_TRIAGE.value: process_ai_triage,
        JobType.PROCESS_DRAFT.value: process_drafting,
        JobType.AUTO_FOLLOWUP.value: process_auto_followup
    }
    
    # Run the worker listener
    asyncio.create_task(queue.worker_loop(handlers))
    
    # Run the 24/7 auto-sync scheduler
    asyncio.create_task(queue.scheduler_loop())

    logger.info("✅ Zroky API started (Event-Driven Local mode). Background async workers & scheduler running.")


# ── CORS ─────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=settings.cors_credentials,
    allow_methods=settings.cors_methods,
    allow_headers=settings.cors_headers,
)

app.add_middleware(RateLimiterMiddleware, requests_per_minute=120)  # Increased for rapid workspace sync


# ── Routers ──────────────────────────────────────────────────────────────

app.include_router(aaliyah_router)
app.include_router(oauth.router)
app.include_router(connectors_router)
app.include_router(booking_router)
app.include_router(knowledge_router, prefix="/aaliyah", tags=["knowledge"])
app.include_router(inbox_router)
app.include_router(calendar_router)
app.include_router(meetings_router)
from app.api.webhooks import router as webhooks_router
app.include_router(webhooks_router)
app.include_router(assist_router.router, prefix="/assist", tags=["assist"])


# ── Core Endpoints ───────────────────────────────────────────────────────

@app.get("/")
async def root():
    return {"message": "Welcome to Zroky API", "version": settings.app_version}


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "api"}


@app.get("/health/workers")
async def health_check_workers(db: Session = Depends(get_db)):
    """Health metrics for background workers (SQLite queue)."""
    from app.models.job import Job, JobStatus
    from sqlalchemy import func
    from app.core.queue import queue
    
    metrics = db.query(Job.status, func.count(Job.id)).group_by(Job.status).all()
    status_counts = {status.value: count for status, count in metrics}
    
    return {
        "status": "ok",
        "worker_id": getattr(queue, "worker_id", "unknown"),
        "metrics": {
            "pending": status_counts.get(JobStatus.PENDING.value, 0),
            "running": status_counts.get(JobStatus.RUNNING.value, 0),
            "done": status_counts.get(JobStatus.DONE.value, 0),
            "dlq": status_counts.get(JobStatus.DLQ.value, 0),
            "total": sum(status_counts.values())
        }
    }


@app.get("/health/providers")
async def health_check_providers(
    db: Session = Depends(get_db),
    token_payload: dict = Depends(get_current_user),
):
    """
    Stateless provider health check.
    In the new architecture, we just report whether the user has
    connected accounts (Integration records with valid tokens and CONNECTED status).
    """
    from app.models.integration import Integration, IntegrationProvider, IntegrationStatus

    user_id = token_payload.get("sub")
    membership = db.query(Membership).filter(Membership.user_id == user_id).first()
    if not membership:
        raise HTTPException(status_code=404, detail="Workspace not found")

    workspace_id = membership.workspace_id

    # Check for Integration records with tokens
    integrations = db.query(Integration).filter(
        Integration.workspace_id == workspace_id
    ).all()

    google_connected = any(
        i.provider in ("google", "google_gmail", "GOOGLE_GMAIL", IntegrationProvider.GOOGLE_GMAIL) 
        and i.token_encrypted 
        and i.status == IntegrationStatus.CONNECTED
        for i in integrations
    )
    microsoft_connected = any(
        i.provider in ("microsoft", "outlook", "OUTLOOK", IntegrationProvider.OUTLOOK) 
        and i.token_encrypted 
        and i.status == IntegrationStatus.CONNECTED
        for i in integrations
    )

    email_accessible = google_connected or microsoft_connected

    return {
        "status": "ok",
        "data": {
            "email_accessible": email_accessible,
            "calendar_accessible": email_accessible,  # Calendar comes with same OAuth scope
            "providers": {
                "google_gmail": "CONNECTED" if google_connected else "NOT_CONNECTED",
                "outlook": "CONNECTED" if microsoft_connected else "NOT_CONNECTED",
            },
            "email_health": {
                "connected": email_accessible,
                "provider": "google_gmail" if google_connected else ("outlook" if microsoft_connected else None),
                "status": "OK" if email_accessible else "NO_TOKEN",
                "error_code": None if email_accessible else "NO_INTEGRATION",
            },
            "calendar_health": {
                "connected": email_accessible,
                "provider": "google_calendar" if google_connected else ("outlook_calendar" if microsoft_connected else None),
                "status": "OK" if email_accessible else "NO_TOKEN",
                "error_code": None if email_accessible else "NO_INTEGRATION",
            },
        },
    }


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
        "app.main:app",
        host=settings.server_host,
        port=settings.server_port,
        reload=settings.debug,
    )
