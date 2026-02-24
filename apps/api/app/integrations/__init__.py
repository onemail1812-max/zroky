"""Integrations package — stateless email/calendar clients."""
from app.integrations.gmail_client import GmailClient
from app.integrations.outlook_client import OutlookClient

__all__ = ["GmailClient", "OutlookClient"]
