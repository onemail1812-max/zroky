"""
Meeting Notetaker Background Worker.

Handles the full lifecycle of a meeting notetaker job:
1. Join meeting via HeadlessNotetakerService
2. Capture transcript (dual-mode: live captions + Whisper)
3. Generate executive summary via Brain LLM
4. Persist transcript + summary to MeetingTranscript table
5. Emit SSE events for real-time UI updates
6. Store summary in Knowledge Graph (RAG) for future recall
"""

import asyncio
import json
import logging
import uuid
from datetime import datetime, timezone

from app.database import SessionLocal
from app.models.meeting_transcript import MeetingTranscript
from app.services.meetings.notetaker import HeadlessNotetakerService

logger = logging.getLogger(__name__)


async def process_meeting_job(payload: dict):
    """
    Background worker job dispatched by the queue when a meeting is scheduled.

    Expected payload:
        workspace_id: str       — Workspace ID for DB context
        event_id: str           — Calendar event ID (optional, for linking)
        meeting_url: str        — URL to join (Google Meet / Zoom / Teams)
        bot_name: str           — Display name for the bot (default: Aaliyah Notetaker)
    """
    workspace_id = payload.get("workspace_id")
    event_id = payload.get("event_id", "manual")
    meeting_url = payload.get("meeting_url")
    bot_name = payload.get("bot_name", "Aaliyah Notetaker")

    if not meeting_url:
        logger.error("[Notetaker Worker] No meeting_url in payload — skipping")
        return

    if not workspace_id:
        logger.error("[Notetaker Worker] No workspace_id in payload — skipping")
        return

    notetaker = HeadlessNotetakerService(bot_name=bot_name)
    db = SessionLocal()

    # Create transcript record early (status=joining)
    transcript_id = str(uuid.uuid4())
    transcript_record = MeetingTranscript(
        id=transcript_id,
        workspace_id=workspace_id,
        event_id=event_id,
        transcript_text="",
        summary_json=None,
        status="joining",
        platform=notetaker.platform.value if notetaker.platform else "unknown",
    )
    db.add(transcript_record)
    db.commit()

    try:
        # Emit: joining
        await _emit_event(workspace_id, "meeting_joining", f"Notetaker is joining: {meeting_url}", {
            "transcript_id": transcript_id,
            "meeting_url": meeting_url,
        })

        # 1. Join Meeting
        logger.info("[Notetaker Worker] Joining meeting: %s", meeting_url)
        connected = await notetaker.join_meeting(meeting_url)

        if not connected:
            logger.error("[Notetaker Worker] Failed to join meeting: %s", meeting_url)
            transcript_record.status = "failed"
            transcript_record.summary_json = {"error": "Failed to join meeting"}
            db.commit()

            await _emit_event(workspace_id, "meeting_failed", "Could not join the meeting. Please check the link.", {
                "transcript_id": transcript_id,
            })
            return

        # Update platform after detection
        transcript_record.platform = notetaker.platform.value
        transcript_record.status = "transcribing"
        db.commit()

        # Emit: connected
        await _emit_event(workspace_id, "meeting_joined", f"Notetaker joined as '{bot_name}'", {
            "transcript_id": transcript_id,
            "platform": notetaker.platform.value,
        })

        # 2. Record and Transcribe (blocks until meeting ends)
        logger.info("[Notetaker Worker] Meeting connected. Starting transcription...")
        raw_transcript = await notetaker.start_transcription()

        # Save raw transcript
        transcript_record.transcript_text = raw_transcript
        transcript_record.status = "summarizing"
        db.commit()

        # Emit: summarizing
        await _emit_event(workspace_id, "meeting_transcribing", "Meeting ended. Generating summary...", {
            "transcript_id": transcript_id,
            "transcript_length": len(raw_transcript),
        })

        # 3. Generate Executive Summary
        logger.info("[Notetaker Worker] Generating intelligence summary...")
        summary_data = await notetaker.generate_summary(raw_transcript)

        summary_dict = summary_data.model_dump()

        # 4. Persist summary
        transcript_record.summary_json = summary_dict
        transcript_record.status = "completed"
        transcript_record.updated_at = datetime.now(timezone.utc)
        db.commit()

        logger.info(
            "[Notetaker Worker] Summary generated — %d decisions, %d action items",
            len(summary_data.key_decisions),
            len(summary_data.action_items),
        )

        # 5. Store in Knowledge Graph for future RAG recall
        try:
            from app.services.brain.memory import DualStateMemory
            memory = DualStateMemory(db, workspace_id)
            memory.save_interaction(
                source_type="meeting_summary",
                source_id=transcript_id,
                content_text=f"Meeting Summary:\n{json.dumps(summary_dict, indent=2)}",
                metadata={
                    "event_id": event_id,
                    "platform": notetaker.platform.value,
                    "summary": summary_dict,
                    "meeting_url": meeting_url,
                },
            )
            logger.info("[Notetaker Worker] Stored summary in memory (RAG)")
        except Exception as e:
            logger.warning("[Notetaker Worker] Failed to store in memory: %s", e)

        # 6. Emit: summary ready
        await _emit_event(workspace_id, "meeting_summary_ready", "Meeting notes are ready!", {
            "transcript_id": transcript_id,
            "summary": summary_data.summary,
            "decisions_count": len(summary_data.key_decisions),
            "action_items_count": len(summary_data.action_items),
        })

    except Exception as e:
        logger.error("[Notetaker Worker] Fatal error: %s", e, exc_info=True)
        try:
            transcript_record.status = "failed"
            transcript_record.summary_json = {"error": str(e)}
            db.commit()
        except Exception:
            db.rollback()

        await _emit_event(workspace_id, "meeting_failed", f"Notetaker error: {str(e)[:100]}", {
            "transcript_id": transcript_id,
        })

    finally:
        db.close()


async def _emit_event(workspace_id: str, event_type: str, message: str, payload: dict = None):
    """Best-effort SSE event emission for real-time UI updates."""
    try:
        from app.agents.aaliyah.core.orchestrator import AaliyahOrchestrator
        orc = AaliyahOrchestrator.get_orchestrator(workspace_id)
        await orc.emit_status(event_type, message, payload or {})
    except Exception as e:
        logger.warning("[Notetaker Worker] Failed to emit '%s' event: %s", event_type, e)