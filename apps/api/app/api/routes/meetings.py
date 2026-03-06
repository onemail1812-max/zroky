"""Meetings API — transcript upload, summarization, and chat integration."""
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from app.core.limiter import limiter
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_context, CurrentContext
from app.services.cache import cached_response, invalidate_cache

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/meetings", tags=["meetings"])


# ── Request / Response Models ────────────────────────────────────────

class TranscriptUploadRequest(BaseModel):
    event_id: str = "manual"
    transcript_text: str
    platform: str = "manual"  # manual | zoom | teams | meet


class PostToChatRequest(BaseModel):
    message: Optional[str] = None  # Custom message override


# ── Endpoints ────────────────────────────────────────────────────────

@router.post("/transcript")
@limiter.limit("15/minute")
async def upload_transcript(
    request: Request,
    req: TranscriptUploadRequest,
    db: Session = Depends(get_db),
    context: CurrentContext = Depends(get_current_context),
):
    """Upload a meeting transcript for AI summarization."""
    from app.agents.aaliyah.core.meeting_summarizer import MeetingSummarizer

    try:
        summarizer = MeetingSummarizer(db, context.workspace_id)
        transcript_id = await summarizer.ingest_transcript(
            event_id=req.event_id,
            transcript_text=req.transcript_text,
            platform=req.platform,
        )
        return {
            "status": "ingested",
            "transcript_id": transcript_id,
            "message": "Transcript stored. Call /meetings/{id}/summarize to process.",
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Transcript upload failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to store transcript")


@router.post("/{transcript_id}/summarize")
@limiter.limit("10/minute")
async def summarize_transcript(
    request: Request,
    transcript_id: str,
    db: Session = Depends(get_db),
    context: CurrentContext = Depends(get_current_context),
):
    """Trigger AI summarization of a stored transcript.
    
    Uses the Brain (LLM) to generate:
    - Executive summary
    - Key decisions
    - Action items with owners and due dates
    - Sentiment analysis
    - Keywords/tags
    """
    from app.agents.aaliyah.core.meeting_summarizer import MeetingSummarizer

    try:
        summarizer = MeetingSummarizer(db, context.workspace_id)
        summary = await summarizer.summarize_transcript(transcript_id)

        if not summary:
            raise HTTPException(status_code=404, detail="Transcript not found")

        try:
            invalidate_cache("meeting_summary", workspace_id=context.workspace_id)
        except Exception:
            pass

        return {
            "status": "completed",
            "transcript_id": transcript_id,
            "summary": summary,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Summarization failed for {transcript_id}: {e}")
        raise HTTPException(status_code=500, detail="Summarization failed")


@router.get("/{transcript_id}/summary")
@limiter.limit("30/minute")
@cached_response(ttl_seconds=300, prefix="meeting_summary")
async def get_summary(
    request: Request,
    transcript_id: str,
    db: Session = Depends(get_db),
    context: CurrentContext = Depends(get_current_context),
):
    """Fetch the summary for a previously processed transcript."""
    from app.models.meeting_transcript import MeetingTranscript

    transcript = db.query(MeetingTranscript).filter_by(
        id=transcript_id,
        workspace_id=context.workspace_id,
    ).first()

    if not transcript:
        raise HTTPException(status_code=404, detail="Transcript not found")

    return {
        "transcript_id": transcript.id,
        "event_id": transcript.event_id,
        "status": transcript.status,
        "platform": transcript.platform,
        "summary": transcript.summary_json,
        "created_at": transcript.created_at.isoformat() if hasattr(transcript, 'created_at') and transcript.created_at else None,
    }


@router.post("/{transcript_id}/post-to-chat")
@limiter.limit("10/minute")
async def post_summary_to_chat(
    request: Request,
    transcript_id: str,
    req: Optional[PostToChatRequest] = None,
    db: Session = Depends(get_db),
    context: CurrentContext = Depends(get_current_context),
):
    """Post meeting summary to the Aaliyah Inbox Chat feed.
    
    Creates an SSE event that the frontend picks up and renders
    as a MeetingSummaryCard in the chat feed.
    """
    from app.models.meeting_transcript import MeetingTranscript
    from app.models.calendar_event_snapshot import CalendarEventSnapshot

    transcript = db.query(MeetingTranscript).filter_by(
        id=transcript_id,
        workspace_id=context.workspace_id,
    ).first()

    if not transcript or not transcript.summary_json:
        raise HTTPException(status_code=404, detail="No summary available for this transcript")

    summary = transcript.summary_json

    # Get the event title if available
    event = db.query(CalendarEventSnapshot).filter_by(
        id=transcript.event_id,
        workspace_id=context.workspace_id,
    ).first()
    event_title = event.title if event else "Meeting"

    # Build the chat message
    executive_summary = summary.get("executive_summary", "No summary available.")
    decisions = summary.get("decisions", [])
    action_items = summary.get("action_items", [])

    chat_message = f"Meeting recap for **{event_title}**:\n\n{executive_summary}"
    if decisions:
        chat_message += "\n\n**Decisions:**\n" + "\n".join(f"- {d}" for d in decisions)
    if action_items:
        chat_message += "\n\n**Action Items:**\n" + "\n".join(
            f"- {a.get('task', '')} (→ {a.get('owner', 'TBD')}, by {a.get('due_date', 'TBD')})"
            for a in action_items
        )

    # Emit via SSE / live feed
    try:
        from app.agents.aaliyah.core.live_feed import emit_event
        await emit_event(
            workspace_id=context.workspace_id,
            event_type="meeting_summary",
            data={
                "transcript_id": transcript_id,
                "event_title": event_title,
                "message": chat_message,
                "summary": summary,
            },
        )
    except Exception as e:
        logger.warning(f"SSE emit failed (non-fatal): {e}")

    return {
        "status": "posted",
        "message": chat_message,
        "summary": summary,
    }
