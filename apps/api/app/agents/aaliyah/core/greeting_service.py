"""
Deterministic Greeting Engine for Aaliyah.
Generates state-based greetings with name personalization and actionable CTAs.
"""
from typing import Any, Dict, Optional
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.workspace import Workspace
from app.models.integration import Integration, IntegrationProvider, IntegrationStatus
from app.services.integrations.health_service import ConnectorHealthService
from datetime import datetime
import json

from app.models.triaged_email import TriagedEmail
from app.models.calendar_event_snapshot import CalendarEventSnapshot

class GreetingService:
    def __init__(self, db: Session, workspace_id: str, user_id: str):
        self.db = db
        self.workspace_id = workspace_id
        self.user_id = user_id

    def _resolve_name(self) -> str:
        """Resolve first name with priority: Workspace Profile -> Integration Profile -> Email -> Fallback."""
        # 1. Workspace Profile (if exists)
        # Assuming workspace doesn't hold user profile directly, checking User model
        user = self.db.query(User).filter(User.id == self.user_id).first()
        if user and user.full_name:
            return user.full_name.split(" ")[0]

        # 2. Integration Profile (Google/Microsoft)
        # Check for any connected integration with config
        integration = (
            self.db.query(Integration)
            .filter(
                Integration.workspace_id == self.workspace_id,
                Integration.status == IntegrationStatus.CONNECTED,
                Integration.config_json.isnot(None)
            )
            .first()
        )
        if integration:
            try:
                config = json.loads(integration.config_json)
                if "name" in config:
                    return config["name"].split(" ")[0]
                if "email" in config:  # fallback to email local part from integration
                     return config["email"].split("@")[0].capitalize()
            except:
                pass

        # 3. User Email Fallback
        if user and user.email:
             return user.email.split("@")[0].capitalize()

        return "there"

    def get_greeting_state(self) -> Dict[str, Any]:
        """Determine the current state and return the appropriate greeting template."""
        
        # 1. Fetch Health Status
        health_service = ConnectorHealthService(self.db, self.workspace_id)
        report = health_service.get_detailed_health()
        
        email_status = report.get("email", {}).get("status", "NOT_CONNECTED")
        calendar_status = report.get("calendar", {}).get("status", "NOT_CONNECTED")
        
        # 2. Resolve Name
        first_name = self._resolve_name()
        
        # 3. Determine Greeting Template
        
        # A) Error State (Provider Down / Network)
        if email_status == "ERROR" or calendar_status == "ERROR":
             return {
                "headline": f"Connection Interrupted",
                "greeting": f"Hi {first_name}, I'm having trouble syncing your accounts due to a network error.",
                "subtext": "Retrying automatically. If this persists, please check your connection.",
                "cta_label": "Retry Sync",
                "cta_action": "retry_sync",
                "state": "error"
            }

        # B) Reconnect Required
        if email_status == "NEEDS_RECONNECT" or calendar_status == "NEEDS_RECONNECT" or \
           email_status == "EXPIRED" or calendar_status == "EXPIRED" or \
           email_status == "REVOKED" or calendar_status == "REVOKED":
            return {
                "headline": "Re-authorization Required",
                "greeting": f"Hey {first_name}. Your email access needs re-authorization.",
                "subtext": "Reconnect to resume syncing and drafting.",
                "cta_label": "Re-authorize Email",
                "cta_action": "reconnect_email",
                "state": "reconnect"
            }
            
        # C) Missing Permissions (Scope)
        if email_status == "SCOPE_MISSING" or calendar_status == "SCOPE_MISSING":
             return {
                "headline": "Permissions Update",
                "greeting": f"Hi {first_name}, I need updated permissions to function correctly.",
                "subtext": "Please approve the missing scopes.",
                "cta_label": "Update Permissions",
                "cta_action": "update_permissions",
                "state": "reconnect"
            }

        # D) First-time / Not Connected
        # Check if NO integrations are connected
        if email_status == "NOT_CONNECTED" and calendar_status == "NOT_CONNECTED":
            return {
                "headline": "Welcome to Aaliyah",
                "greeting": f"Hi {first_name}, I'm Aaliyah — your Executive Assistant.",
                "subtext": "To start, connect your email. Once authorized, I'll sync your inbox, prioritize replies, and prepare drafts.",
                "cta_label": "Authorize Email", # Frontend should offer both G/Outlook options
                "cta_action": "connect_email",
                "state": "onboarding"
            }

        # E) Connected but NOT YET SYNCED (Truth Gating)
        # Check if we have any data in the tables
        # Note: These models may be stubs in stateless mode, so we guard with try/except
        has_emails = False
        has_events = False
        try:
            has_emails = self.db.query(TriagedEmail).filter(TriagedEmail.workspace_id == self.workspace_id).first() is not None
        except Exception:
            pass
        try:
            has_events = self.db.query(CalendarEventSnapshot).filter(CalendarEventSnapshot.workspace_id == self.workspace_id).first() is not None
        except Exception:
            pass
        
        if not has_emails and not has_events:
             return {
                "headline": "Initial Sync Required",
                "greeting": f"Hi {first_name}. I'm connected, but I haven't pulled your data yet.",
                "subtext": "I need to perform a deep scan of your inbox and calendar to build your first briefing. This usually takes 30-60 seconds.",
                "cta_label": "Sync My Workspace",
                "cta_action": "retry_sync",
                "state": "connected_not_synced"
            }

        # F) Returning + Healthy
        # Default happy path
        return {
            "headline": "Morning Check",
            "greeting": f"Welcome back, {first_name}.",
            "subtext": "Everything is operational. I've analyzed your latest comms and schedule. View your briefing below.",
            "cta_label": "View Briefing",
            "cta_action": "view_briefing",
            "state": "healthy"
        }
