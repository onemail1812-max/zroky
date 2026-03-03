"""
Background Worker for Automatic Chat Triggers.
Monitors inbox for events that should trigger auto-chat initiation.
Runs in the background loop alongside other workers.
"""
import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, List

from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.triaged_email import TriagedEmail
from app.models.calendar_event_snapshot import CalendarEventSnapshot
from app.models.workspace import Workspace
from app.models.user import User
from app.agents.aaliyah.core.auto_chat_service import AutoChatService, ConversationTrigger

logger = logging.getLogger(__name__)


class AutoChatWorker:
    """
    Continuously monitors ALL workspaces for auto-chat triggers.
    Processes:
    - New high-priority emails
    - Pending follow-ups
    - Meeting prep nudges (5 min before)
    - Afternoon digest (3 PM)
    - Calendar conflicts
    - VIP responses
    """
    
    def __init__(self):
        self.last_digest_sent_at: dict[str, datetime] = {}  # "workspace_id:user_id" -> datetime
        self.processing_emails: set[str] = set()  # Track in-flight processing
    
    def _get_active_workspaces(self, db: Session) -> List[Workspace]:
        return db.query(Workspace).all()

    async def run_periodic_checks(self, db: Session) -> None:
        """Run all checks in a continuous loop."""
        try:
            while True:
                try:
                    workspaces = self._get_active_workspaces(db)
                    for workspace in workspaces:
                        workspace_id = workspace.id
                        service = AutoChatService(workspace_id)
                        
                        # Check for new high-priority emails
                        await self._check_urgent_emails(db, workspace_id, service)
                        
                        # Check for pending follow-ups (3+ days)
                        await self._check_pending_followups(db, workspace_id, service)
                        
                        # Check for meeting prep (5 min before)
                        await self._check_meeting_prep(db, workspace_id, service)
                        
                        # Check for afternoon digest (once per day @ 3 PM)
                        await self._check_afternoon_digest(db, workspace, service)
                        
                        # Check for calendar conflicts
                        await self._check_calendar_conflicts(db, workspace_id, service)
                        
                        # Check for VIP responses
                        await self._check_vip_responses(db, workspace, service)
                    
                except Exception as e:
                    logger.error(f"[AutoChatWorker] Error in periodic checks: {e}", exc_info=True)
                
                # Sleep 30 seconds before next check
                await asyncio.sleep(30)
        
        except asyncio.CancelledError:
            logger.info("[AutoChatWorker] Worker cancelled, shutting down gracefully")
        except Exception as e:
            logger.error(f"[AutoChatWorker] Fatal error: {e}", exc_info=True)
    
    async def _check_urgent_emails(self, db: Session, workspace_id: str, service: AutoChatService) -> None:
        """Trigger auto-chat for URGENT/HIGH emails."""
        try:
            # Find new unopened high-priority emails
            urgent_emails = db.query(TriagedEmail).filter(
                TriagedEmail.workspace_id == workspace_id,
                TriagedEmail.priority.in_(["High", "Critical"]),
                TriagedEmail.status == "unread",
                TriagedEmail.id.notin_(self.processing_emails)
            ).all()
            
            for email in urgent_emails:
                if email.id in self.processing_emails:
                    continue
                
                self.processing_emails.add(email.id)
                try:
                    # Get user for this workspace/email
                    workspace = db.query(Workspace).filter(
                        Workspace.id == workspace_id
                    ).first()
                    if not workspace:
                        continue
                    
                    # For now, use first active user in workspace
                    # In production, use email.assigned_to or workspace owner
                    user = db.query(User).filter(User.is_active == True).first()
                    if not user:
                        continue
                    
                    # Trigger urgent email auto-chat
                    await service.trigger_auto_chat(
                        db,
                        user_id=user.id,
                        trigger=ConversationTrigger.URGENT_EMAIL,
                        context={"email_id": email.id}
                    )
                    
                    # Mark as processed
                    email.metadata_json = {
                        **(email.metadata_json or {}),
                        "auto_chat_triggered_at": datetime.now(timezone.utc).isoformat(),
                        "auto_chat_trigger_type": ConversationTrigger.URGENT_EMAIL.value
                    }
                    db.commit()
                    logger.info(f"[AutoChatWorker] Urgent email auto-chat triggered: {email.id}")
                    
                except Exception as e:
                    logger.error(f"[AutoChatWorker] Error processing urgent email {email.id}: {e}")
                finally:
                    self.processing_emails.discard(email.id)
        
        except Exception as e:
            logger.error(f"[AutoChatWorker] Error in _check_urgent_emails: {e}")
    
    async def _check_pending_followups(self, db: Session, workspace_id: str, service: AutoChatService) -> None:
        """Trigger reminders for emails pending 3+ days."""
        try:
            cutoff_date = datetime.now(timezone.utc) - timedelta(days=3)
            
            pending = db.query(TriagedEmail).filter(
                TriagedEmail.workspace_id == workspace_id,
                TriagedEmail.category == "FOLLOWUP",
                TriagedEmail.status == "pending",
                TriagedEmail.created_at < cutoff_date,
                TriagedEmail.id.notin_(self.processing_emails)
            ).all()
            
            for email in pending:
                self.processing_emails.add(email.id)
                try:
                    user = db.query(User).filter(User.is_active == True).first()
                    if not user:
                        continue
                    
                    days_pending = (datetime.now(timezone.utc) - email.created_at).days
                    
                    await service.trigger_auto_chat(
                        db,
                        user_id=user.id,
                        trigger=ConversationTrigger.PENDING_FOLLOWUP,
                        context={
                            "email_id": email.id,
                            "days_pending": days_pending
                        }
                    )
                    
                    email.metadata_json = {
                        **(email.metadata_json or {}),
                        "pending_reminder_sent_at": datetime.now(timezone.utc).isoformat()
                    }
                    db.commit()
                    logger.info(f"[AutoChatWorker] Pending followup reminder: {email.id} ({days_pending} days)")
                    
                except Exception as e:
                    logger.error(f"[AutoChatWorker] Error in pending followup {email.id}: {e}")
                finally:
                    self.processing_emails.discard(email.id)
        
        except Exception as e:
            logger.error(f"[AutoChatWorker] Error in _check_pending_followups: {e}")
    
    async def _check_meeting_prep(self, db: Session, workspace_id: str, service: AutoChatService) -> None:
        """Trigger meeting prep 5 minutes before meeting."""
        try:
            now = datetime.now(timezone.utc)
            window_start = now
            window_end = now + timedelta(minutes=6)  # 5-6 minute window
            
            upcoming_meetings = db.query(CalendarEventSnapshot).filter(
                CalendarEventSnapshot.workspace_id == workspace_id,
                CalendarEventSnapshot.start_time >= window_start,
                CalendarEventSnapshot.start_time <= window_end,
                CalendarEventSnapshot.id.notin_(self.processing_emails)
            ).all()
            
            for meeting in upcoming_meetings:
                self.processing_emails.add(meeting.id)
                try:
                    user = db.query(User).filter(User.is_active == True).first()
                    if not user:
                        continue
                    
                    await service.trigger_auto_chat(
                        db,
                        user_id=user.id,
                        trigger=ConversationTrigger.MEETING_PREP,
                        context={"event_id": meeting.id}
                    )
                    
                    meeting.metadata_json = {
                        **(meeting.metadata_json or {}),
                        "prep_chat_sent": True
                    }
                    db.commit()
                    logger.info(f"[AutoChatWorker] Meeting prep triggered: {meeting.title}")
                    
                except Exception as e:
                    logger.error(f"[AutoChatWorker] Error in meeting prep {meeting.id}: {e}")
                finally:
                    self.processing_emails.discard(meeting.id)
        
        except Exception as e:
            logger.error(f"[AutoChatWorker] Error in _check_meeting_prep: {e}")
    
    async def _check_afternoon_digest(self, db: Session, workspace: Workspace, service: AutoChatService) -> None:
        """Trigger daily afternoon digest at 3 PM."""
        try:
            now = datetime.now(timezone.utc)
            
            # Get all active users in workspace
            users = db.query(User).filter(User.is_active == True).all()
            
            for user in users:
                user_key = f"{workspace.id}:{user.id}"
                last_sent = self.last_digest_sent_at.get(user_key)
                
                # Check if we've already sent today
                if last_sent and (now - last_sent).days == 0:
                    continue
                
                # Check if it's 3 PM (±5 minutes for tolerance)
                current_hour = now.hour
                current_minute = now.minute
                if 14 <= current_hour <= 15 and 55 <= current_minute or current_minute <= 5:
                    try:
                        await service.trigger_auto_chat(
                            db,
                            user_id=user.id,
                            trigger=ConversationTrigger.AFTERNOON_DIGEST
                        )
                        
                        self.last_digest_sent_at[user_key] = now
                        logger.info(f"[AutoChatWorker] Afternoon digest sent to {user.id}")
                    
                    except Exception as e:
                        logger.error(f"[AutoChatWorker] Error sending digest to {user.id}: {e}")
        
        except Exception as e:
            logger.error(f"[AutoChatWorker] Error in _check_afternoon_digest: {e}")
    
    async def _check_calendar_conflicts(self, db: Session, workspace_id: str, service: AutoChatService) -> None:
        """Detect and auto-notify of calendar conflicts."""
        try:
            meetings = db.query(CalendarEventSnapshot).filter(
                CalendarEventSnapshot.workspace_id == workspace_id
            ).all()
            
            if len(meetings) < 2:
                return
            
            conflicts = []
            for i, m1 in enumerate(meetings):
                for m2 in meetings[i+1:]:
                    # Check if times overlap
                    if (m1.start_time < m2.end_time and m2.start_time < m1.end_time):
                        conflicts.append({
                            "title1": m1.title,
                            "title2": m2.title,
                            "conflict_at": m1.start_time.isoformat()
                        })
            
            if conflicts:
                user = db.query(User).filter(User.is_active == True).first()
                if user:
                    try:
                        await service.trigger_auto_chat(
                            db,
                            user_id=user.id,
                            trigger=ConversationTrigger.CALENDAR_CONFLICT,
                            context={"conflicts": conflicts}
                        )
                        logger.info(f"[AutoChatWorker] Calendar conflict alert: {len(conflicts)} conflicts")
                    except Exception as e:
                        logger.error(f"[AutoChatWorker] Error in conflict resolution: {e}")
        
        except Exception as e:
            logger.error(f"[AutoChatWorker] Error in _check_calendar_conflicts: {e}")
    
    async def _check_vip_responses(self, db: Session, workspace: Workspace, service: AutoChatService) -> None:
        """Trigger high-priority handling for VIP responses."""
        try:
            if not workspace or not workspace.settings_json:
                return
            
            vip_senders = workspace.settings_json.get("aaliyah", {}).get("vip_senders", [])
            if not vip_senders:
                return
            
            # Find new emails from VIPs
            vip_emails = db.query(TriagedEmail).filter(
                TriagedEmail.workspace_id == workspace.id,
                TriagedEmail.sender.in_(vip_senders),
                TriagedEmail.status == "unread",
                TriagedEmail.id.notin_(self.processing_emails)
            ).all()
            
            for email in vip_emails:
                self.processing_emails.add(email.id)
                try:
                    user = db.query(User).filter(User.is_active == True).first()
                    if not user:
                        continue
                    
                    vip_name = email.sender.split("<")[0].strip() if "<" in email.sender else email.sender
                    
                    await service.trigger_auto_chat(
                        db,
                        user_id=user.id,
                        trigger=ConversationTrigger.VIP_RESPONSE,
                        context={
                            "email_id": email.id,
                            "vip_name": vip_name
                        }
                    )
                    
                    email.metadata_json = {
                        **(email.metadata_json or {}),
                        "vip_priority_triggered": True
                    }
                    db.commit()
                    logger.info(f"[AutoChatWorker] VIP response auto-chat: {vip_name}")
                    
                except Exception as e:
                    logger.error(f"[AutoChatWorker] Error in VIP response {email.id}: {e}")
                finally:
                    self.processing_emails.discard(email.id)
        
        except Exception as e:
            logger.error(f"[AutoChatWorker] Error in _check_vip_responses: {e}")


async def start_auto_chat_worker() -> None:
    """
    Start the global auto-chat worker for all workspaces.
    Call this from the main orchestrator lifecycle.
    """
    db = SessionLocal()
    try:
        worker = AutoChatWorker()
        await worker.run_periodic_checks(db)
    finally:
        db.close()
