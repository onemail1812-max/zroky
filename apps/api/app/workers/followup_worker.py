import logging
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.triaged_email import TriagedEmail
from app.agents.aaliyah.core.orchestrator import AaliyahOrchestrator

logger = logging.getLogger(__name__)

async def process_auto_followup(payload: dict):
    """
    Scans for emails that are awaiting a reply but haven't been contacted in > 48h.
    """
    workspace_id = payload.get("workspace_id")
    if not workspace_id:
        return

    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        # Threshold: 48 hours ago
        threshold = now - timedelta(hours=48)
        
        # Find emails marked as 'awaiting_reply' where no response has been received (based on received_at or custom followup_due_at)
        # For now, we use received_at as a proxy for 'last contact'
        forgotten_threads = db.query(TriagedEmail).filter(
            TriagedEmail.workspace_id == workspace_id,
            TriagedEmail.awaiting_reply == True,
            TriagedEmail.received_at <= threshold,
            TriagedEmail.category != "followup_snoozed"
        ).all()

        if not forgotten_threads:
            return

        orc = AaliyahOrchestrator(workspace_id)
        
        from app.models.workspace import Workspace
        workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
        aaliyah_settings = (workspace.settings_json or {}).get("aaliyah", {})
        user_name = aaliyah_settings.get("user_name") or aaliyah_settings.get("first_name") or "there"

        # Initialize Brain for intelligent nudging
        from app.services.brain.core import Brain
        brain = Brain()

        for thread in forgotten_threads:
            # Check if we already nudged in the last 24h to avoid spam
            meta = thread.metadata_json or {}
            last_nudge = meta.get("last_nudge_at")
            if last_nudge:
                last_nudge_dt = datetime.fromisoformat(last_nudge)
                if now - last_nudge_dt < timedelta(hours=24):
                    continue
            
            # 1. Generate Conversational Nudge
            prompt = f"""
            Identify a friendly, proactive way to ask {user_name} if they want a follow-up email sent for this specific thread.
            
            THREAD DETAILS:
            Sender: {thread.sender}
            Subject: {thread.subject}
            Snippet: {thread.snippet}
            
            STRICT RULES:
            1. Be very concise (max 2 sentences).
            2. Be warm and helpful.
            3. Mention the specific topic naturally.
            4. Do NOT use generic AI filler.
            5. Ask if you should draft a follow-up.
            """
            
            try:
                response = await brain.think(
                    prompt=prompt,
                    system_prompt=f"You are Aaliyah, {user_name}'s proactive Executive Assistant. Help them stay on top of their inbox with friendly nudges.",
                    model_override="google/gemini-flash-1.5" # Efficient for quick nudges
                )
                msg = response.content.strip()
            except Exception:
                # Fallback to a better static message if Brain fails
                msg = f"Hey {user_name}, you haven't heard back from {thread.sender} regarding '{thread.subject}'. Shall I send a friendly follow-up nudge?"
            
            # Phase 8: Default Actions for Follow-ups
            actions = [
                {"label": "Draft Nudge", "type": "callback", "payload": {"intent": "draft_nudge"}, "primary": True},
                {"label": "Snooze 24h", "type": "snooze", "payload": {"hours": 24}},
            ]
            
            # Emit Proactive Assistant Message (Conversational Follow-up)
            await orc.emit_status(
                "assistant_message",
                msg,
                {
                    "text": msg,
                    "role": "assistant",
                    "thread_id": thread.thread_id,
                    "target_thread_id": thread.thread_id,
                    "triaged_id": thread.id,
                    "followup_nudge": True,
                    "actions": actions
                }
            )
            
            # Update metadata to track the nudge
            meta["last_nudge_at"] = now.isoformat()
            meta["followup_pending_confirmation"] = True
            thread.metadata_json = dict(meta)
            
            logger.info(f"Nudge emitted for thread {thread.thread_id} in workspace {workspace_id}")

        db.commit()

    except Exception as e:
        logger.error(f"Auto-Followup worker failed: {e}")
        db.rollback()
    finally:
        db.close()
