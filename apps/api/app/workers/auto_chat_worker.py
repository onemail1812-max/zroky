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
from sqlalchemy.orm.attributes import flag_modified

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

    async def run_periodic_checks(self) -> None:
        """Run all checks in a continuous loop with fresh sessions."""
        try:
            while True:
                db = SessionLocal()
                try:
                    workspaces = self._get_active_workspaces(db)
                    for workspace in workspaces:
                        try:
                            workspace_id = workspace.id
                            service = AutoChatService(workspace_id)
                            
                            # Check for new high-priority emails
                            await self._check_urgent_emails(db, workspace, service)
                            
                            # Check for pending follow-ups (3+ days)
                            await self._check_pending_followups(db, workspace, service)
                            
                            # Check for meeting prep (5 min before)
                            await self._check_meeting_prep(db, workspace, service)
                            
                            # Check for afternoon digest (once per day @ 3 PM)
                            await self._check_afternoon_digest(db, workspace, service)
                            
                            # Check for calendar conflicts
                            await self._check_calendar_conflicts(db, workspace, service)
                            
                            # Check for VIP responses
                            await self._check_vip_responses(db, workspace, service)
                        except Exception as e:
                            logger.error(f"[AutoChatWorker] Error processing workspace {workspace.id}: {e}")
                    
                except Exception as e:
                    logger.error(f"[AutoChatWorker] Error in periodic checks: {e}", exc_info=True)
                finally:
                    db.close()
                
                # Sleep 30 seconds before next check
                await asyncio.sleep(30)
        
        except asyncio.CancelledError:
            logger.info("[AutoChatWorker] Worker cancelled, shutting down gracefully")
        except Exception as e:
            logger.error(f"[AutoChatWorker] Fatal error: {e}", exc_info=True)
    
    async def _check_urgent_emails(self, db: Session, workspace: Workspace, service: AutoChatService) -> None:
        """Trigger auto-chat for URGENT/HIGH emails."""
        try:
            # Find new unopened high-priority emails that haven't triggered auto-chat yet
            urgent_emails = db.query(TriagedEmail).filter(
                TriagedEmail.workspace_id == workspace.id,
                TriagedEmail.priority.in_(["High", "Critical"]),
                TriagedEmail.is_read == False,
                TriagedEmail.id.notin_(self.processing_emails),
            ).all()

            # Filter in Python for JSON metadata key (more robust than SQL JSON filtering here)
            urgent_emails = [
                e for e in urgent_emails 
                if not (e.metadata_json or {}).get("auto_chat_triggered_at")
            ]
            
            for email in urgent_emails:
                if email.id in self.processing_emails:
                    continue
                
                self.processing_emails.add(email.id)
                try:
                    # Use the specific owner of this workspace
                    user = db.query(User).filter(User.id == workspace.owner_id).first()
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
    
    async def _check_pending_followups(self, db: Session, workspace: Workspace, service: AutoChatService) -> None:
        """Trigger reminders for emails pending 3+ days."""
        try:
            cutoff_date = datetime.now(timezone.utc) - timedelta(days=3)
            
            pending = db.query(TriagedEmail).filter(
                TriagedEmail.workspace_id == workspace.id,
                TriagedEmail.category == "Needs Reply",
                TriagedEmail.awaiting_reply == True,
                TriagedEmail.created_at < cutoff_date,
                TriagedEmail.id.notin_(self.processing_emails)
            ).all()
            
            # Filter ones already reminded
            pending = [
                e for e in pending 
                if not (e.metadata_json or {}).get("pending_reminder_sent_at")
            ]
            
            for email in pending:
                self.processing_emails.add(email.id)
                try:
                    user = db.query(User).filter(User.id == workspace.owner_id).first()
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
    
    async def _check_meeting_prep(self, db: Session, workspace: Workspace, service: AutoChatService) -> None:
        """Trigger meeting prep 5 minutes before meeting."""
        try:
            now = datetime.now(timezone.utc).replace(tzinfo=None)
            window_start = now
            window_end = now + timedelta(minutes=6)
            
            upcoming_meetings = db.query(CalendarEventSnapshot).filter(
                CalendarEventSnapshot.workspace_id == workspace.id,
                CalendarEventSnapshot.start_at >= window_start,
                CalendarEventSnapshot.start_at <= window_end,
                CalendarEventSnapshot.id.notin_(self.processing_emails)
            ).all()
            
            for meeting in upcoming_meetings:
                self.processing_emails.add(meeting.id)
                try:
                    settings = workspace.settings_json or {}
                    worker_state = settings.get("_worker_state", {})
                    prep_history = worker_state.get("meeting_prep_sent_ids", [])
                    
                    if meeting.id in prep_history:
                        continue # Already sent persistence-wise
                        
                    user = db.query(User).filter(User.id == workspace.owner_id).first()
                    if not user:
                        continue
                    
                    await service.trigger_auto_chat(
                        db,
                        user_id=user.id,
                        trigger=ConversationTrigger.MEETING_PREP,
                        context={"event_id": meeting.id}
                    )
                    
                    # Update persistence
                    prep_history.append(meeting.id)
                    # Keep history manageable (last 50 meetings)
                    prep_history = prep_history[-50:]
                    
                    if "_worker_state" not in settings:
                        settings["_worker_state"] = {}
                    settings["_worker_state"]["meeting_prep_sent_ids"] = prep_history
                    workspace.settings_json = settings
                    flag_modified(workspace, "settings_json")
                    db.commit()
                    
                    logger.info(f"[AutoChatWorker] Meeting prep alert sent for {meeting.id} (persisted)")
                    
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
            
            # Get only the owner of this workspace for the digest
            user = db.query(User).filter(User.id == workspace.owner_id).first()
            if not user or not user.is_active:
                return
            
            # Use persisted state if available
            settings = workspace.settings_json or {}
            aaliyah_state = settings.get("_worker_state", {})
            last_sent_str = aaliyah_state.get("last_afternoon_digest_at")
            
            # Robust datetime parsing
            last_sent = None
            if last_sent_str:
                try:
                    last_sent = datetime.fromisoformat(last_sent_str)
                    if last_sent.tzinfo is None:
                        last_sent = last_sent.replace(tzinfo=timezone.utc)
                except Exception:
                    last_sent = None
            
            # Check if we've already sent today
            if last_sent and last_sent.date() == now.date():
                return
            
            # Trigger if it's 3 PM (15:00) window
            if now.hour == 15:
                try:
                    await service.trigger_auto_chat(
                        db,
                        user_id=user.id,
                        trigger=ConversationTrigger.AFTERNOON_DIGEST
                    )
                    
                    # Persist state to DB to survive restarts
                    if "_worker_state" not in settings:
                        settings["_worker_state"] = {}
                    settings["_worker_state"]["last_afternoon_digest_at"] = now.isoformat()
                    workspace.settings_json = settings
                    flag_modified(workspace, "settings_json")
                    db.commit()

                    logger.info(f"[AutoChatWorker] Afternoon digest sent to {user.id} (persisted)")
                
                except Exception as e:
                    logger.error(f"[AutoChatWorker] Error sending digest to {user.id}: {e}")
        
        except Exception as e:
            logger.error(f"[AutoChatWorker] Error in _check_afternoon_digest: {e}")
    
    async def _check_calendar_conflicts(self, db: Session, workspace: Workspace, service: AutoChatService) -> None:
        """Detect and auto-notify of calendar conflicts (O(n) sweep line)."""
        try:
            now = datetime.now(timezone.utc).replace(tzinfo=None) # Assume DB stores naive UTC
            # Only check for future conflicts in the next 7 days
            week_out = now + timedelta(days=7)
            
            meetings = db.query(CalendarEventSnapshot).filter(
                CalendarEventSnapshot.workspace_id == workspace.id,
                CalendarEventSnapshot.start_at >= now,
                CalendarEventSnapshot.start_at <= week_out,
                CalendarEventSnapshot.is_cancelled == False,
                CalendarEventSnapshot.is_all_day == False # Skip all-day events by default
            ).order_by(CalendarEventSnapshot.start_at.asc()).limit(200).all()
            
            if len(meetings) < 2:
                return
            
            conflicts = []
            max_end = None
            prev_meeting = None
            buffer_threshold = timedelta(minutes=15)
            
            # Sweep line for conflicts and tight buffers
            for m in meetings:
                if max_end:
                    if m.start_at < max_end:
                        # Overlap
                        conflicts.append({
                            "type": "overlap",
                            "title1": prev_meeting.title if prev_meeting else "Previous Event",
                            "title2": m.title,
                            "conflict_at": m.start_at.isoformat()
                        })
                    elif (m.start_at - max_end) < buffer_threshold:
                        # Tight buffer (< 15m)
                        conflicts.append({
                            "type": "tight_buffer",
                            "title1": prev_meeting.title if prev_meeting else "Previous Event",
                            "title2": m.title,
                            "conflict_at": m.start_at.isoformat()
                        })
                
                # Update trackers
                if not max_end or m.end_at > max_end:
                    max_end = m.end_at
                    prev_meeting = m

            if conflicts:
                # Deduplication: Check if we already alerted about this conflict set
                settings = workspace.settings_json or {}
                worker_state = settings.get("_worker_state", {})
                
                # Fingerprint: All titles and times in this conflict set
                conflict_fingerprint = "|".join(sorted([f"{c['title1']}:{c['title2']}:{c['conflict_at']}" for c in conflicts]))
                
                last_conflict_fingerprint = worker_state.get("last_calendar_conflict_fingerprint")
                
                if last_conflict_fingerprint == conflict_fingerprint:
                    return # Already alerted for this specific set of conflicts
                
                user = db.query(User).filter(User.id == workspace.owner_id).first()
                if user:
                    try:
                        await service.trigger_auto_chat(
                            db,
                            user_id=user.id,
                            trigger=ConversationTrigger.CALENDAR_CONFLICT,
                            context={"conflicts": conflicts}
                        )
                        
                        # Persist to prevent spam
                        if "_worker_state" not in settings:
                            settings["_worker_state"] = {}
                        settings["_worker_state"]["last_calendar_conflict_fingerprint"] = conflict_fingerprint
                        workspace.settings_json = settings
                        from sqlalchemy.orm.attributes import flag_modified
                        flag_modified(workspace, "settings_json")
                        db.commit()
                        
                        logger.info(f"[AutoChatWorker] Calendar conflict alert: {len(conflicts)} detected (persisted fingerprint)")
                    except Exception as e:
                        logger.error(f"[AutoChatWorker] Error in conflict resolution triggering: {e}")
        
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
            
            # Find new emails from VIPs that haven't triggered auto-chat
            vip_emails = db.query(TriagedEmail).filter(
                TriagedEmail.workspace_id == workspace.id,
                TriagedEmail.sender.in_(vip_senders),
                TriagedEmail.is_read == False,
                TriagedEmail.id.notin_(self.processing_emails)
            ).all()

            # Filter already triggered
            vip_emails = [
                e for e in vip_emails 
                if not (e.metadata_json or {}).get("vip_priority_triggered")
            ]
            
            for email in vip_emails:
                self.processing_emails.add(email.id)
                try:
                    user = db.query(User).filter(User.id == workspace.owner_id).first()
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
    try:
        worker = AutoChatWorker()
        await worker.run_periodic_checks()
    except Exception as e:
        logger.fatal(f"[AutoChatWorker] Fatal crash: {e}")
