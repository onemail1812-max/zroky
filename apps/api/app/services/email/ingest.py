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
    Orchestrate sync for all connected email integrations.
    """
    integrations = db.query(Integration).filter(
        Integration.workspace_id == workspace_id,
        Integration.status == IntegrationStatus.CONNECTED
    ).all()
    
    for integration in integrations:
        try:
            # Check if email capable
            scopes = integration.scopes_json or "[]"
            config = integration.config_json or "{}"
            
            is_gmail = integration.provider == IntegrationProvider.GOOGLE_GMAIL
            is_outlook = integration.provider == IntegrationProvider.OUTLOOK
            
            # Simple check (can refine based on scopes later)
            if not (is_gmail or is_outlook):
                continue
                
            # Retrieve token via manager (handles expiry check)
            token_mgr = IntegrationTokenManager(db)
            token_dict = token_mgr.get_valid_token(integration.workspace_id, integration.provider)
            
            access_token = token_dict.get("access_token") if token_dict else None

            if not access_token:
                print(f"Skipping {integration.provider}: No access token")
                continue
                
            messages = []
            raw_msgs = []
            
            try:
                if is_gmail:
                    raw_msgs = fetch_gmail_messages(access_token, limit=20)
                elif is_outlook:
                    raw_msgs = fetch_outlook_messages(access_token, limit=20)
            except Exception as e:
                # 401 Retry Logic
                if "401" in str(e) or "Unauthorized" in str(e):
                    print(f"401 detected for {integration.id}, attempting refresh...")
                    token_dict = token_mgr.refresh_integration_token(integration)
                    if token_dict and token_dict.get("access_token"):
                        access_token = token_dict.get("access_token")
                        # Retry fetch
                        if is_gmail:
                            raw_msgs = fetch_gmail_messages(access_token, limit=20)
                        elif is_outlook:
                            raw_msgs = fetch_outlook_messages(access_token, limit=20)
                    else:
                        print(f"Refresh failed for {integration.id}, marking NEEDS_RECONNECT")
                        integration.status = IntegrationStatus.NEEDS_RECONNECT
                        db.commit()
                        continue
                else:
                    raise e

            # Parse fetched messages
            if is_gmail:
                for raw in raw_msgs:
                    msg = parse_gmail_message(raw, workspace_id, integration.id)
                    if msg: messages.append(msg)
            elif is_outlook:
                for raw in raw_msgs:
                    msg = parse_outlook_message(raw, workspace_id, integration.id)
                    if msg: messages.append(msg)
            
            # Upsert
            messages_to_process = []
            for msg in messages:
                existing = db.query(EmailMessage).filter(EmailMessage.id == msg.id).first()
                if not existing:
                    # Classification
                    raw_labels = classify_email(
                        sender=msg.sender.get("email", ""),
                        subject=msg.subject,
                        body=msg.body_cleaned,
                        raw_headers={} # Pass raw headers if available in future
                    )
                    msg.labels = list(set((msg.labels or []) + raw_labels))
                    db.add(msg)
                    messages_to_process.append(msg)
                else:
                    # Update status if needed (e.g. read state)
                    existing.is_read = msg.is_read
                    # We don't overwrite labels on update to preserve manual tags, unless logic changes
            
            db.commit()

            # Post-processing: Drafts
            llm_client = get_openrouter_client()
            
            # Find newly added messages that need reply and don't have drafts
            for msg in messages_to_process:
                if "needs_reply" in (msg.labels or []):
                    # Check if draft exists
                    existing_draft = db.query(Draft).filter(Draft.email_message_id == msg.id).first()
                    if not existing_draft:
                        # Async draft generation
                        try:
                           loop = asyncio.get_event_loop()
                        except RuntimeError:
                           loop = asyncio.new_event_loop()
                           asyncio.set_event_loop(loop)
                           
                        loop.run_until_complete(generate_draft(db, msg, llm_client))
            
        except Exception as e:
            print(f"Sync failed for integration {integration.id}: {e}")
            db.rollback()
