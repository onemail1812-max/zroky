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

    # [Phase 10 Traceback Guard]: Do not expose tracebacks in production!
    if settings.debug and getattr(settings, "environment", "development") == "development":
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
    # [Phase 10 SQLite Guard]: Dev-friendly auto-create tables for SQLite only in debug mode.
    if settings.database_url.startswith("sqlite") and settings.debug:
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

# Removed Global RateLimiterMiddleware (120 req/min) in favor of slowapi per-endpoint limits


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
async def health_check_workers(
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user)
):
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
        raise HTTPException(status_code=404, detail="User profile or workspace not found. Please complete onboarding.")

    return {
        "user_id": user.id,
        "workspace_id": membership.workspace_id,
        "role": membership.role,
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
