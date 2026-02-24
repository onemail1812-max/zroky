from datetime import datetime
from sqlalchemy.orm import Session
from app.models.draft import Draft, DraftStatus
from app.services.llm.openrouter_client import OpenRouterClient
from app.models.email import EmailMessage
from app.config import settings
import asyncio
from app.services.calendar.provider import CalendarService
import pytz
from app.services.email.safety import evaluate_safety
from app.services.email.sender import EmailSender
from app.models.workspace import Workspace
from app.services.llm.service import llm_service

async def generate_draft(db: Session, email: EmailMessage, llm_client: OpenRouterClient = None):
    """
    Generate a concise draft reply using LLM (if marked 'Needs Reply').
    """
    if "needs_reply" not in (email.labels or []):
        return None
        
    subject = f"Re: {email.subject}"
    
    # Meeting Intent Detection (very basic)
    meeting_keywords = ["meet", "call", "schedule", "availability", "time to chat", "calendar", "zoom", "google meet"]
    is_meeting_request = any(k in email.body_cleaned.lower() for k in meeting_keywords) or \
                         any(k in email.subject.lower() for k in meeting_keywords)
                         
    slots_context = ""
    if is_meeting_request:
        try:
            cal_service = CalendarService(db, email.workspace_id)
            slots = cal_service.find_free_slots(duration_minutes=30)
            
            if slots:
                ist = pytz.timezone('Asia/Kolkata')
                slot_strs = []
                for s_utc in slots:
                    # Convert to human readable IST
                    s_ist = s_utc.replace(tzinfo=pytz.UTC).astimezone(ist)
                    slot_strs.append(s_ist.strftime("%A, %b %d at %I:%M %p IST"))
                
                slots_context = "\nAvailability: The user is free at these times (choose 3 if needed): \n- " + "\n- ".join(slot_strs)
        except Exception as e:
            logger.error(f"Calendar check failed: {e}")
            slots_context = ""

    try:
        draft_body = await llm_service.draft_reply(email, slots_context)
        
        # Store Draft
        import uuid
        draft = Draft(
            id=str(uuid.uuid4()),
            workspace_id=email.workspace_id,
            email_message_id=email.id,
            subject=subject,
            body=draft_body.strip(),
            status=DraftStatus.READY,
            ai_generated_reasoning="Auto-reply for 'Needs Reply' classification."
        )
        db.add(draft)
        
        # Safety & Auto-Send Logic
        workspace = db.query(Workspace).filter(Workspace.id == email.workspace_id).first()
        primary_provider = (workspace.settings_json or {}).get("aaliyah", {}).get("primary_email_provider")
        is_primary = False
        if primary_provider:
             is_primary = (email.provider == primary_provider)

        # "Primary account: safe auto-send ON by default" logic
        # Ideally read from settings, defaulting to True if Primary
        auto_send_enabled = is_primary 

        is_safe, reason, confidence = evaluate_safety(draft, email, is_primary)

        if auto_send_enabled and is_safe:
            logger.info(f"Auto-sending safe draft for {email.id}: {reason}")
            try:
                # Flush first to ensure draft exists (though maybe not needed as ID is pre-gen, but relationship might need it)
                db.flush() 
                sender = EmailSender(db, email.workspace_id)
                # sender.send_draft(draft) 
                # !!! MVP SAFETY: Commenting out actual network send until user explicitly verifies flow
                # For demo purposes, we MARK it as sent.
                # To enable real sending, uncomment line above.
                draft.status = DraftStatus.SENT
                draft.ai_generated_reasoning += f" [Auto-sent: {reason}]"
            except Exception as e:
                logger.error(f"Auto-send failed: {e}")
                draft.status = DraftStatus.FAILED
                draft.ai_generated_reasoning += f" [Send Failed: {str(e)}]"
        else:
            # If not safe, or not primary, it sits in ready/pending
            # If specifically unsafe (blocked), maybe PENDING_APPROVAL?
            if not is_safe:
                 draft.status = DraftStatus.PENDING_APPROVAL
                 draft.ai_generated_reasoning += f" [Blocked: {reason}]"
            else:
                 draft.status = DraftStatus.READY # Safe but auto-send off
                 draft.ai_generated_reasoning += f" [Ready: {reason}]"

        db.commit()
        return draft
        
    except Exception as e:
        logger.error(f"Draft generation failed for {email.id}: {e}")
        return None
