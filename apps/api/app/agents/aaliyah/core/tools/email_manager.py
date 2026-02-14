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

        db = SessionLocal()
        try:
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
