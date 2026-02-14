"""Email ingestion for Gmail/Outlook with normalized schema output."""

from __future__ import annotations

from datetime import datetime
import logging
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from app.models.integration import IntegrationProvider
from app.services.brain.guardrails import redact_text
from app.services.integrations.google_gmail import GmailService
from app.services.integrations.integration_token_manager import IntegrationTokenManager
from app.services.integrations.microsoft_outlook import OutlookService

logger = logging.getLogger(__name__)


class EmailMetadata(BaseModel):
    sender: Optional[str] = None
    subject: Optional[str] = None
    thread_id: Optional[str] = None


class NormalizedEmailMessage(BaseModel):
    id: str = Field(min_length=1, max_length=256)
    workspace_id: str = Field(min_length=1, max_length=128)
    source: str = "email"
    provider: str = Field(min_length=1, max_length=32)
    metadata: EmailMetadata
    content: str = Field(default="", max_length=20_000)
    created_at: Optional[datetime] = None
    is_read: bool = False

    @field_validator("provider")
    @classmethod
    def normalize_provider(cls, value: str) -> str:
        normalized = value.lower().strip()
        if normalized in {"gmail", "google"}:
            return "google"
        if normalized in {"microsoft", "outlook"}:
            return "microsoft"
        return normalized or "unknown"


class EmailIngestor:
    def __init__(self, workspace_id: str, db: Session):
        self.workspace_id = workspace_id
        self.db = db
        self.logger = logger.getChild(f"EmailIngestor.{workspace_id}")
        self.token_manager = IntegrationTokenManager(db)

    def _resolve_provider(self, provider: str) -> Optional[str]:
        provider = (provider or "auto").lower().strip()
        if provider in {"google", "gmail"}:
            return "google"
        if provider in {"microsoft", "outlook"}:
            return "microsoft"

        gmail_token = self.token_manager.get_valid_token(self.workspace_id, IntegrationProvider.GOOGLE_GMAIL)
        if gmail_token:
            return "google"
        outlook_token = self.token_manager.get_valid_token(self.workspace_id, IntegrationProvider.OUTLOOK)
        if outlook_token:
            return "microsoft"
        return None

    async def fetch_unread(self, provider: str = "auto", max_results: int = 10) -> List[Dict[str, Any]]:
        """Fetch unread messages from the selected provider."""
        capped_results = max(1, min(int(max_results), 100))
        resolved_provider = self._resolve_provider(provider)
        if not resolved_provider:
            return []

        self.logger.info("Fetching unread emails provider=%s max_results=%s", resolved_provider, capped_results)

        try:
            if resolved_provider == "google":
                token = self.token_manager.get_valid_token(self.workspace_id, IntegrationProvider.GOOGLE_GMAIL)
                if not token:
                    return []
                return GmailService(token).list_unread_messages(max_results=capped_results)

            token = self.token_manager.get_valid_token(self.workspace_id, IntegrationProvider.OUTLOOK)
            if not token:
                return []
            access_token = str(token.get("access_token") or "")
            if not access_token:
                return []
            return OutlookService(access_token).list_unread_messages(max_results=capped_results)
        except Exception as exc:  # noqa: BLE001
            self.logger.warning("Email ingestion failed provider=%s err=%s", resolved_provider, redact_text(str(exc)))
            return []

    async def fetch_sent(self, provider: str = "auto", max_results: int = 5) -> List[Dict[str, Any]]:
        """Fetch sent messages from the selected provider for style analysis."""
        capped_results = max(1, min(int(max_results), 20))
        resolved_provider = self._resolve_provider(provider)
        if not resolved_provider:
            return []

        try:
            if resolved_provider == "google":
                token = self.token_manager.get_valid_token(self.workspace_id, IntegrationProvider.GOOGLE_GMAIL)
                if not token:
                    return []
                return GmailService(token).list_sent_messages(max_results=capped_results)

            token = self.token_manager.get_valid_token(self.workspace_id, IntegrationProvider.OUTLOOK)
            if not token:
                return []
            access_token = str(token.get("access_token") or "")
            if not access_token:
                return []
            return OutlookService(access_token).list_sent_messages(max_results=capped_results)
        except Exception as exc:  # noqa: BLE001
            self.logger.warning("Fetch sent emails failed provider=%s err=%s", resolved_provider, redact_text(str(exc)))
            return []

    async def normalize_message(self, raw_msg: Dict[str, Any], provider: str) -> NormalizedEmailMessage:
        """Convert provider-specific payload into stable internal shape."""
        created_at: Optional[datetime] = None
        raw_created = raw_msg.get("received_at")
        if isinstance(raw_created, datetime):
            created_at = raw_created
        elif isinstance(raw_created, str) and raw_created.strip():
            try:
                created_at = datetime.fromisoformat(raw_created.replace("Z", "+00:00"))
            except ValueError:
                created_at = None

        normalized = NormalizedEmailMessage(
            id=str(raw_msg.get("id") or "").strip() or "unknown",
            workspace_id=self.workspace_id,
            provider=provider,
            metadata=EmailMetadata(
                sender=(str(raw_msg.get("sender") or "").strip() or None),
                subject=(str(raw_msg.get("subject") or "").strip() or None),
                thread_id=(str(raw_msg.get("thread_id") or "").strip() or None),
            ),
            content=str(raw_msg.get("snippet") or ""),
            created_at=created_at,
            is_read=bool(raw_msg.get("is_read", False)),
        )
        return normalized

    async def fetch_and_normalize(self, provider: str = "auto", max_results: int = 10) -> List[NormalizedEmailMessage]:
        raw_messages = await self.fetch_unread(provider=provider, max_results=max_results)
        resolved_provider = self._resolve_provider(provider) or "unknown"
        normalized: List[NormalizedEmailMessage] = []
        for raw in raw_messages:
            normalized.append(await self.normalize_message(raw, provider=resolved_provider))
        return normalized
