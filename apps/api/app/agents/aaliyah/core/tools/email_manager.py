"""Email Manager Tool backed by live Gmail/Outlook integrations."""

from __future__ import annotations

from typing import Any, Dict, Tuple

from app.database import SessionLocal
from app.models.integration import IntegrationProvider
from app.services.brain.guardrails import redact_text
from app.services.integrations.google_gmail import GmailService
from app.services.integrations.integration_token_manager import IntegrationTokenManager
from app.services.integrations.microsoft_outlook import OutlookService

from ..ingestion.email_ingestor import EmailIngestor
from ..interfaces.tool import AaliyahTool
from ..runtime_gate import final_action_gate
from app.models.workspace import Workspace
import re
from datetime import datetime
from collections import defaultdict

# Regex for basic email validation
EMAIL_REGEX = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
BLACKLISTED_DOMAINS = {"example.com", "test.com", "dummy.com", "localhost"}

# In-memory fallback if Redis is unavailable
_fallback_limits = defaultdict(int)

def _check_rate_limit(action_type: str, workspace_id: str, limit: int) -> bool:
    """Returns True if allowed, False if limit exceeded."""
    from app.services.brain.hot_state import _get_redis
    redis_client = _get_redis()
    today = datetime.now().strftime("%Y-%m-%d")
    key = f"aaliyah:limits:{action_type}:{workspace_id}:{today}"
    
    if redis_client:
        try:
            current = redis_client.incr(key)
            if current == 1:
                redis_client.expire(key, 86400) # 24 hours
            if current > limit:
                return False
            return True
        except Exception:
            pass # fallback if redis fails
            
    # Fallback
    _fallback_limits[key] += 1
    if _fallback_limits[key] > limit:
        return False
    return True

def _validate_recipients(recipients_str: str) -> None:
    recipients = [r.strip() for r in recipients_str.split(",")]
    for r in recipients:
        if not r: continue
        # strip name if format like "Name <email>"
        email = r
        if "<" in r and ">" in r:
            email = r[r.find("<")+1:r.find(">")]
        
        email = email.lower().strip()
        if not EMAIL_REGEX.match(email):
            raise ValueError(f"Invalid email format: '{email}'")
        
        domain = email.split("@")[-1]
        if domain in BLACKLISTED_DOMAINS:
            raise ValueError(f"Sending to blacklisted test domain not allowed: '{domain}'")


class EmailManager(AaliyahTool):
    @property
    def name(self) -> str:
        return "email_manager"

    @property
    def description(self) -> str:
        return "Reads, drafts, and sends emails on behalf of the user."

    async def run(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        action = str(input_data.get("action") or "").lower().strip()
        if action in {"draft", "draft_email", "create_draft"}:
            return await self._draft_email(input_data)
        if action in {"send", "send_email"}:
            return await self._send_email(input_data)
        if action in {"search", "search_emails", "find"}:
            return await self._search_emails(input_data)
        return {"error": "unsupported_action", "message": f"Unsupported email action '{action}'"}

    def _resolve_client(self, *, workspace_id: str, provider: str, db) -> Tuple[str, Any]:
        manager = IntegrationTokenManager(db)
        normalized = (provider or "auto").lower().strip()

        if normalized in {"auto", ""}:
            if manager.get_valid_token(workspace_id, IntegrationProvider.GOOGLE_GMAIL):
                normalized = "google"
            elif manager.get_valid_token(workspace_id, IntegrationProvider.OUTLOOK):
                normalized = "microsoft"

        if normalized in {"google", "gmail"}:
            token = manager.get_valid_token(workspace_id, IntegrationProvider.GOOGLE_GMAIL)
            if not token:
                raise ValueError("Gmail is not connected for this workspace")
            return "google", GmailService(token)

        if normalized in {"microsoft", "outlook"}:
            token = manager.get_valid_token(workspace_id, IntegrationProvider.OUTLOOK)
            access_token = str((token or {}).get("access_token") or "")
            if not access_token:
                raise ValueError("Outlook is not connected for this workspace")
            return "microsoft", OutlookService(access_token)

        raise ValueError(f"Unsupported provider '{provider}'")

    async def _draft_email(self, data: Dict[str, Any]) -> Dict[str, Any]:
        workspace_id = str(data.get("workspace_id") or "").strip()
        provider = str(data.get("provider") or "auto")
        recipient = str(data.get("recipient") or "").strip()
        subject = str(data.get("subject") or "").strip()
        body = str(data.get("body") or "").strip()

        if not workspace_id:
            return {"error": "invalid_request", "message": "workspace_id is required"}
        if not recipient or not subject or not body:
            return {"error": "invalid_request", "message": "recipient, subject, and body are required"}

        # Safety: Ensure recipient is not a blocked domain or internal-only if restricted
        try:
            _validate_recipients(recipient)
        except ValueError as ve:
            return {"error": "validation_failed", "message": str(ve)}
            
        # Rate Limiting: 50 drafts per day
        if not _check_rate_limit("drafts", workspace_id, 50):
            return {"error": "rate_limit_exceeded", "message": "Daily AI draft limit reached (50/day). Please try again tomorrow."}

        db = SessionLocal()
        try:
            resolved_provider, client = self._resolve_client(workspace_id=workspace_id, provider=provider, db=db)
            draft = client.create_draft(recipient=recipient, subject=subject, body=body)
            draft_id = draft.get("id") if isinstance(draft, dict) else None
            return {"status": "draft_created", "provider": resolved_provider, "draft_id": draft_id, "raw": draft}
        except Exception as exc:
            return {"error": "draft_failed", "message": redact_text(str(exc))}
        finally:
            db.close()

    async def _send_email(self, data: Dict[str, Any]) -> Dict[str, Any]:
        workspace_id = str(data.get("workspace_id") or "").strip()
        provider = str(data.get("provider") or "auto")
        recipient = str(data.get("recipient") or "").strip()
        subject = str(data.get("subject") or "").strip()
        body = str(data.get("body") or "").strip()

        if not workspace_id:
            return {"error": "invalid_request", "message": "workspace_id is required"}
        if not recipient or not subject or not body:
            return {"error": "invalid_request", "message": "recipient, subject, and body are required"}

        # CRITICAL: Since this tool can send on behalf of the user, ensure it's not being abused
        # for spam or massive bulk sending.
        try:
            _validate_recipients(recipient)
        except ValueError as ve:
            return {"error": "validation_failed", "message": f"Action blocked due to safety measures: {str(ve)}"}
            
        # Hard Rate Limiting: 20 sends per day autonomously
        if not _check_rate_limit("sends", workspace_id, 20):
             return {"error": "rate_limit_exceeded", "message": "CRITICAL: Daily autonomous send limit reached (20/day). Action blocked for safety."}

        db = SessionLocal()
        try:
            # 2. Final Action Gate
            workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
            settings = getattr(workspace, "settings_json", {}) or {}
            
            draft_payload = {
                "recipient": recipient,
                "subject": subject,
                "body": body,
                "provider": provider
            }
            
            allowed = final_action_gate(
                action="SEND",
                email_row=None, # Compose New
                draft=draft_payload,
                settings=settings,
                is_explicit_approval=False # Autonomous tool run
            )
            
            if not allowed:
                return {"error": "gate_blocked", "message": "Action blocked by Final Action Gate. content safety or policy check failed."}

            resolved_provider, client = self._resolve_client(workspace_id=workspace_id, provider=provider, db=db)
            sent = client.send_message(recipient=recipient, subject=subject, body=body)
            return {"status": "sent", "provider": resolved_provider, "raw": sent}
        except Exception as exc:
            return {"error": "send_failed", "message": redact_text(str(exc))}
        finally:
            db.close()

    async def _search_emails(self, data: Dict[str, Any]) -> Dict[str, Any]:
        workspace_id = str(data.get("workspace_id") or "").strip()
        provider = str(data.get("provider") or "auto")
        max_results = int(data.get("max_results") or 20)

        if not workspace_id:
            return {"error": "invalid_request", "message": "workspace_id is required"}

        db = SessionLocal()
        try:
            ingestor = EmailIngestor(workspace_id, db)
            results = await ingestor.fetch_and_normalize(provider=provider, max_results=max_results)
            return {"results": [result.model_dump(mode="json") for result in results]}
        finally:
            db.close()
