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
from sqlalchemy.orm import Session
from sqlalchemy import or_
from sqlalchemy.orm.attributes import flag_modified

from app.config import settings
from app.database import SessionLocal, get_db
from app.dependencies import CurrentContext, get_current_context
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

router = APIRouter(
    prefix="/aaliyah",
    tags=["aaliyah"],
)

_orchestrator_lock = threading.Lock()
_orchestrators: dict[str, AaliyahOrchestrator] = {}

_ask_rate_limiter = InMemoryRateLimiter(max_requests=60, window_seconds=60)
_webhook_rate_limiter = InMemoryRateLimiter(max_requests=120, window_seconds=60)
_idempotency_store = InMemoryIdempotencyStore(ttl_seconds=3600)
_LIVE_TOKEN_TTL_SECONDS = 300


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
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


def _decode_live_token(stream_token: str) -> dict[str, Any]:
    try:
        payload = jwt.decode(stream_token, settings.secret_key, algorithms=[settings.algorithm])
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
    context: CurrentContext = Depends(get_current_context),
):

    orchestrator = _get_orchestrator(context.workspace_id)
    return orchestrator.get_status()


# ── Onboarding Gate ──────────────────────────────────────────────────

class OnboardingCompleteRequest(BaseModel):
    capabilities: list[str] = Field(default_factory=list)
    working_hours_start: str = Field(default="09:00 AM", max_length=10)
    working_hours_end: str = Field(default="06:00 PM", max_length=10)
    meeting_duration: int = Field(default=30, ge=15, le=120)
    draft_tone: str = Field(default="Professional", max_length=50)
    signature: Optional[str] = Field(default=None, max_length=500)
    vips: list[str] = Field(default_factory=list)
    safe_auto_send: bool = False


@router.get("/onboarding/status")
async def get_onboarding_status(
    context: CurrentContext = Depends(get_current_context),
    db: Session = Depends(get_db),
):
    """Check whether the workspace has completed onboarding."""
    workspace = db.query(Workspace).filter(Workspace.id == context.workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    from app.models.user import User
    user = db.query(User).filter(User.id == context.user_id).first()
    first_name = (user.full_name or "").split()[0] if user and user.full_name else None

    return {
        "onboarding_status": getattr(workspace, "onboarding_status", "pending"),
        "first_name": first_name,
    }


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
        "draft_tone": payload.draft_tone,
        "signature": payload.signature,
        "auto_send_enabled": payload.safe_auto_send,
        "vip_senders": payload.vips,
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
    from sqlalchemy import text
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

    return {
        "status": "completed",
        "first_name": first_name,
        "workspace_id": workspace.id,
        "message": f"Done, {first_name or 'there'} ✅\nI'm now syncing your inbox and preparing drafts. You'll see updates here.",
    }


@router.get("/briefing")
async def get_briefing(
    context: CurrentContext = Depends(get_current_context),
    db: Session = Depends(get_db),
):
    """Generate or retrieve today's briefing."""

    svc = MorningBriefingService(db, context.workspace_id)
    content = await svc.generate_briefing()
    return {"content": content, "date": datetime.now(timezone.utc).isoformat()}


@router.get("/stats")
async def get_stats(
    context: CurrentContext = Depends(get_current_context),
):

    orchestrator = _get_orchestrator(context.workspace_id)
    return orchestrator.get_stats()


@router.get("/live/token")
async def get_live_token(
    context: CurrentContext = Depends(get_current_context),
):
    token = _create_live_token(context)
    return {"stream_token": token, "expires_in_seconds": _LIVE_TOKEN_TTL_SECONDS}


@router.get("/live/stream")
async def live_stream(
    stream_token: str = Query(...),
):
    """Canonical SSE stream (Sprint 1)"""
    from fastapi.responses import StreamingResponse
    payload = _decode_live_token(stream_token)
    workspace_id = payload["workspace_id"]

    async def event_generator():
        while True:
            # Simple heartbeat for Sprint 1
            yield f"data: {{\"type\": \"ping\", \"timestamp\": \"{datetime.now(timezone.utc).isoformat()}\"}}\n\n"
            await asyncio.sleep(15)

    return StreamingResponse(event_generator(), media_type="text/event-stream")


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
):
    """Canonical counts (Sprint 1)"""
    orchestrator = _get_orchestrator(context.workspace_id)
    return orchestrator.get_stats()


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
        "draft": (row.metadata_json or {}).get("draft"),
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
    now = datetime.utcnow()
    future = now + timedelta(hours=lookahead_hours)
    
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
    _rate_limit_or_throw(_webhook_rate_limiter, key=f"sync_inbox:{context.user_id}:{workspace_id}")
    
    # Gatekeeper: Email Health Check
    if not payload.force:
        from app.services.integrations.health_service import ConnectorHealthService
        health_svc = ConnectorHealthService(db, workspace_id)
        desc = health_svc.get_detailed_health()
        email_info = desc.get("email", {})
        email_status = email_info.get("status")
        
        if email_status != "OK":
             logger.warning(f"SYNC_BLOCKED: workspace={workspace_id} service=email reason={email_status} code={email_info.get('error_code')}")
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
    # Dedupe ID can be user+workspace+provider
    job_id = await queue.enqueue(JobType.SYNC_PROVIDER, job_payload)
    
    logger.info(f"SYNC_STARTED: workspace={workspace_id} job_id={job_id} type=inbox")

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
    _rate_limit_or_throw(_webhook_rate_limiter, key=f"sync_calendar:{context.user_id}:{workspace_id}")
    
    # Gatekeeper: Calendar Health Check
    if not payload.force:
        from app.services.integrations.health_service import ConnectorHealthService
        health_svc = ConnectorHealthService(db, workspace_id)
        desc = health_svc.get_detailed_health()
        cal_info = desc.get("calendar", {})
        cal_status = cal_info.get("status")
        
        if cal_status != "OK":
             logger.warning(f"SYNC_BLOCKED: workspace={workspace_id} service=calendar reason={cal_status} code={cal_info.get('error_code')}")
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

    response = {"status": "queued", "job_id": job_id}
    if cache_key:
        _idempotency_store.set(cache_key, response)
    return response


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
        
        # Read-only security caps for Sprint 2
        "approval_required_topics": ["Financials", "Hiring", "External Strategy"],
        "always_require_approval": True
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
                import json
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


@router.get("/live")
async def live_stream(
    request: Request,
    stream_token: str,
):
    payload = _decode_live_token(stream_token)
    workspace_id = str(payload["workspace_id"])
    
    # We use an async generator directly
    async def event_generator():
        # Yield initial
        initial = LiveEvent(
            workspace_id=workspace_id,
            type="connected",
            message="Live stream connected",
            payload={"connected_at": datetime.now(timezone.utc).isoformat()},
        )
        yield initial.to_sse()

        iterator = event_bus.subscribe(workspace_id)
        try:
             async for event in iterator:
                 if await request.is_disconnected():
                     break
                 yield event.to_sse()
        except Exception:
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
    except Exception:
        pass
