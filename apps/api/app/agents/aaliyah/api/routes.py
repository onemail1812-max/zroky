"""Aaliyah API router with secure defaults and live event streaming."""

from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone
import threading
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, WebSocket, WebSocketDisconnect, status
from app.logging_config import get_logger

logger = get_logger(__name__)
from fastapi.responses import StreamingResponse
from jose import JWTError, jwt
from pydantic import BaseModel, Field, field_validator
import json
from sqlalchemy.orm import Session
from sqlalchemy import or_, text
from sqlalchemy.orm.attributes import flag_modified

from app.config import settings
from app.database import SessionLocal, get_db
from app.dependencies import CurrentContext, get_current_context
from app.security import get_current_user
from app.models.audit_log import AuditLog
from app.models.workspace import Workspace
from app.models.draft_template import DraftTemplate
from app.agents.aaliyah.core.labeling_rules import ALLOWED_LABELS, DEFAULT_LABELS, LabelingRulesEngine
from app.agents.aaliyah.core.live_feed import LiveEvent, event_bus
from app.agents.aaliyah.core.action_executor import ActionExecutor
from app.agents.aaliyah.core.orchestrator import AaliyahOrchestrator
from app.agents.aaliyah.core.request_controls import InMemoryIdempotencyStore, InMemoryRateLimiter
from app.agents.aaliyah.core.undo_service import UndoService
from app.agents.aaliyah.core.briefing_service import MorningBriefingService
from app.agents.aaliyah.core.meeting_prep import MeetingPrepAgent
from dataclasses import asdict
from app.services.brain.guardrails import redact_text
from app.core.queue import queue, JobType
from app.services.audit_log_service import AuditLogService, AuditAction, AuditEntityType
from app.agents.aaliyah.core.greeting_service import GreetingService
router = APIRouter(
    prefix="/aaliyah",
    tags=["aaliyah"],
)

_orchestrator_lock = threading.Lock()
_orchestrators: dict[str, AaliyahOrchestrator] = {}

_ask_rate_limiter = InMemoryRateLimiter(max_requests=60, window_seconds=60)
_webhook_rate_limiter = InMemoryRateLimiter(max_requests=60, window_seconds=60)
_sync_rate_limiter = InMemoryRateLimiter(max_requests=5, window_seconds=60)
_idempotency_store = InMemoryIdempotencyStore(ttl_seconds=3600)
_LIVE_TOKEN_TTL_SECONDS = 30


class UserMessage(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    workspace_id: Optional[str] = None


class WebhookEvent(BaseModel):
    type: str = Field(min_length=1, max_length=128)
    payload: Dict[str, Any] = Field(default_factory=dict)
    workspace_id: Optional[str] = None


class SyncRequest(BaseModel):
    workspace_id: Optional[str] = None
    provider: str = Field(default="auto", max_length=30)
    max_results: int = Field(default=25, ge=1, le=200)
    window_days: int = Field(default=7, ge=1, le=30)
    buffer_minutes: int = Field(default=15, ge=0, le=120)
    force: bool = False  # Added for admin overrides


class TemplateRequest(BaseModel):
    workspace_id: Optional[str] = None
    name: str = Field(min_length=1, max_length=100)
    subject: Optional[str] = Field(default=None, max_length=200)
    body: str = Field(min_length=1)


class AaliyahSettingsRequest(BaseModel):
    workspace_id: Optional[str] = None
    # Inbox & Autopilot
    organize_inbox_enabled: bool = True
    draft_replies_enabled: bool = True
    archive_less_important: bool = False
    track_follow_ups: bool = True
    follow_up_days: int = 3
    max_follow_ups: int = 2
    
    # Capabilities (Neural Modules)
    capabilities: list[str] = Field(default_factory=lambda: ["Organize inbox", "Draft email replies", "Track follow-ups"])
    
    # Meetings
    calendar_assist_enabled: bool = True
    working_hours_start: str = Field(default="09:00 AM", max_length=10)
    working_hours_end: str = Field(default="06:00 PM", max_length=10)
    default_meeting_duration: int = Field(default=30, ge=15, le=120)
    notes_mode: str = "manual"
    attend_meetings: bool = False

    # Persona & Voice
    draft_tone: Optional[str] = Field(default="Professional", max_length=50)
    signature: Optional[str] = Field(default=None, max_length=500)
    examples: Optional[str] = None
    
    # VIPs / Priority Registry
    vip_senders: list[str] = Field(default_factory=list)

    # Global Operations
    auto_send_enabled: bool = False
    
    # Approvals & Risk
    always_require_approval: bool = True
    approval_required_topics: list[str] = Field(default_factory=list)

    # ── 5-Point Rulebook ──
    # 1. Style DNA
    emoji_usage: bool = True
    directness: int = Field(default=3, ge=1, le=5)  # 1=Soft, 5=Direct
    draft_disclosure: bool = True

    # 2. Priority Logic
    project_keywords: list[str] = Field(default_factory=list)
    vip_roles: list[str] = Field(default_factory=list)

    # 3. Scheduling Protocols
    buffer_time_mins: int = Field(default=15, ge=0)
    focus_blocks: list[str] = Field(default_factory=list)
    morning_briefing_time: str = Field(default="08:30 AM", max_length=10)

    # 4. Handling Noise
    newsletter_policy: str = Field(default="archive") # "archive", "tab", "ignore"
    receipts_policy: str = Field(default="auto_label") # "auto_label", "ignore"



class SendDraftRequest(BaseModel):
    workspace_id: Optional[str] = None
    email_id: str = Field(min_length=1, max_length=256)
    is_explicit_approval: bool = False


class LabelingPreferencesRequest(BaseModel):
    workspace_id: Optional[str] = None
    enabled_labels: list[str] = Field(default_factory=lambda: list(DEFAULT_LABELS))
    vip_senders: list[str] = Field(default_factory=list, max_length=200)
    internal_domains: list[str] = Field(default_factory=list, max_length=50)
    keyword_rules: dict[str, list[str]] = Field(default_factory=dict)
    auto_label_enabled: bool = True
    auto_sync_interval_seconds: int = Field(default=120, ge=120, le=900)

    @field_validator("enabled_labels")
    @classmethod
    def validate_enabled_labels(cls, value: list[str]) -> list[str]:
        cleaned = [str(label).strip() for label in value if str(label).strip()]
        invalid = [label for label in cleaned if label not in ALLOWED_LABELS]
        if invalid:
            raise ValueError(f"Invalid labels: {', '.join(invalid)}")
        return cleaned or list(DEFAULT_LABELS)

    @field_validator("internal_domains")
    @classmethod
    def validate_domains(cls, value: list[str]) -> list[str]:
        return [str(item).strip().lower().lstrip("@") for item in value if str(item).strip()]


class UpdateDraftRequest(BaseModel):
    to: Optional[str] = None
    subject: Optional[str] = None
    body: str
    attachments: Optional[list[dict]] = None


class LabelOverrideRequest(BaseModel):
    workspace_id: Optional[str] = None
    scope: str = Field(pattern="^(message|thread)$")
    target_id: str = Field(min_length=1, max_length=256)
    disable_auto: bool = False
    labels: list[str] = Field(default_factory=list)
    mode: str = Field(default="replace", pattern="^(replace|add)$")

    @field_validator("labels")
    @classmethod
    def validate_labels(cls, value: list[str]) -> list[str]:
        cleaned = [str(label).strip() for label in value if str(label).strip()]
        invalid = [label for label in cleaned if label not in ALLOWED_LABELS]
        if invalid:
            raise ValueError(f"Invalid labels: {', '.join(invalid)}")
        return cleaned


def _get_orchestrator(workspace_id: str) -> AaliyahOrchestrator:
    with _orchestrator_lock:
        orchestrator = _orchestrators.get(workspace_id)
        if orchestrator is None:
            orchestrator = AaliyahOrchestrator(workspace_id=workspace_id)
            _orchestrators[workspace_id] = orchestrator
        return orchestrator


def _require_workspace_match(optional_workspace_id: Optional[str], context: CurrentContext) -> str:
    if optional_workspace_id and optional_workspace_id != context.workspace_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "workspace_mismatch",
                "message": "Cross-workspace access is denied",
            },
        )
    return context.workspace_id


def _rate_limit_or_throw(limiter: InMemoryRateLimiter, key: str) -> None:
    allowed, retry_after = limiter.check(key)
    if allowed:
        return
    raise HTTPException(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        headers={"Retry-After": str(retry_after)},
        detail={
            "code": "rate_limited",
            "message": "Too many requests",
            "retry_after_seconds": retry_after,
        },
    )


def _create_live_token(context: CurrentContext) -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=_LIVE_TOKEN_TTL_SECONDS)
    payload = {
        "sub": context.user_id,
        "workspace_id": context.workspace_id,
        "purpose": "aaliyah_live",
        "exp": expires_at,
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def _decode_live_token(stream_token: str) -> dict[str, Any]:
    try:
        payload = jwt.decode(stream_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "invalid_stream_token", "message": "Stream token is invalid or expired"},
        ) from exc

    if payload.get("purpose") != "aaliyah_live":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "invalid_stream_token", "message": "Stream token purpose mismatch"},
        )
    if not payload.get("workspace_id"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "invalid_stream_token", "message": "Stream token missing workspace context"},
        )
    return payload





@router.get("/status")
async def get_status(
    token_payload: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        user_id = token_payload.get("sub")
        workspace_id = token_payload.get("workspace_id")
        
        # If no workspace in token, try DB
        if not workspace_id or workspace_id == "default":
            from app.models.membership import Membership
            membership = db.query(Membership).filter(Membership.user_id == user_id).first()
            if membership:
                workspace_id = membership.workspace_id
                
        # If truly no workspace yet (onboarding incomplete), return idle safe state
        if not workspace_id:
            return {
                "status": "idle",
                "active_task": None,
                "pending_approvals": 0,
                "last_sync": {"gmail": None, "calendar": None},
                "last_updated_at": datetime.now(timezone.utc).isoformat()
            }
            
        orchestrator = _get_orchestrator(workspace_id)
        return orchestrator.get_status()
    except Exception as e:
        import traceback
        err_msg = f"Aaliyah Status Error: {str(e)}\n{traceback.format_exc()}"
        logger.error(err_msg)
        with open("last_error.txt", "w") as f:
            f.write(err_msg)
        raise HTTPException(status_code=500, detail=f"Status Error: {str(e)}")


# ── Onboarding Gate ──────────────────────────────────────────────────

class OnboardingCompleteRequest(BaseModel):
    capabilities: list[str] = Field(default_factory=list)
    working_hours_start: str = Field(default="09:00 AM", max_length=10)
    working_hours_end: str = Field(default="06:00 PM", max_length=10)
    meeting_duration: int = Field(default=30, ge=15, le=120)
    notes_mode: str = Field(default="manual", max_length=30)
    draft_tone: str = Field(default="Professional", max_length=50)
    signature: Optional[str] = Field(default=None, max_length=500)
    examples: Optional[str] = None
    vips: list[str] = Field(default_factory=list)
    safe_auto_send: bool = False
    follow_up_days: int = Field(default=3, ge=1, le=14)
    max_follow_ups: int = Field(default=2, ge=0, le=5)
    always_require_approval: bool = True
    approval_required_topics: list[str] = Field(default_factory=list)

    # ── 5-Point Rulebook ──
    # 1. Style DNA
    emoji_usage: bool = True
    directness: int = Field(default=3, ge=1, le=5)  # 1=Soft, 5=Direct
    draft_disclosure: bool = True

    # 2. Priority Logic
    project_keywords: list[str] = Field(default_factory=list)
    vip_roles: list[str] = Field(default_factory=list)

    # 3. Scheduling Protocols
    buffer_time_mins: int = Field(default=15, ge=0)
    focus_blocks: list[str] = Field(default_factory=list)
    morning_briefing_time: str = Field(default="08:30 AM", max_length=10)

    # 4. Handling Noise
    newsletter_policy: str = Field(default="archive") # "archive", "tab", "ignore"
    receipts_policy: str = Field(default="auto_label") # "auto_label", "ignore"


@router.get("/onboarding/status")
async def get_onboarding_status(
    context: CurrentContext = Depends(get_current_context),
    db: Session = Depends(get_db),
):
    """Check whether the workspace has completed onboarding."""
    try:
        workspace = db.query(Workspace).filter(Workspace.id == context.workspace_id).first()
        if not workspace:
            # Auto-create workspace rather than erroring - this can happen for new users
            logger.warning(f"Workspace {context.workspace_id} not found in onboarding/status — returning pending")
            return {"onboarding_status": "pending", "first_name": None}

        from app.models.user import User
        user = db.query(User).filter(User.id == context.user_id).first()
        
        # Safe extraction of first name (guard against user being None)
        first_name = None
        if user and user.full_name:
            parts = user.full_name.strip().split()
            first_name = parts[0] if parts else None

        return {
            "onboarding_status": getattr(workspace, "onboarding_status", "pending") or "pending",
            "first_name": first_name,
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback_str = traceback.format_exc()
        try:
            with open("last_error.txt", "w") as f:
                f.write(traceback_str)
        except:
            pass
        logger.error(f"Onboarding Status Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Onboarding Error: {str(e)}")


@router.post("/onboarding/complete")
async def complete_onboarding(
    payload: OnboardingCompleteRequest,
    context: CurrentContext = Depends(get_current_context),
    db: Session = Depends(get_db),
):
    """Mark onboarding as completed and persist preferences."""
    workspace = db.query(Workspace).filter(Workspace.id == context.workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    # Persist preferences into workspace settings
    current_settings = dict(getattr(workspace, "settings_json", {}) or {})
    if "aaliyah" not in current_settings:
        current_settings["aaliyah"] = {}

    current_settings["aaliyah"].update({
        "capabilities": payload.capabilities,
        "working_hours_start": payload.working_hours_start,
        "working_hours_end": payload.working_hours_end,
        "default_meeting_duration": payload.meeting_duration,
        "notes_mode": payload.notes_mode,
        "draft_tone": payload.draft_tone,
        "signature": payload.signature,
        "examples": payload.examples,
        "auto_send_enabled": payload.safe_auto_send,
        "follow_up_days": payload.follow_up_days,
        "max_follow_ups": payload.max_follow_ups,
        "vip_senders": payload.vips,
        "always_require_approval": payload.always_require_approval,
        "approval_required_topics": payload.approval_required_topics,
        
        # ── 5-Point Rulebook ──
        "emoji_usage": payload.emoji_usage,
        "directness": payload.directness,
        "draft_disclosure": payload.draft_disclosure,
        "project_keywords": payload.project_keywords,
        "vip_roles": payload.vip_roles,
        "buffer_time_mins": payload.buffer_time_mins,
        "focus_blocks": payload.focus_blocks,
        "morning_briefing_time": payload.morning_briefing_time,
        "newsletter_policy": payload.newsletter_policy,
        "receipts_policy": payload.receipts_policy,

        # Derived boolean flags for cross-form consistency
        "organize_inbox_enabled": "Organize inbox" in payload.capabilities,
        "draft_replies_enabled": "Draft email replies" in payload.capabilities,
        "archive_less_important": "Archive less important emails" in payload.capabilities,
        "track_follow_ups": "Track follow-ups" in payload.capabilities,
        "calendar_assist_enabled": "Manage your calendar" in payload.capabilities,
        "attend_meetings": "Attend meetings and take notes" in payload.capabilities,
    })

    workspace.settings_json = current_settings
    workspace.onboarding_status = "completed"
    flag_modified(workspace, "settings_json")
    flag_modified(workspace, "onboarding_status")
    db.commit() # Save object changes
    
    # FORCE UPDATE via SQL to ensure persistence in SQLite/WAL
    import json
    try:
        db.execute(
            text("UPDATE workspaces SET onboarding_status = 'completed', settings_json = :sj WHERE id = :wid"),
            {"sj": json.dumps(current_settings), "wid": workspace.id}
        )
        db.commit()
        logger.info(f"✅ [Onboarding] Status & Settings updated for workspace {workspace.id}")
    except Exception as e:
        logger.error(f"❌ [Onboarding] SQL Update failed: {e}")
        db.rollback()
        raise e

    from app.models.user import User
    user = db.query(User).filter(User.id == context.user_id).first()
    first_name = (user.full_name or "").split()[0] if user and user.full_name else None

    # 3. Check health to determine welcome message (Truth Gating)
    from app.services.integrations.health_service import ConnectorHealthService
    health_svc = ConnectorHealthService(db, workspace.id)
    health_info = health_svc.get_detailed_health()
    
    email_status = health_info.get("email", {}).get("status", "NOT_CONNECTED")
    email_ok = email_status == "OK"

    # Use first name in message if available
    name_display = first_name or "there"
    if email_ok:
        welcome_msg = f"Done, {name_display} ✅\nI'm now syncing your inbox and preparing drafts. You'll see updates here."
    else:
        welcome_msg = f"Protocols configured, {name_display}. However, your email is not connected.\nAuthorize Gmail or Outlook in settings to start syncing."

    return {
        "status": "completed", 
        "onboarding_status": "completed",
        "workspace_id": workspace.id,
        "first_name": first_name,
        "message": welcome_msg,
        "health": health_info
    }


@router.post("/preflight/run")
async def run_preflight(
    context: CurrentContext = Depends(get_current_context),
    db: Session = Depends(get_db),
):
    """Run morning preflight checks (Daily Gate)."""
    from app.services.integrations.health_service import ConnectorHealthService
    
    workspace = db.query(Workspace).filter(Workspace.id == context.workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
        
    health_svc = ConnectorHealthService(db, workspace.id)
    health_info = health_svc.get_detailed_health()
    
    email_status = health_info.get("email", {}).get("status", "NOT_CONNECTED")
    email_ok = email_status == "OK"
    
    # Store result in settings
    current_settings = dict(getattr(workspace, "settings_json", {}) or {})
    if "aaliyah" not in current_settings:
        current_settings["aaliyah"] = {}
        
    preflight_result = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "status": "OK" if email_ok else "RE-AUTHORIZE_REQUIRED",
        "email_connected": email_ok,
        "health": health_info
    }
    
    current_settings["aaliyah"]["last_preflight_result"] = preflight_result
    workspace.settings_json = current_settings
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(workspace, "settings_json")
    db.commit()
    
    # Audit Log
    AuditLogService.log_action(
        db=db,
        workspace_id=context.workspace_id,
        user_id="ai_agent",
        action=AuditAction.EXECUTE,
        entity_type=AuditEntityType.INTEGRATION,
        entity_id="preflight_check",
        metadata={
            "result_status": preflight_result["status"],
            "email_connected": email_ok
        },
        explain_one_liner=f"Ran preflight check: {preflight_result['status']}"
    )

    return preflight_result


@router.get("/greeting")
async def get_greeting(
    context: CurrentContext = Depends(get_current_context),
    db: Session = Depends(get_db),
):
    """Retrieve the intelligent dynamic greeting for the morning briefing."""
    svc = GreetingService(db, context.workspace_id, context.user_id)
    return svc.get_greeting_state()

@router.get("/briefing")
async def get_briefing(
    generate: bool = False,
    context: CurrentContext = Depends(get_current_context),
    db: Session = Depends(get_db),
):
    """Generate or retrieve today's briefing."""
    svc = MorningBriefingService(db, context.workspace_id)
    
    if generate:
        import asyncio
        # Run the slow LLM generation in the background
        # It will broadcast "briefing_ready" SSE event when done
        async def _generate_task():
            # Need a new DB session for the background task
            from app.database import SessionLocal
            bg_db = SessionLocal()
            try:
                bg_svc = MorningBriefingService(bg_db, context.workspace_id)
                content = await bg_svc.generate_fresh_briefing()
                # Broadcast the event
                orchestrator = _get_orchestrator(context.workspace_id)
                await orchestrator._emit("briefing_ready", "Morning briefing is ready", {
                    "content": content,
                    "date": datetime.now(timezone.utc).isoformat()
                })
            finally:
                bg_db.close()
                
        asyncio.create_task(_generate_task())
        return {"status": "generating"}

    content = await svc.get_briefing()
    return {"content": content, "date": datetime.now(timezone.utc).isoformat()}


@router.get("/stats")
async def get_stats(
    context: CurrentContext = Depends(get_current_context),
):
    try:
        orchestrator = _get_orchestrator(context.workspace_id)
        return orchestrator.get_stats()
    except Exception as e:
        import traceback
        err_msg = f"Aaliyah Stats Error: {str(e)}\n{traceback.format_exc()}"
        logger.error(err_msg)
        with open("last_error.txt", "w") as f:
            f.write(err_msg)
        raise HTTPException(status_code=500, detail=f"Stats Error: {str(e)}")


@router.get("/live/token")
async def get_live_token(
    context: CurrentContext = Depends(get_current_context),
):
    token = _create_live_token(context)
    return {"stream_token": token, "expires_in_seconds": _LIVE_TOKEN_TTL_SECONDS}


@router.get("/live/stream")
async def live_stream(
    request: Request,
):
    """Canonical SSE stream with real event subscription via Redis."""
    from fastapi.responses import StreamingResponse
    import redis.asyncio as redis
    from app.config import settings

    authorization = request.headers.get("Authorization")
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")
    stream_token = authorization.split(" ")[1]

    payload = _decode_live_token(stream_token)
    workspace_id = str(payload["workspace_id"])
    redis_url = getattr(settings, "REDIS_URL", "redis://localhost:6379/0")

    async def event_generator():
        # Yield initial connection event
        initial = LiveEvent(
            workspace_id=workspace_id,
            type="connected",
            message="Live stream connected to Event Bus",
            payload={"connected_at": datetime.now(timezone.utc).isoformat()},
        )
        yield initial.to_sse()

        from app.agents.aaliyah.core.live_feed import event_bus
        last_event_id = request.headers.get("Last-Event-ID")
        try:
            async for event in event_bus.subscribe(workspace_id, last_event_id=last_event_id):
                if await request.is_disconnected():
                    break
                yield event.to_sse()
        except asyncio.CancelledError:
            pass

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/inbox")
async def get_inbox(
    limit: int = Query(default=50, ge=1, le=200),
    category: Optional[str] = Query(default=None),
    priority: Optional[str] = Query(default=None),
    include_noise: bool = Query(default=False),
    context: CurrentContext = Depends(get_current_context),
    db: Session = Depends(get_db),
):
    try:
        orchestrator = _get_orchestrator(context.workspace_id)
        return await orchestrator.list_inbox(
            db,
            limit=limit,
            category=category,
            priority=priority,
            include_noise=include_noise,
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Inbox fetch failed: {str(e)}")


@router.get("/counts")
async def get_counts(
    context: CurrentContext = Depends(get_current_context),
    db: Session = Depends(get_db),
):
    """Canonical counts (Sprint 1)"""
    try:
        orchestrator = _get_orchestrator(context.workspace_id)
        stats = orchestrator.get_stats(db)
        return stats
    except Exception as e:
        import traceback
        err_msg = f"Aaliyah Counts Error: {str(e)}\n{traceback.format_exc()}"
        logger.error(err_msg)
        with open("last_error.txt", "w") as f:
            f.write(err_msg)
        raise HTTPException(status_code=500, detail=f"Counts Error: {str(e)}")


@router.get("/threads")
async def get_threads(
    queue: Optional[str] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    context: CurrentContext = Depends(get_current_context),
    db: Session = Depends(get_db),
):
    """Canonical threads list (Sprint 1)"""
    orchestrator = _get_orchestrator(context.workspace_id)
    
    # Map 'queue' to category/priority if needed, or just pass as category
    category = queue if queue and queue not in ["high_priority", "escalations"] else None
    priority = "High" if queue == "high_priority" else None
    
    return await orchestrator.list_inbox(
        db,
        limit=limit,
        category=category,
        priority=priority,
        queue=queue,
    )


@router.get("/threads/{message_id}")
async def get_thread_item(
    message_id: str,
    context: CurrentContext = Depends(get_current_context),
    db: Session = Depends(get_db),
):
    """Canonical thread details (Sprint 1)"""
    row = db.query(TriagedEmail).filter(
        TriagedEmail.id == message_id,
        TriagedEmail.workspace_id == context.workspace_id
    ).first()

    if not row:
        # Try finding by thread_id if message_id fails
        row = db.query(TriagedEmail).filter(
            TriagedEmail.thread_id == message_id,
            TriagedEmail.workspace_id == context.workspace_id
        ).order_by(TriagedEmail.received_at.desc()).first()

    if not row:
        raise HTTPException(status_code=404, detail="Thread or message not found")

    # Extract the draft object
    draft_obj = (row.metadata_json or {}).get("draft")
    if draft_obj and "rationale" in draft_obj:
        draft_obj["reasoning"] = draft_obj["rationale"]

    # For Sprint 1, we return the triaged metadata which contains the summary and draft.
    # In a full 'thread' view, we would join with the actual messages.
    return {
        "id": row.id,
        "thread_id": row.thread_id,
        "subject": row.subject,
        "sender": row.sender,
        "snippet": row.snippet,
        "category": row.category,
        "priority": row.priority,
        "status": (row.metadata_json or {}).get("draft", {}).get("status", "pending_approval"),
        "draft": draft_obj,
        "received_at": row.received_at.isoformat() if row.received_at else None,
        # Flattened for simple FE consumption
        "title": row.subject or "No Subject",
        "subtitle": row.snippet,
        "timestamp": row.received_at.strftime("%I:%M %p") if row.received_at else "Unknown",
    }


@router.put("/inbox/{message_id}/draft")
async def update_draft(
    message_id: str,
    payload: UpdateDraftRequest,
    db: Session = Depends(get_db),
    context: CurrentContext = Depends(get_current_context),
):
    """
    Update the draft metadata for an email in the Aaliyah workflow.
    """
    row = db.query(TriagedEmail).filter(
        TriagedEmail.id == message_id,
        TriagedEmail.workspace_id == context.workspace_id
    ).first()

    if not row:
        raise HTTPException(status_code=404, detail="Email not found")

    meta = dict(row.metadata_json or {})
    draft = meta.get("draft", {})
    
    # Update draft fields
    if payload.to is not None: draft["to"] = payload.to
    if payload.subject is not None: draft["subject"] = payload.subject
    draft["body"] = payload.body
    if payload.attachments is not None:
        draft["attachments"] = payload.attachments

    meta["draft"] = draft
    row.metadata_json = meta
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(row, "metadata_json")
    db.commit()

    return {"status": "ok", "draft": draft}

@router.post("/drafts/send")
async def send_draft_action(
    payload: SendDraftRequest,
    db: Session = Depends(get_db),
    context: CurrentContext = Depends(get_current_context),
):
    """
    Approve and send an Aaliyah email draft (Human-in-the-Loop Gate).
    """
    # 1. Verification
    _require_workspace_match(payload.workspace_id, context)
    
    from app.models.triaged_email import TriagedEmail
    from app.models.triaged_thread import TriagedThread
    
    email_row = db.query(TriagedEmail).filter(
        TriagedEmail.id == payload.email_id,
        TriagedEmail.workspace_id == context.workspace_id
    ).first()

    if not email_row:
        raise HTTPException(status_code=404, detail="Email not found")

    meta = dict(email_row.metadata_json or {})
    draft = meta.get("draft")

    if not draft:
        raise HTTPException(status_code=400, detail="No draft exists for this message")

    if draft.get("status") == "sent":
        raise HTTPException(status_code=400, detail="Draft already sent")

    # 2. Update Draft Status
    draft["status"] = "sent"
    draft["sent_at"] = datetime.now(timezone.utc).isoformat()
    meta["draft"] = draft
    email_row.metadata_json = meta
    email_row.requires_approval = False
    
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(email_row, "metadata_json")
    
    # 3. Mark the thread as resolved (no longer needing approval/awaiting reply)
    if email_row.thread_id:
        thread_row = db.query(TriagedThread).filter(
            TriagedThread.external_thread_id == email_row.thread_id,
            TriagedThread.workspace_id == context.workspace_id
        ).first()
        if thread_row:
            thread_row.requires_approval = False
            thread_row.awaiting_reply = False
            thread_row.draft_json = draft
            flag_modified(thread_row, "draft_json")

    db.commit()

    # 4. Trigger actual sending mechanism (Push to Gmail/Outlook APIs)
    from app.services.integrations.token_store import get_valid_token
    token = await get_valid_token(db, context.workspace_id, email_row.provider)
    if token:
        try:
            if email_row.provider == "google":
                from app.services.integrations.google_gmail import GmailService
                service = GmailService(token)
                await service.send_message(
                    to=draft.get("to", ""),
                    subject=draft.get("subject", ""),
                    text=draft.get("body", ""),
                    thread_id=email_row.thread_id
                )
            elif email_row.provider == "microsoft":
                from app.services.integrations.microsoft_outlook import OutlookService
                service = OutlookService(token)
                await service.send_message(
                    to=draft.get("to", ""),
                    subject=draft.get("subject", ""),
                    text=draft.get("body", "")
                )
        except Exception as e:
            # Log the error but proceed with resolving the local state for now.
            import logging
            logging.error(f"Failed to send email draft via {email_row.provider}: {e}")

    # 5. Broadcast live events
    orchestrator = _get_orchestrator(context.workspace_id)
    await orchestrator._emit("draft_sent", "Draft was sent", {"message_id": email_row.id, "thread_id": email_row.thread_id})
    await orchestrator.get_stats(db) # Triggers counts update
    
    # 6. Audit Logging
    AuditLogService.log_action(
        db=db,
        workspace_id=context.workspace_id,
        user_id=context.user_id,
        action=AuditAction.UPDATE,
        entity_type=AuditEntityType.ARTIFACT,
        entity_id=payload.email_id,
        metadata={"action": "send_draft", "subject": draft.get("subject", "No subject")},
        explain_one_liner="Approved and sent email draft."
    )

    return {"status": "sent", "message_id": email_row.id}


@router.get("/calendar/conflicts")
async def get_calendar_conflicts(
    limit: int = Query(default=50, ge=1, le=200),
    context: CurrentContext = Depends(get_current_context),
    db: Session = Depends(get_db),
):

    orchestrator = _get_orchestrator(context.workspace_id)
    return orchestrator.list_calendar_conflicts(db, limit=limit)


@router.get("/calendar/events/{event_id}/prep")
async def get_or_create_meeting_prep(
    event_id: str,
    force: bool = Query(default=False),
    context: CurrentContext = Depends(get_current_context),
    db: Session = Depends(get_db),
):
    """Get or generate a meeting cheat sheet."""

    
    agent = MeetingPrepAgent(db=db, workspace_id=context.workspace_id)
    
    # Check if already exists (via agent helper or manually)
    event = agent._get_event(event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    meta = event.metadata_json or {}
    existing_prep = meta.get("meeting_prep")
    
    if existing_prep and not force:
        return {"status": "ready", "prep": existing_prep}

    # Generate
    briefing = await agent.generate_meeting_briefing(event.id)
    if not briefing:
         raise HTTPException(status_code=500, detail="Failed to generate briefing")

    # Save
    meta["meeting_prep"] = asdict(briefing)
    event.metadata_json = dict(meta)
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(event, "metadata_json")
    db.commit()

    return {"status": "created", "prep": asdict(briefing)}


@router.get("/calendar/upcoming")
async def list_upcoming_meetings(
    limit: int = Query(default=10, ge=1, le=50),
    lookahead_hours: int = Query(default=24, ge=1, le=72),
    context: CurrentContext = Depends(get_current_context),
    db: Session = Depends(get_db),
):
    """List upcoming meetings, including prepared cheat sheets."""

    
    from app.models.calendar_event_snapshot import CalendarEventSnapshot
    # Use naive UTC to match database storage if needed
    now = datetime.now(timezone.utc)
    future = now + timedelta(hours=lookahead_hours)
    
    try:
        events = (
            db.query(CalendarEventSnapshot)
            .filter(
                CalendarEventSnapshot.workspace_id == context.workspace_id,
                CalendarEventSnapshot.start_at >= now,
                CalendarEventSnapshot.start_at <= future,
                CalendarEventSnapshot.is_cancelled == False
            )
            .order_by(CalendarEventSnapshot.start_at.asc())
            .limit(limit)
            .all()
        )
    except Exception:
        events = []
    
    return {
        "items": [
            {
                "id": e.id,
                "title": e.title,
                "start_at": e.start_at.isoformat(),
                "end_at": e.end_at.isoformat(),
                "organizer": e.organizer,
                "meeting_prep": (e.metadata_json or {}).get("meeting_prep"),
                "is_conflict": False # Could check against conflicts table if needed
            }
            for e in events
        ],
        "count": len(events)
    }


class TranscriptUpload(BaseModel):
    text: str = Field(min_length=10)
    platform: str = Field(default="manual")


@router.post("/calendar/events/{event_id}/transcript")
async def upload_meeting_transcript(
    event_id: str,
    payload: TranscriptUpload,
    context: CurrentContext = Depends(get_current_context),
    db: Session = Depends(get_db),
):
    """Upload a meeting transcript for summarization."""

    from app.agents.aaliyah.core.meeting_summarizer import MeetingSummarizer
    
    svc = MeetingSummarizer(db, context.workspace_id)
    try:
        tid = await svc.ingest_transcript(event_id, payload.text, payload.platform)
        # Trigger processing (async in background typically, but for now we call it directly or just return ID)
        # Assuming we want immediate results for demo? No, let's trigger it.
        # Fire and forget task?
        asyncio.create_task(svc.summarize_transcript(tid))
        
        return {"status": "processing", "transcript_id": tid}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to upload transcript: {str(e)}")


@router.get("/calendar/events/{event_id}/transcript")
async def get_meeting_transcript_summary(
    event_id: str,
    context: CurrentContext = Depends(get_current_context),
    db: Session = Depends(get_db),
):
    """Get the latest transcript summary for an event."""

    from app.models.meeting_transcript import MeetingTranscript
    
    # Get latest
    transcript = (
        db.query(MeetingTranscript)
        .filter(
            MeetingTranscript.event_id == event_id,
            MeetingTranscript.workspace_id == context.workspace_id
        )
        .order_by(MeetingTranscript.created_at.desc())
        .first()
    )
    
    if not transcript:
         raise HTTPException(status_code=404, detail="No transcript found for this event")
         
    return {
        "id": transcript.id,
        "status": transcript.status,
        "created_at": transcript.created_at,
        "summary": transcript.summary_json
    }


@router.post("/ask")
async def ask_aaliyah(
    msg: UserMessage,
    request: Request,
    context: CurrentContext = Depends(get_current_context),
    db: Session = Depends(get_db),
):
    workspace_id = _require_workspace_match(msg.workspace_id, context)

    _rate_limit_or_throw(_ask_rate_limiter, key=f"ask:{context.user_id}:{workspace_id}")
    orchestrator = _get_orchestrator(workspace_id)

    idem_key = request.headers.get("Idempotency-Key")
    cache_key = None
    if idem_key:
        cache_key = f"ask:{context.user_id}:{workspace_id}:{idem_key}"
        cached = _idempotency_store.get(cache_key)
        if cached is not None:
            return cached

    try:
        response = await orchestrator.handle_chat(db, user_id=context.user_id, message=msg.message)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "aaliyah_failed",
                "message": "Unable to process request at this time",
            },
        )

    if cache_key:
        _idempotency_store.set(cache_key, response)
    return response


@router.post("/webhook")
async def handle_webhook(
    event: WebhookEvent,
    request: Request,
    context: CurrentContext = Depends(get_current_context),
    db: Session = Depends(get_db),
):
    workspace_id = _require_workspace_match(event.workspace_id, context)

    _rate_limit_or_throw(_webhook_rate_limiter, key=f"webhook:{context.user_id}:{workspace_id}")
    orchestrator = _get_orchestrator(workspace_id)

    idem_key = request.headers.get("Idempotency-Key")
    cache_key = None
    if idem_key:
        cache_key = f"webhook:{context.user_id}:{workspace_id}:{idem_key}"
        cached = _idempotency_store.get(cache_key)
        if cached is not None:
            return cached

    try:
        result = await orchestrator.handle_webhook(
            db,
            user_id=context.user_id,
            event_type=event.type,
            payload=event.payload,
        )
        response = {"status": "received", "result": result}
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "webhook_failed",
                "message": "Unable to process webhook",
            },
        )

    if cache_key:
        _idempotency_store.set(cache_key, response)
    return response


@router.post("/sync/inbox")
async def sync_inbox(
    payload: SyncRequest,
    request: Request,
    context: CurrentContext = Depends(get_current_context),
    db: Session = Depends(get_db),
):
    workspace_id = _require_workspace_match(payload.workspace_id, context)
    _rate_limit_or_throw(_sync_rate_limiter, key=f"sync_inbox:{context.user_id}:{workspace_id}")
    
    # Gatekeeper: Email Health Check
    if not payload.force:
        from app.services.integrations.health_service import ConnectorHealthService
        health_svc = ConnectorHealthService(db, workspace_id)
        desc = health_svc.get_detailed_health()
        email_info = desc.get("email", {})
        email_status = email_info.get("status")
        
        if email_status != "OK":
             logger.warning(f"SYNC_BLOCKED: workspace={workspace_id} service=email reason={email_status} code={email_info.get('error_code')}")
             
             AuditLogService.log_action(
                 db=db,
                 workspace_id=workspace_id,
                 user_id=context.user_id,
                 action=AuditAction.EXECUTE,
                 entity_type=AuditEntityType.INTEGRATION,
                 entity_id=f"sync_inbox:{payload.provider}",
                 metadata={
                     "status": "blocked",
                     "reason": email_status,
                     "error_code": email_info.get("error_code")
                 },
                 explain_one_liner=f"Inbox sync blocked: {email_status}"
             )

             return {
                 "status": "skipped",
                 "reason": f"GatekeeperBlocked: Email status is {email_status}",
                 "health_code": email_info.get("error_code")
             }

    # Check manual idempotency first if desired, but queue handles dedupe
    idem_key = request.headers.get("Idempotency-Key")
    cache_key = None
    if idem_key:
        cache_key = f"sync_inbox:{context.user_id}:{workspace_id}:{idem_key}"
        cached = _idempotency_store.get(cache_key)
        if cached is not None:
             return cached

    job_payload = {
        "user_id": context.user_id,
        "workspace_id": workspace_id,
        "provider": payload.provider,
        "max_results": payload.max_results
    }
    # Dedupe ID drops rapid consecutive webhook clicks spanning identical user/workspace
    dedupe_trace = f"sync_inbox:{context.user_id}:{workspace_id}:{payload.provider}"
    job_id = await queue.enqueue(JobType.SYNC_PROVIDER, job_payload, dedupe_id=dedupe_trace)
    
    logger.info(f"SYNC_STARTED: workspace={workspace_id} job_id={job_id} type=inbox")

    AuditLogService.log_action(
        db=db,
        workspace_id=workspace_id,
        user_id=context.user_id,
        action=AuditAction.EXECUTE,
        entity_type=AuditEntityType.INTEGRATION,
        entity_id=f"sync_inbox:{payload.provider}",
        metadata={"job_id": job_id, "status": "started"},
        explain_one_liner="Started inbox sync"
    )


    response = {"status": "queued", "job_id": job_id}
    if cache_key:
        _idempotency_store.set(cache_key, response)
    return response


@router.post("/sync/calendar")
async def sync_calendar(
    payload: SyncRequest,
    request: Request,
    context: CurrentContext = Depends(get_current_context),
    db: Session = Depends(get_db),
):
    workspace_id = _require_workspace_match(payload.workspace_id, context)
    _rate_limit_or_throw(_sync_rate_limiter, key=f"sync_calendar:{context.user_id}:{workspace_id}")
    
    # Gatekeeper: Calendar Health Check
    if not payload.force:
        from app.services.integrations.health_service import ConnectorHealthService
        health_svc = ConnectorHealthService(db, workspace_id)
        desc = health_svc.get_detailed_health()
        cal_info = desc.get("calendar", {})
        cal_status = cal_info.get("status")
        
        if cal_status != "OK":
             logger.warning(f"SYNC_BLOCKED: workspace={workspace_id} service=calendar reason={cal_status} code={cal_info.get('error_code')}")
             
             AuditLogService.log_action(
                 db=db,
                 workspace_id=workspace_id,
                 user_id=context.user_id,
                 action=AuditAction.EXECUTE,
                 entity_type=AuditEntityType.INTEGRATION,
                 entity_id=f"sync_calendar:{payload.provider}",
                 metadata={
                     "status": "blocked",
                     "reason": cal_status,
                     "error_code": cal_info.get("error_code")
                 },
                 explain_one_liner=f"Calendar sync blocked: {cal_status}"
             )

             return {
                 "status": "skipped",
                 "reason": f"GatekeeperBlocked: Calendar status is {cal_status}",
                 "health_code": cal_info.get("error_code")
             }

    idem_key = request.headers.get("Idempotency-Key")
    cache_key = None
    if idem_key:
        cache_key = f"sync_calendar:{context.user_id}:{workspace_id}:{idem_key}"
        cached = _idempotency_store.get(cache_key)
        if cached is not None:
             return cached

    job_payload = {
        "user_id": context.user_id,
        "workspace_id": workspace_id,
        "provider": payload.provider,
        "window_days": payload.window_days,
        "buffer_minutes": payload.buffer_minutes,
        "kind": "calendar"
    }
    job_id = await queue.enqueue(JobType.SYNC_PROVIDER, job_payload)

    logger.info(f"SYNC_STARTED: workspace={workspace_id} job_id={job_id} type=calendar")

    AuditLogService.log_action(
        db=db,
        workspace_id=workspace_id,
        user_id=context.user_id,
        action=AuditAction.EXECUTE,
        entity_type=AuditEntityType.INTEGRATION,
        entity_id=f"sync_calendar:{payload.provider}",
        metadata={"job_id": job_id, "status": "started"},
        explain_one_liner="Started calendar sync"
    )

    response = {"status": "queued", "job_id": job_id}
    if cache_key:
        _idempotency_store.set(cache_key, response)
    return response


# ─────────────────────────────────────────────────────────────────────────────
# POST /sync/initial
# Fire-and-return: queue scoped inbox + calendar sync jobs immediately.
# Returns 202 so the UI can start polling /sync/status.
# ─────────────────────────────────────────────────────────────────────────────
@router.post("/sync/initial", status_code=202)
async def trigger_initial_sync(
    request: Request,
    context: CurrentContext = Depends(get_current_context),
    db: Session = Depends(get_db),
):
    """
    Scoped initial sync on first connect:
    - Inbox: last 7 days, capped at 200 threads
    - Calendar: next 14 days
    Returns IMMEDIATELY (202) — does NOT wait for sync to finish.
    Never returns 500. Errors are logged and services are added to blocked_services.
    """
    ws_id = context.workspace_id
    if not ws_id:
        raise HTTPException(status_code=400, detail="workspace_id required")

    inbox_job_id: Optional[str] = None
    calendar_job_id: Optional[str] = None
    blocked: list[str] = []
    detailed: dict = {}

    # Run the blocking health check in a thread pool so we don't block the event loop.
    # ConnectorHealthService._ping_provider_with_retry uses requests.get() (blocking I/O).
    try:
        from app.services.integrations.health_service import ConnectorHealthService
        import asyncio
        health_svc = ConnectorHealthService(db, ws_id)
        loop = asyncio.get_event_loop()
        detailed = await loop.run_in_executor(None, health_svc.get_detailed_health)
    except Exception as health_err:
        logger.warning(f"INITIAL_SYNC: health check failed for workspace={ws_id}, proceeding with blocked services. Error: {health_err}")
        # If health check itself fails, block both and return gracefully
        return {
            "status": "queued",
            "inbox_job_id": None,
            "calendar_job_id": None,
            "blocked_services": ["inbox", "calendar"],
            "blocked_reason": "health_check_failed",
            "inbox_scope": "last_7_days_200_threads",
            "calendar_scope": "next_14_days",
        }

    # Try to queue inbox sync
    email_info = detailed.get("email", {})
    if email_info.get("status") == "OK":
        try:
            inbox_payload = {
                "user_id": context.user_id,
                "workspace_id": ws_id,
                "provider": email_info.get("provider", "auto"),
                "max_results": 200,
                "initial": True,
            }
            inbox_job_id = await queue.enqueue(JobType.SYNC_PROVIDER, inbox_payload)
            logger.info(f"INITIAL_SYNC: inbox queued job={inbox_job_id} workspace={ws_id}")
        except Exception as inbox_err:
            logger.error(f"INITIAL_SYNC: failed to enqueue inbox job for workspace={ws_id}: {inbox_err}")
            blocked.append("inbox")
    else:
        logger.info(f"INITIAL_SYNC: inbox blocked, email status={email_info.get('status')} workspace={ws_id}")
        blocked.append("inbox")

    # Try to queue calendar sync
    cal_info = detailed.get("calendar", {})
    if cal_info.get("status") == "OK":
        try:
            calendar_payload = {
                "user_id": context.user_id,
                "workspace_id": ws_id,
                "provider": cal_info.get("provider", "auto"),
                "window_days": 14,
                "buffer_minutes": 15,
                "kind": "calendar",
            }
            calendar_job_id = await queue.enqueue(JobType.SYNC_PROVIDER, calendar_payload)
            logger.info(f"INITIAL_SYNC: calendar queued job={calendar_job_id} workspace={ws_id}")
        except Exception as cal_err:
            logger.error(f"INITIAL_SYNC: failed to enqueue calendar job for workspace={ws_id}: {cal_err}")
            blocked.append("calendar")
    else:
        logger.info(f"INITIAL_SYNC: calendar blocked, cal status={cal_info.get('status')} workspace={ws_id}")
        blocked.append("calendar")

    return {
        "status": "queued",
        "inbox_job_id": inbox_job_id,
        "calendar_job_id": calendar_job_id,
        "blocked_services": blocked,
        "inbox_scope": "last_7_days_200_threads",
        "calendar_scope": "next_14_days",
    }


# ─────────────────────────────────────────────────────────────────────────────
# GET /sync/status  — lightweight polling endpoint
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/sync/status")
async def get_sync_status(
    context: CurrentContext = Depends(get_current_context),
    db: Session = Depends(get_db),
):
    """
    Returns real-time sync status for inbox and calendar.
    Fast polling endpoint (< 50ms) — reads counts directly from DB.
    """
    try:
        ws_id = context.workspace_id
        if not ws_id:
            raise HTTPException(status_code=400, detail="workspace_id required")

        # Local imports inside function to avoid circular deps, but printing if they fail
        try:
            from app.models.triaged_email import TriagedEmail
            from app.models.calendar_event_snapshot import CalendarEventSnapshot
            from sqlalchemy import func as sqlfunc
        except ImportError as ie:
            print(f"CRITICAL: Import failed in get_sync_status: {ie}")
            logger.error(f"Import failed in get_sync_status: {ie}")
            raise HTTPException(status_code=500, detail=f"Import Error: {ie}")

        try:
             email_count = db.query(sqlfunc.count(TriagedEmail.id)).filter(
                 TriagedEmail.workspace_id == ws_id
             ).scalar() or 0
        except Exception as dbe:
             print(f"CRITICAL: Email count query failed: {dbe}")
             logger.error(f"Email count query failed: {dbe}")
             email_count = 0

        try:
             calendar_count = db.query(sqlfunc.count(CalendarEventSnapshot.id)).filter(
                 CalendarEventSnapshot.workspace_id == ws_id
             ).scalar() or 0
        except Exception as dbe:
             print(f"CRITICAL: Calendar count query failed: {dbe}")
             logger.error(f"Calendar count query failed: {dbe}")
             calendar_count = 0

        # Orchestrator State Access
        try:
            orchestrator_state = AaliyahOrchestrator._state.get(ws_id)
            # Default to safe empty state if not found
            if not orchestrator_state:
                # Lazy init state if possible or just use defaults
                last_sync = {"gmail": None, "calendar": None}
                runtime_status = "idle"
            else:
                 last_sync = orchestrator_state.last_sync
                 if last_sync is None: last_sync = {}
                 runtime_status = orchestrator_state.status or "idle"
        except Exception as state_exc:
             print(f"CRITICAL: Orchestrator state access failed: {state_exc}")
             logger.error(f"Orchestrator state access failed: {state_exc}")
             last_sync = {}
             runtime_status = "idle"

        is_syncing = runtime_status in ("thinking", "acting")
        inbox_synced_at = last_sync.get("gmail") or last_sync.get("outlook") or last_sync.get("auto")
        calendar_synced_at = last_sync.get("calendar")

        inbox_status = "syncing" if (is_syncing and email_count == 0 and not inbox_synced_at) else ("done" if (email_count > 0 or inbox_synced_at) else "waiting")
        calendar_status = "syncing" if (is_syncing and calendar_count == 0 and not calendar_synced_at) else ("done" if (calendar_count > 0 or calendar_synced_at) else "waiting")

        response = {
            "workspace_id": ws_id,
            "runtime_status": runtime_status,
            "inbox": {
                "status": inbox_status,
                "count": email_count,
                "synced_at": inbox_synced_at,
                "message": "Fetching last 7 days..." if inbox_status == "syncing"
                        else f"{email_count} emails synced" if inbox_status == "done"
                        else "Waiting for email connection",
            },
            "calendar": {
                "status": calendar_status,
                "count": calendar_count,
                "synced_at": calendar_synced_at,
                "message": "Fetching next 14 days..." if calendar_status == "syncing"
                        else f"{calendar_count} events synced" if calendar_status == "done"
                        else "Waiting for calendar connection",
            },
        }
        return response

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback_str = traceback.format_exc()
        print(f"CRITICAL: Sync Status 500: {traceback_str}")
        try:
            with open("last_sync_error.txt", "w") as f:
                f.write(traceback_str)
        except:
            pass
        logger.error(f"Sync Status Error: {str(e)}")
        # Raise generic 500 but with detail in logs
        raise HTTPException(status_code=500, detail=f"Sync Status Error: {str(e)}")


@router.get("/labeling/preferences")
async def get_labeling_preferences(
    context: CurrentContext = Depends(get_current_context),
    db: Session = Depends(get_db),
):

    engine = LabelingRulesEngine(db, context.workspace_id)
    return engine.get_preferences_payload()


@router.get("/settings")
async def get_aaliyah_settings(
    context: CurrentContext = Depends(get_current_context),
    db: Session = Depends(get_db),
):
    """Get general Aaliyah settings (e.g. auto–send)."""
    workspace = db.query(Workspace).filter(Workspace.id == context.workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    settings_json = getattr(workspace, "settings_json", {}) or {}
    aaliyah_settings = settings_json.get("aaliyah", {})
    
    return {
        "workspace_id": context.workspace_id,
        "organize_inbox_enabled": aaliyah_settings.get("organize_inbox_enabled", True),
        "draft_replies_enabled": aaliyah_settings.get("draft_replies_enabled", True),
        "archive_less_important": aaliyah_settings.get("archive_less_important", False),
        "track_follow_ups": aaliyah_settings.get("track_follow_ups", True),
        "follow_up_days": aaliyah_settings.get("follow_up_days", 3),
        "max_follow_ups": aaliyah_settings.get("max_follow_ups", 2),
        
        "capabilities": aaliyah_settings.get("capabilities", ["Organize inbox", "Draft email replies", "Track follow-ups"]),
        
        "calendar_assist_enabled": aaliyah_settings.get("calendar_assist_enabled", True),
        "working_hours_start": aaliyah_settings.get("working_hours_start", "09:00 AM"),
        "working_hours_end": aaliyah_settings.get("working_hours_end", "06:00 PM"),
        "default_meeting_duration": aaliyah_settings.get("default_meeting_duration", 30),
        "notes_mode": aaliyah_settings.get("notes_mode", "manual"),
        "attend_meetings": aaliyah_settings.get("attend_meetings", False),
        
        "auto_send_enabled": aaliyah_settings.get("auto_send_enabled", False),
        "draft_tone": aaliyah_settings.get("draft_tone", "Professional"),
        "signature": aaliyah_settings.get("signature"),
        "examples": aaliyah_settings.get("examples"),
        
        "vip_senders": aaliyah_settings.get("vip_senders", []),
        
        # Security & Approvals
        "approval_required_topics": aaliyah_settings.get("approval_required_topics", ["Financials", "Hiring", "External Strategy"]),
        "always_require_approval": aaliyah_settings.get("always_require_approval", True),
        
        # ── 5-Point Rulebook ──
        "emoji_usage": aaliyah_settings.get("emoji_usage", True),
        "directness": aaliyah_settings.get("directness", 3),
        "draft_disclosure": aaliyah_settings.get("draft_disclosure", True),
        "project_keywords": aaliyah_settings.get("project_keywords", []),
        "vip_roles": aaliyah_settings.get("vip_roles", []),
        "buffer_time_mins": aaliyah_settings.get("buffer_time_mins", 15),
        "focus_blocks": aaliyah_settings.get("focus_blocks", []),
        "morning_briefing_time": aaliyah_settings.get("morning_briefing_time", "08:30 AM"),
        "newsletter_policy": aaliyah_settings.get("newsletter_policy", "archive"),
        "receipts_policy": aaliyah_settings.get("receipts_policy", "auto_label")
    }


@router.put("/settings")
async def update_aaliyah_settings(
    payload: AaliyahSettingsRequest,
    context: CurrentContext = Depends(get_current_context),
    db: Session = Depends(get_db),
):
    """Update general Aaliyah settings."""
    workspace_id = _require_workspace_match(payload.workspace_id, context)
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    # Update settings_json safely
    current_settings = dict(getattr(workspace, "settings_json", {}) or {})
    if "aaliyah" not in current_settings:
        current_settings["aaliyah"] = {}
    
    current_settings["aaliyah"].update({
        "organize_inbox_enabled": payload.organize_inbox_enabled,
        "draft_replies_enabled": payload.draft_replies_enabled,
        "archive_less_important": payload.archive_less_important,
        "track_follow_ups": payload.track_follow_ups,
        "follow_up_days": payload.follow_up_days,
        "max_follow_ups": payload.max_follow_ups,
        
        "capabilities": payload.capabilities,
        
        "calendar_assist_enabled": payload.calendar_assist_enabled,
        "working_hours_start": payload.working_hours_start,
        "working_hours_end": payload.working_hours_end,
        "default_meeting_duration": payload.default_meeting_duration,
        "notes_mode": payload.notes_mode,
        "attend_meetings": payload.attend_meetings,
        
        "auto_send_enabled": payload.auto_send_enabled,
        "draft_tone": payload.draft_tone,
        "signature": payload.signature,
        "examples": payload.examples,
        "vip_senders": payload.vip_senders,
        "always_require_approval": payload.always_require_approval,
        "approval_required_topics": payload.approval_required_topics,
        
        # Rulebook Additions
        "emoji_usage": payload.emoji_usage,
        "directness": payload.directness,
        "draft_disclosure": payload.draft_disclosure,
        "project_keywords": payload.project_keywords,
        "vip_roles": payload.vip_roles,
        "buffer_time_mins": payload.buffer_time_mins,
        "focus_blocks": payload.focus_blocks,
        "morning_briefing_time": payload.morning_briefing_time,
        "newsletter_policy": payload.newsletter_policy,
        "receipts_policy": payload.receipts_policy,
    })
    
    workspace.settings_json = current_settings
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(workspace, "settings_json")
    db.commit()

    # FORCE UPDATE via SQL to ensure persistence in SQLite/WAL
    from sqlalchemy import text
    try:
        db.execute(
            text("UPDATE workspaces SET settings_json = :sj WHERE id = :wid"),
            {"sj": json.dumps(current_settings), "wid": workspace.id}
        )
        db.commit()
        logger.info(f"✅ [Settings] Protocols updated for workspace {workspace.id}")
    except Exception as e:
        logger.error(f"❌ [Settings] SQL Update failed: {e}")
        db.rollback()

    return {
        "status": "ok",
        "settings": current_settings["aaliyah"]
    }


@router.put("/labeling/preferences")
async def update_labeling_preferences(
    payload: LabelingPreferencesRequest,
    context: CurrentContext = Depends(get_current_context),
    db: Session = Depends(get_db),
):
    workspace_id = _require_workspace_match(payload.workspace_id, context)

    engine = LabelingRulesEngine(db, workspace_id)
    row = engine.update_preferences(
        enabled_labels=payload.enabled_labels,
        vip_senders=payload.vip_senders,
        internal_domains=payload.internal_domains,
        keyword_rules=payload.keyword_rules,
        auto_label_enabled=payload.auto_label_enabled,
        auto_sync_interval_seconds=payload.auto_sync_interval_seconds,
    )
    return {
        "status": "ok",
        "workspace_id": workspace_id,
        "enabled_labels": row.enabled_labels,
        "vip_senders": row.vip_senders,
        "internal_domains": row.internal_domains,
        "keyword_rules": row.keyword_rules,
        "auto_label_enabled": row.auto_label_enabled,
        "auto_sync_interval_seconds": row.auto_sync_interval_seconds,
    }


@router.post("/labeling/override")
async def set_labeling_override(
    payload: LabelOverrideRequest,
    context: CurrentContext = Depends(get_current_context),
    db: Session = Depends(get_db),
):
    workspace_id = _require_workspace_match(payload.workspace_id, context)

    engine = LabelingRulesEngine(db, workspace_id)
    try:
        override = engine.set_override(
            scope=payload.scope,
            target_id=payload.target_id,
            disable_auto=payload.disable_auto,
            labels=payload.labels,
            mode=payload.mode,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "invalid_override", "message": str(exc)},
        ) from exc

    return {
        "status": "ok",
        "workspace_id": workspace_id,
        "scope": payload.scope,
        "target_id": payload.target_id,
        "override": override,
    }


@router.post("/drafts/send")
async def send_draft(
    payload: SendDraftRequest,
    context: CurrentContext = Depends(get_current_context),
    db: Session = Depends(get_db),
):
    workspace_id = _require_workspace_match(payload.workspace_id, context)

    
    executor = ActionExecutor(db)
    try:
        result = await executor.send_draft(
            user_id=context.user_id,
            workspace_id=workspace_id,
            email_id=payload.email_id,
            is_explicit_approval=payload.is_explicit_approval,
        )
    except PermissionError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "locked_gate",
                "message": str(exc),
            },
        ) from exc
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "draft_error", "message": str(exc)},
        ) from exc
    except RuntimeError as exc:
         raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "send_failed", "message": str(exc)},
        ) from exc

    return {"status": "ok", "result": result}


@router.get("/templates")
async def list_templates(
    context: CurrentContext = Depends(get_current_context),
    db: Session = Depends(get_db),
):
    """List all draft templates."""

    templates = (
        db.query(DraftTemplate)
        .filter(DraftTemplate.workspace_id == context.workspace_id)
        .order_by(DraftTemplate.name.asc())
        .all()
    )
    return {
        "items": [
            {
                "id": t.id,
                "name": t.name,
                "subject": t.subject,
                "body": t.body,
                "updated_at": t.updated_at.isoformat()
            }
            for t in templates
        ],
        "count": len(templates)
    }


@router.post("/templates")
async def create_template(
    payload: TemplateRequest,
    context: CurrentContext = Depends(get_current_context),
    db: Session = Depends(get_db),
):
    """Create a new draft template."""
    import uuid
    workspace_id = _require_workspace_match(payload.workspace_id, context)
    
    template = DraftTemplate(
        id=str(uuid.uuid4()),
        workspace_id=workspace_id,
        name=payload.name,
        subject=payload.subject,
        body=payload.body,
    )
    db.add(template)
    db.commit()
    
    return {
        "status": "created",
        "id": template.id,
        "name": template.name
    }


@router.delete("/templates/{template_id}")
async def delete_template(
    template_id: str,
    context: CurrentContext = Depends(get_current_context),
    db: Session = Depends(get_db),
):
    """Delete a draft template."""
    template = (
        db.query(DraftTemplate)
        .filter(DraftTemplate.id == template_id, DraftTemplate.workspace_id == context.workspace_id)
        .first()
    )
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
        
    db.delete(template)
    db.commit()
    
    return {"status": "deleted", "id": template_id}


@router.get("/actions")
async def list_autonomous_actions(
    limit: int = Query(default=50, ge=1, le=200),
    context: CurrentContext = Depends(get_current_context),
    db: Session = Depends(get_db),
):
    """List all autonomous actions (labeling, sending, etc)."""
    rows = (
        db.query(AuditLog)
        .filter(
            AuditLog.workspace_id == context.workspace_id,
            or_(
                AuditLog.undo_payload.isnot(None),  # Labeling
                AuditLog.action == "EXECUTE"        # Sending/Acting
            )
        )
        .order_by(AuditLog.created_at.desc())
        .limit(limit)
        .all()
    )
    
    actions = []
    for row in rows:
        # Determine type
        action_type = "unknown"
        details = {}
        
        if row.action == "EXECUTE" and row.target_type == "ARTIFACT":
            action_type = "auto_send"
            details = {"subject": "Email sent"} # We might need more info in meta
        elif row.undo_payload:
            payload = row.undo_payload if isinstance(row.undo_payload, dict) else {}
            if payload.get("type") == "REMOVE_LABEL":
                action_type = "label"
                details = {
                    "label": payload.get("label_name"),
                    "message_id": payload.get("message_id")
                }
            elif payload.get("type") == "UNARCHIVE":
                 action_type = "archive"

        # Safe meta usage
        meta = {}
        if row.meta:
            try:
                meta = json.loads(row.meta) if isinstance(row.meta, str) else row.meta
            except:
                pass

        if action_type == "auto_send":
             details["subject"] = meta.get("draft_subject", "Email sent")

        actions.append({
            "id": row.id,
            "type": action_type,
            "created_at": row.created_at.isoformat(),
            "details": details,
            "status": row.status,
            "explain": row.explain_one_liner
        })
        
    return {"items": actions}


@router.get("/labeling/actions")
async def list_labeling_actions(
    limit: int = Query(default=50, ge=1, le=200),
    context: CurrentContext = Depends(get_current_context),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(AuditLog)
        .filter(
            AuditLog.workspace_id == context.workspace_id,
            AuditLog.undo_payload.isnot(None),
        )
        .order_by(AuditLog.created_at.desc())
        .limit(limit)
        .all()
    )
    actions: list[dict[str, Any]] = []
    for row in rows:
        payload = row.undo_payload if isinstance(row.undo_payload, dict) else {}
        if str(payload.get("type") or "").upper() != "REMOVE_LABEL":
            continue
        actions.append(
            {
                "audit_id": row.id,
                "created_at": row.created_at.isoformat() if row.created_at else None,
                "status": row.status,
                "message_id": payload.get("message_id"),
                "label_name": payload.get("label_name"),
                "undo_payload": payload,
                "explain": row.explain_one_liner,
            }
        )
    return {"items": actions, "count": len(actions)}


@router.post("/labeling/undo/{audit_id}")
async def undo_labeling_action(
    audit_id: str,
    context: CurrentContext = Depends(get_current_context),
    db: Session = Depends(get_db),
):
    undo = UndoService(db)
    try:
        result = await undo.undo(audit_id, context.user_id, workspace_id=context.workspace_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "undo_not_found", "message": str(exc)},
        ) from exc
    except PermissionError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "forbidden", "message": str(exc)},
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "undo_failed", "message": redact_text(str(exc))},
        ) from exc
    return result





@router.websocket("/live/ws")
async def live_websocket(websocket: WebSocket):
    token = websocket.query_params.get("stream_token")
    if not token:
        await websocket.close(code=1008, reason="stream_token required")
        return

    try:
        payload = _decode_live_token(token)
    except HTTPException:
        await websocket.close(code=1008, reason="invalid stream token")
        return

    workspace_id = str(payload["workspace_id"])
    
    await websocket.accept()
    
    try:
        await websocket.send_json(
            {
                "type": "connected",
                "message": "WebSocket connected",
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
        )
        
        iterator = event_bus.subscribe(workspace_id)
        async for event in iterator:
             await websocket.send_json(event.model_dump(mode="json"))
             
    except WebSocketDisconnect:
        pass
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"live_websocket exception: {e}")


@router.get("/greeting")
async def get_greeting(
    context: CurrentContext = Depends(get_current_context),
    db: Session = Depends(get_db),
):
    """
    Get deterministic, state-based greeting for the current user.
    Uses Integration health as source of truth.
    """
    service = GreetingService(db, context.workspace_id, context.user_id)
    return service.get_greeting_state()


@router.get("/debug/snapshot")
async def get_debug_snapshot(
    context: CurrentContext = Depends(get_current_context),
    db: Session = Depends(get_db),
):
    """
    Debug snapshot for admin/support.
    Returns:
    - integration health (connected/access/scopes/token state)
    - last sync status/time per provider
    - counts: emails/events available
    - last briefing source: LLM vs deterministic
    - flags: any UI fallback used
    """
    # 1. Integration Health
    from app.services.integrations.health_service import ConnectorHealthService
    health_svc = ConnectorHealthService(db, context.workspace_id)
    health_info = health_svc.get_detailed_health()
    
    # 2. Counts
    from app.models.triaged_email import TriagedEmail
    from app.models.calendar_event_snapshot import CalendarEventSnapshot
    
    email_count = db.query(TriagedEmail).filter(TriagedEmail.workspace_id == context.workspace_id).count()
    try:
        event_count = db.query(CalendarEventSnapshot).filter(CalendarEventSnapshot.workspace_id == context.workspace_id).count()
    except Exception:
        event_count = 0
    
    # 3. Last Briefing Info
    workspace = db.query(Workspace).filter(Workspace.id == context.workspace_id).first()
    settings = getattr(workspace, "settings_json", {}) or {}
    last_briefing = settings.get("aaliyah", {}).get("last_briefing")
    
    briefing_source = "UNKNOWN"
    if last_briefing:
        briefing_source = "CACHED_LLM" if "Good morning" in last_briefing.get("content", "") else "DETERMINISTIC"
    else:
        briefing_source = "NONE"

    return {
        "workspace_id": context.workspace_id,
        "health": health_info,
        "counts": {
            "emails": email_count,
            "events": event_count
        },
        "sync_status": {
            "email_last_sync": health_info.get("email", {}).get("last_sync_at"),
            "calendar_last_sync": health_info.get("calendar", {}).get("last_sync_at"),
        },
        "briefing": {
            "source": briefing_source,
            "generated_at": last_briefing.get("generated_at") if last_briefing else None
        },
        "timestamp": datetime.now(timezone.utc).isoformat()
    }