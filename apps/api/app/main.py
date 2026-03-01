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
from app.dependencies import get_current_context, CurrentContext
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

# ── Lifespan ─────────────────────────────────────────────────────────────

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(application: FastAPI):
    """Modern lifespan context manager (replaces deprecated on_event)."""
    # ── STARTUP ──────────────────────────────────────────────────────
    import app.models  # noqa: F401  — ensure all models registered
    import asyncio

    # PROVISION MISSING TABLES: auto-create missing tables on boot.
    # Safe to run on Postgres/SQLite, only creates completely missing tables (e.g. drafts) without dropping existing ones.
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("✅ Database schema validated and missing tables provisioned.")
    except Exception as e:
        # Postgres throws UniqueViolation for internal types (like ENUMs) if they already exist.
        # This is expected and safe to ignore since Alembic handles actual migrations.
        logger.warning(f"Note: Auto-provisioning skipped due to existing schema constraints. {e}")

    # Start the async background worker loop
    from app.core.queue import queue, JobType
    from app.workers.local_sync import process_sync_provider, process_ai_triage, process_drafting, process_heartbeat
    from app.workers.followup_worker import process_auto_followup
    from app.workers.notetaker_worker import process_meeting_job
    handlers = {
        JobType.SYNC_PROVIDER.value: process_sync_provider,
        JobType.AI_TRIAGE.value: process_ai_triage,
        JobType.PROCESS_DRAFT.value: process_drafting,
        JobType.AUTO_FOLLOWUP.value: process_auto_followup,
        JobType.HEARTBEAT.value: process_heartbeat,
        JobType.PROCESS_AUDIO.value: process_meeting_job,
    }

    worker_task = asyncio.create_task(queue.worker_loop(handlers))
    scheduler_task = asyncio.create_task(queue.scheduler_loop())

    logger.info("✅ Zroky API started (Event-Driven Local mode). Background async workers & scheduler running.")

    yield  # ── App is running ────────────────────────────────────────

    # ── SHUTDOWN ─────────────────────────────────────────────────────
    logger.info("Shutting down background workers...")
    worker_task.cancel()
    scheduler_task.cancel()
    for task in (worker_task, scheduler_task):
        try:
            await task
        except asyncio.CancelledError:
            pass
    logger.info("✅ Graceful shutdown complete.")

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    debug=False,
    lifespan=lifespan,
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
    
    import traceback
    err_msg = f"Global Unhandled Exception: {str(exc)}\n{traceback.format_exc()}"
    try:
        with open("last_error.txt", "w") as f:
            f.write(err_msg)
    except:
        pass

    content = {
        "error": {
            "code": "internal_error",
            "message": "Internal server error"
        }
    }

    # [Phase 10 Traceback Guard]: Do not expose tracebacks in production!
    if settings.DEBUG and getattr(settings, "environment", "development") == "development":
        import traceback
        content["error"]["message"] = f"Internal server error: {str(exc)}"
        content["error"]["traceback"] = traceback.format_exc()

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=content,
    )



# ── CORS ─────────────────────────────────────────────────────────────────

# ── CORS ─────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=settings.CORS_CREDENTIALS,
    allow_methods=settings.CORS_METHODS,
    allow_headers=settings.CORS_HEADERS,
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
    return {"message": "Welcome to Zroky API", "version": settings.APP_VERSION}


@app.post("/admin/zdr/purge-now", tags=["admin", "zdr"])
async def trigger_zdr_purge(
    request: Request,
    hours_ttl: int = 24,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """
    Manually trigger the Zero Data Retention (ZDR) policy.
    Anonymizes all PII from TriagedEmail records older than the specified TTL.

    Security: Requires authentication + ADMIN_SECRET header + debug mode.
    """
    # Gate 1: Debug-only — never available in production
    if not settings.DEBUG:
        raise HTTPException(status_code=404, detail="Not found")

    # Gate 2: Require admin secret header
    admin_secret = request.headers.get("X-Admin-Secret", "")
    expected_secret = getattr(settings, "SECRET_KEY", None)
    if not admin_secret or not expected_secret or admin_secret != expected_secret:
        raise HTTPException(status_code=403, detail="Forbidden: invalid admin credentials")

    from app.workers.zdr_purge import purge_stale_pii

    logger.info("Manual ZDR Purge triggered by user=%s with TTL=%dh", user.get("sub", "unknown"), hours_ttl)

    anonymized_count, errors = purge_stale_pii(db, hours_ttl=hours_ttl)

    if errors > 0:
        return {"status": "error", "message": "ZDR Purge encountered errors. Check logs."}

    return {
        "status": "success",
        "message": f"ZDR Policy enforced. Successfully anonymized {anonymized_count} stale records."
    }


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
    context: CurrentContext = Depends(get_current_context),
):
    """
    Stateless provider health check.
    In the new architecture, we just report whether the user has
    connected accounts (Integration records with valid tokens and CONNECTED status).
    """
    from app.models.integration import Integration, IntegrationProvider, IntegrationStatus

    workspace_id = context.workspace_id

    # Check for Integration records with tokens
    integrations = db.query(Integration).filter(
        Integration.workspace_id == workspace_id
    ).all()

    # Normalize providers for matching
    google_connected = any([
        i.provider in ("google", "google_gmail", "GOOGLE_GMAIL", IntegrationProvider.GOOGLE_GMAIL) 
        and i.token_encrypted 
        and i.status == IntegrationStatus.CONNECTED
        for i in integrations
    ])
    microsoft_connected = any([
        i.provider in ("microsoft", "outlook", "OUTLOOK", IntegrationProvider.OUTLOOK) 
        and i.token_encrypted 
        and i.status == IntegrationStatus.CONNECTED
        for i in integrations
    ])

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
    return {"name": "zroky-api", "version": settings.APP_VERSION}


@app.get("/me")
async def get_current_user_profile(
    token_payload: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_id = token_payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Missing user identity")

    user = db.query(User).filter(User.id == user_id).first()
    
    # Auto-provision user if missing
    if not user:
        user = User(
            id=user_id,
            email=token_payload.get("email") or f"{user_id}@clerk.local",
            hashed_password="",
            full_name=token_payload.get("user_metadata", {}).get("full_name")
            if isinstance(token_payload.get("user_metadata"), dict) else None,
            is_active=True,
        )
        db.add(user)
        db.commit()

    workspace_id = token_payload.get("workspace_id")
    if workspace_id == "default":
        workspace_id = None
        
    query = db.query(Membership).filter(Membership.user_id == user_id)
    if workspace_id:
        membership = query.filter(Membership.workspace_id == workspace_id).first()
    else:
        membership = query.first()

    if not membership and workspace_id:
        membership = db.query(Membership).filter(Membership.user_id == user_id).first()

    if not membership:
        import uuid
        import re
        from app.models.workspace import Workspace
        from app.models.membership import MembershipRole
        
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
        name = ws_name or f"{(user.email.split('@')[0] if user.email else 'My').title()} Workspace"
        slug = _unique_slug(_slugify(name))
        
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
        host=settings.SERVER_HOST,
        port=settings.SERVER_PORT,
        reload=False,
    )
