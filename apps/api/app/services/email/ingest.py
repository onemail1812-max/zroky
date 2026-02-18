from datetime import datetime
from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.integration import Integration, IntegrationProvider, IntegrationStatus
from app.models.email import EmailMessage
from app.services.email.fetchers import fetch_gmail_messages, fetch_outlook_messages
from app.services.email.normalization import parse_gmail_message, parse_outlook_message
from app.services.integrations.token_store import decrypt_token
from app.services.email.classifier import classify_email
from app.agents.aaliyah.drafting import generate_draft
from app.services.llm.openrouter_client import get_openrouter_client
import asyncio
from app.models.draft import Draft
from app.services.integrations.integration_token_manager import IntegrationTokenManager

def sync_all_inboxes(db: Session, workspace_id: str):
    """
    Orchestrate sync for all connected email integrations using AaliyahOrchestrator.
    """
    from app.agents.aaliyah.core.orchestrator import AaliyahOrchestrator
    
    # We need to run this in an async context if called from sync code
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

    orchestrator = AaliyahOrchestrator(workspace_id=workspace_id)
    
    # Sync Gmail
    try:
        loop.run_until_complete(orchestrator.sync_inbox(db, user_id="system", provider="google"))
    except Exception as e:
        print(f"Gmail sync failed for workspace {workspace_id}: {e}")

    # Sync Outlook
    try:
        loop.run_until_complete(orchestrator.sync_inbox(db, user_id="system", provider="microsoft"))
    except Exception as e:
        print(f"Outlook sync failed for workspace {workspace_id}: {e}")
