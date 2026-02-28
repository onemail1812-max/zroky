from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.integration import Integration, IntegrationProvider, IntegrationStatus

class ConnectorHealthService:
    """Stateless / Persistent shared health service for Aaliyah integrations."""
    def __init__(self, db: Session, workspace_id: str):
        self.db = db
        self.workspace_id = workspace_id

    def get_detailed_health(self) -> Dict[str, Any]:
        """
        Calculates health by querying the Integration table.
        Mirroring the logic in main.py for system-wide consistency.
        """
        integrations = self.db.query(Integration).filter(
            Integration.workspace_id == self.workspace_id
        ).all()

        google_connected = any([
            i.provider in ("google", "google_gmail", "GOOGLE_GMAIL", IntegrationProvider.GOOGLE_GMAIL) 
            and i.token_encrypted 
            and i.status == IntegrationStatus.CONNECTED
            for i in integrations
        ])
        microsoft_connected = any([
            i.provider in ("microsoft", "outlook", "OUTLOOK", IntegrationProvider.OUTLOOK) 
            and i.token_encrypted 
            and i.status == IntegrationStatus.CONNECTED
            for i in integrations
        ])

        email_accessible = google_connected or microsoft_connected

        return {
            "email_accessible": email_accessible,
            "calendar_accessible": email_accessible,
            "providers": {
                "google_gmail": "CONNECTED" if google_connected else "NOT_CONNECTED",
                "outlook": "CONNECTED" if microsoft_connected else "NOT_CONNECTED",
            },
            "email_health": {
                "connected": email_accessible,
                "status": "OK" if email_accessible else "NO_TOKEN",
                "error_code": None if email_accessible else "NO_INTEGRATION",
            },
            "calendar_health": {
                "connected": email_accessible,
                "status": "OK" if email_accessible else "NO_TOKEN",
                "error_code": None if email_accessible else "NO_INTEGRATION",
            },
            "email": { # Legacy compatibility
                "connected": email_accessible,
                "status": "OK" if email_accessible else "NOT_CONNECTED",
            },
            "calendar": { # Legacy compatibility
                "connected": email_accessible,
                "status": "OK" if email_accessible else "NOT_CONNECTED",
            }
        }
