"""
Automatic Chat Orchestration Endpoints.
Allows manual triggering and querying of auto-chat features.
Also handles configuration of auto-chat triggers and preferences.
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone

from app.dependencies import get_current_context, get_current_user
from app.database import get_db
from app.core.limiter import limiter
from sqlalchemy.orm import Session

from app.agents.aaliyah.core.auto_chat_service import AutoChatService, ConversationTrigger
from app.models.triaged_email import TriagedEmail

router = APIRouter(prefix="/auto-chat", tags=["auto-chat"])


class TriggerAutoChatRequest(BaseModel):
    """Request to manually trigger an auto-chat conversation."""
    trigger: ConversationTrigger = Field(..., description="What should trigger the auto-chat")
    email_id: Optional[str] = Field(None, description="Email ID (for email-based triggers)")
    event_id: Optional[str] = Field(None, description="Calendar event ID (for meeting-based triggers)")
    questions: Optional[List[str]] = Field(None, description="Clarification questions (for clarification trigger)")
    conflicts: Optional[List[Dict[str, str]]] = Field(None, description="Calendar conflicts (for conflict trigger)")
    vip_name: Optional[str] = Field(None, description="VIP name (for VIP response trigger)")
    custom_context: Optional[Dict[str, Any]] = Field(None, description="Additional context")


class TriggerAutoChatResponse(BaseModel):
    """Response from auto-chat trigger."""
    success: bool
    trigger_type: str
    message_id: Optional[str] = None
    preview: Optional[str] = None
    details: Optional[Dict[str, Any]] = None


class AutoExecuteRequest(BaseModel):
    """Request to auto-execute a follow-through action."""
    email_id: str = Field(..., description="Email to act on")
    action: str = Field(..., description="draft | schedule | snooze")
    params: Optional[Dict[str, Any]] = Field(None, description="Additional parameters")


class AutoChatSettingsUpdate(BaseModel):
    """Configure auto-chat behavior."""
    enable_urgent_auto_chat: Optional[bool] = Field(None)
    enable_meeting_prep: Optional[bool] = Field(None)
    enable_afternoon_digest: Optional[bool] = Field(None)
    enable_followup_reminders: Optional[bool] = Field(None)
    enable_vip_prioritization: Optional[bool] = Field(None)
    vip_senders: Optional[List[str]] = Field(None)
    auto_draft_priority_threshold: Optional[str] = Field(None)  # "High" | "Critical"
    afternoon_digest_time: Optional[str] = Field(None)  # "15:00" format


@router.post("/trigger", response_model=TriggerAutoChatResponse)
@limiter.limit("20/minute")
async def trigger_auto_chat(
    request: Request,
    payload: TriggerAutoChatRequest,
    context = Depends(get_current_context),
    db: Session = Depends(get_db)
):
    """
    Manually trigger an auto-chat conversation.
    
    Examples:
    - Urgent email arrives: trigger=urgent_email, email_id=...
    - Clarification needed: trigger=clarification_needed, email_id=..., questions=[...]
    - Meeting prep: trigger=meeting_prep, event_id=...
    - Pending followup: trigger=pending_followup, email_id=..., days_pending=3
    """
    workspace_id = context.workspace_id
    user_id = context.user_id
    
    try:
        service = AutoChatService(workspace_id)
        
        # Build context
        context_data = payload.custom_context or {}
        if payload.email_id:
            context_data["email_id"] = payload.email_id
        if payload.event_id:
            context_data["event_id"] = payload.event_id
        if payload.questions:
            context_data["questions"] = payload.questions
        if payload.conflicts:
            context_data["conflicts"] = payload.conflicts
        if payload.vip_name:
            context_data["vip_name"] = payload.vip_name
        
        # Trigger
        result = await service.trigger_auto_chat(
            db,
            user_id=user_id,
            trigger=payload.trigger,
            context=context_data
        )
        
        if result is None:
            raise HTTPException(status_code=400, detail="Failed to trigger auto-chat")
        
        return TriggerAutoChatResponse(
            success=True,
            trigger_type=payload.trigger.value,
            message_id=result.get("message_id"),
            preview=result.get("preview"),
            details=result
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/execute-action")
@limiter.limit("30/minute")
async def auto_execute_action(
    request: Request,
    payload: AutoExecuteRequest,
    context = Depends(get_current_context),
    db: Session = Depends(get_db)
):
    """
    Auto-execute a follow-through action without additional user input.
    
    Actions:
    - draft: Auto-generate email draft
    - schedule: Auto-schedule follow-up meeting
    - snooze: Auto-snooze email (default 24h)
    """
    workspace_id = context.workspace_id
    user_id = context.user_id
    
    try:
        service = AutoChatService(workspace_id)
        success = await service.auto_execute_follow_through(
            db,
            user_id=user_id,
            email_id=payload.email_id,
            auto_action=payload.action
        )
        
        return {
            "success": success,
            "action": payload.action,
            "email_id": payload.email_id,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status/{email_id}")
async def get_auto_chat_status(
    email_id: str,
    context = Depends(get_current_context),
    db: Session = Depends(get_db)
):
    """Get the auto-chat status for a specific email."""
    try:
        email = db.query(TriagedEmail).filter(
            TriagedEmail.id == email_id,
            TriagedEmail.workspace_id == context.workspace_id
        ).first()
        
        if not email:
            raise HTTPException(status_code=404, detail="Email not found")
        
        meta = email.metadata_json or {}
        return {
            "email_id": email_id,
            "auto_chat_triggered": "auto_chat_triggered_at" in meta,
            "auto_chat_trigger_type": meta.get("auto_chat_trigger_type"),
            "auto_draft_status": meta.get("auto_draft", {}).get("status"),
            "clarification_pending": meta.get("needs_clarity", False),
            "vip_priority": meta.get("vip_priority_triggered", False),
            "metadata": meta
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/settings")
@limiter.limit("10/minute")
async def update_auto_chat_settings(
    request: Request,
    payload: AutoChatSettingsUpdate,
    context = Depends(get_current_context),
    db: Session = Depends(get_db)
):
    """
    Update user preferences for auto-chat behavior.
    Stored in workspace settings under 'aaliyah.auto_chat_settings'.
    """
    from app.models.workspace import Workspace
    
    try:
        workspace = db.query(Workspace).filter(
            Workspace.id == context.workspace_id
        ).first()
        
        if not workspace:
            raise HTTPException(status_code=404, detail="Workspace not found")
        
        # Update settings
        settings = workspace.settings_json or {}
        aaliyah = settings.get("aaliyah", {})
        auto_chat = aaliyah.get("auto_chat_settings", {})
        
        # Merge new settings
        if payload.enable_urgent_auto_chat is not None:
            auto_chat["enable_urgent_auto_chat"] = payload.enable_urgent_auto_chat
        if payload.enable_meeting_prep is not None:
            auto_chat["enable_meeting_prep"] = payload.enable_meeting_prep
        if payload.enable_afternoon_digest is not None:
            auto_chat["enable_afternoon_digest"] = payload.enable_afternoon_digest
        if payload.enable_followup_reminders is not None:
            auto_chat["enable_followup_reminders"] = payload.enable_followup_reminders
        if payload.enable_vip_prioritization is not None:
            auto_chat["enable_vip_prioritization"] = payload.enable_vip_prioritization
        if payload.vip_senders is not None:
            aaliyah["vip_senders"] = payload.vip_senders
        if payload.auto_draft_priority_threshold is not None:
            auto_chat["auto_draft_priority_threshold"] = payload.auto_draft_priority_threshold
        if payload.afternoon_digest_time is not None:
            auto_chat["afternoon_digest_time"] = payload.afternoon_digest_time
        
        # Persist
        aaliyah["auto_chat_settings"] = auto_chat
        settings["aaliyah"] = aaliyah
        workspace.settings_json = settings
        db.commit()
        
        return {
            "success": True,
            "settings": auto_chat
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/settings")
async def get_auto_chat_settings(
    context = Depends(get_current_context),
    db: Session = Depends(get_db)
):
    """Get current auto-chat settings for the workspace."""
    from app.models.workspace import Workspace
    
    try:
        workspace = db.query(Workspace).filter(
            Workspace.id == context.workspace_id
        ).first()
        
        if not workspace:
            raise HTTPException(status_code=404, detail="Workspace not found")
        
        settings = workspace.settings_json or {}
        aaliyah = settings.get("aaliyah", {})
        auto_chat = aaliyah.get("auto_chat_settings", {})
        vip_senders = aaliyah.get("vip_senders", [])
        
        return {
            "auto_chat_settings": auto_chat,
            "vip_senders": vip_senders,
            "defaults": {
                "enable_urgent_auto_chat": True,
                "enable_meeting_prep": True,
                "enable_afternoon_digest": True,
                "enable_followup_reminders": True,
                "enable_vip_prioritization": True,
                "auto_draft_priority_threshold": "High",
                "afternoon_digest_time": "15:00"
            }
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/demo/simulate-urgent-email")
async def demo_trigger_urgent_email(
    context = Depends(get_current_context),
    db: Session = Depends(get_db)
):
    """
    DEMO: Simulate receiving an urgent email and trigger auto-chat.
    Creates a fake urgent email and shows what auto-chat would do.
    """
    from app.models.triaged_email import TriagedEmail
    import uuid
    
    try:
        # Create fake urgent email
        fake_email = TriagedEmail(
            id=f"demo_{uuid.uuid4().hex[:12]}",
            workspace_id=context.workspace_id,
            sender="sender@example.com",
            subject="Demo: Urgent action needed",
            body="This is a demo email showing how Aaliyah auto-chats about urgent emails.",
            snippet="This is a demo email showing...",
            priority="Critical",
            category="PRIORITY",
            status="unread"
        )
        db.add(fake_email)
        db.commit()
        
        # Trigger auto-chat
        service = AutoChatService(context.workspace_id)
        result = await service.trigger_auto_chat(
            db,
            user_id=context.user_id,
            trigger=ConversationTrigger.URGENT_EMAIL,
            context={"email_id": fake_email.id}
        )
        
        return {
            "demo_email_id": fake_email.id,
            "auto_chat_triggered": result is not None,
            "preview": result
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
