"""Email ingestion for Gmail/Outlook with normalized schema output."""

from __future__ import annotations

from datetime import datetime, timedelta
import logging
import uuid
from typing import Any, Dict, List, Optional, Callable

from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from app.models.integration import IntegrationProvider
from app.models.search_index import EmailIndex
from app.services.brain.guardrails import redact_text
from app.services.integrations.google_gmail import GmailService
from app.services.integrations.integration_token_manager import IntegrationTokenManager
from app.services.integrations.microsoft_outlook import OutlookService
from app.services.integrations.token_store import get_valid_token

logger = logging.getLogger(__name__)


class AttachmentMetadata(BaseModel):
    id: str
    filename: str
    mime_type: str
    size: int # in bytes
    content_id: Optional[str] = None # For inline images


class EmailMetadata(BaseModel):
    sender: Optional[str] = None
    subject: Optional[str] = None
    thread_id: Optional[str] = None
    headers: Dict[str, str] = Field(default_factory=dict)
    attachments: List[AttachmentMetadata] = Field(default_factory=list)


class NormalizedEmailMessage(BaseModel):
    id: str = Field(min_length=1, max_length=256)
    workspace_id: str = Field(min_length=1, max_length=128)
    source: str = "email"
    provider: str = Field(min_length=1, max_length=32)
    metadata: EmailMetadata
    content: str = Field(default="", max_length=20_000)
    created_at: Optional[datetime] = None
    is_read: bool = False
    has_attachments: bool = False

    @field_validator("provider")
    @classmethod
    def normalize_provider(cls, value: str) -> str:
        normalized = value.lower().strip()
        if normalized in {"gmail", "google"}:
            return "google"
        if normalized in {"microsoft", "outlook"}:
            return "microsoft"
        return normalized or "unknown"


import email.utils
from datetime import timezone as py_timezone

def normalize_sender(sender: Optional[str]) -> Optional[str]:
    if not sender:
        return None
    name, addr = email.utils.parseaddr(sender)
    addr = addr.lower().strip()
    if name:
        return f"{name} <{addr}>"
    return addr

def normalize_timestamp(dt: Optional[datetime]) -> Optional[datetime]:
    if not dt:
        return None
    # Ensure it's UTC aware if it isn't
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=py_timezone.utc)
    
    # Convert to IST (UTC+5:30)
    ist_offset = timedelta(hours=5, minutes=30)
    ist_tz = py_timezone(ist_offset)
    return dt.astimezone(ist_tz)

class EmailIngestor:
    def __init__(self, workspace_id: str, db: Session):
        self.workspace_id = workspace_id
        self.db = db
        self.logger = logger.getChild(f"EmailIngestor.{workspace_id}")
        self.token_manager = IntegrationTokenManager(db)

    def _resolve_provider(self, provider: str) -> Optional[str]:
        provider = (provider or "auto").lower().strip().replace("_", "")
        if "google" in provider or "gmail" in provider:
            return "google"
        if "microsoft" in provider or "outlook" in provider:
            return "microsoft"

        # Fallback to checking DB for any valid token if "auto" or unknown
        from app.models.integration import IntegrationProvider
        gmail_token = get_valid_token(self.db, self.workspace_id, IntegrationProvider.GOOGLE_GMAIL)
        if gmail_token:
            return "google"
            
        outlook_token = get_valid_token(self.db, self.workspace_id, IntegrationProvider.OUTLOOK)
        if outlook_token:
            return "microsoft"
        return None

    def _get_service(self, provider: str) -> Any:
        """Get an authenticated service instance with auto-refresh wired up."""
        if provider == "google":
            from app.models.integration import IntegrationProvider
            token = get_valid_token(self.db, self.workspace_id, IntegrationProvider.GOOGLE_GMAIL.value)
            if not token:
                return None
            return GmailService(token)

        elif provider == "microsoft":
            from app.models.integration import IntegrationProvider
            token_str = get_valid_token(self.db, self.workspace_id, IntegrationProvider.OUTLOOK.value)
            if not token_str:
                return None
            return OutlookService(token_str)
        return None

    async def fetch_unread(self, provider: str = "auto", max_results: int = 10) -> List[Dict[str, Any]]:
        """Fetch unread messages from the selected provider."""
        capped_results = max(1, min(int(max_results), 100))
        resolved_provider = self._resolve_provider(provider)
        if not resolved_provider:
            return []

        self.logger.info("Fetching unread emails provider=%s max_results=%s", resolved_provider, capped_results)


        try:
            service = self._get_service(resolved_provider)
            if not service:
                return []
            return await service.list_unread_messages(max_results=capped_results)

        except Exception as exc:  # noqa: BLE001
            self.logger.warning("Email ingestion failed provider=%s err=%s", resolved_provider, redact_text(str(exc)))
            return []

    async def fetch_latest(self, provider: str = "auto", max_results: int = 15) -> List[Dict[str, Any]]:
        """Fetch latest messages regardless of read status."""
        capped_results = max(1, min(int(max_results), 50))
        resolved_provider = self._resolve_provider(provider)
        if not resolved_provider:
            return []

        self.logger.info("Fetching latest emails provider=%s max_results=%s", resolved_provider, capped_results)

        try:
            service = self._get_service(resolved_provider)
            if not service:
                return []
            
            if resolved_provider == "google":
                return await service.search_messages(query="label:INBOX", max_results=capped_results)
            elif resolved_provider == "microsoft":
                return await service.search_messages(query="", max_results=capped_results) or await service.list_unread_messages(max_results=capped_results)
            return []

        except Exception as exc:
            self.logger.warning("Email ingestion failed provider=%s err=%s", resolved_provider, redact_text(str(exc)))
            return []

    async def fetch_sent(self, provider: str = "auto", max_results: int = 5) -> List[Dict[str, Any]]:
        """Fetch sent messages from the selected provider for style analysis."""
        capped_results = max(1, min(int(max_results), 20))
        resolved_provider = self._resolve_provider(provider)
        if not resolved_provider:
            return []

        try:
            service = self._get_service(resolved_provider)
            if not service:
                return []
            return await service.list_sent_messages(max_results=capped_results)

        except Exception as exc:  # noqa: BLE001
            self.logger.warning("Fetch sent emails failed provider=%s err=%s", resolved_provider, redact_text(str(exc)))
            return []

    async def search_remote(self, query: str, provider: str = "auto", max_results: int = 10) -> List[NormalizedEmailMessage]:
        """Search messages remotely on provider."""
        resolved_provider = self._resolve_provider(provider)
        if not resolved_provider:
            return []

        raw_messages = []
        try:
            service = self._get_service(resolved_provider)
            if service:
                raw_messages = await service.search_messages(query, max_results=max_results)
        
        except Exception as exc:
             self.logger.warning("Search failed provider=%s err=%s", resolved_provider, redact_text(str(exc)))
             return []

        for raw in raw_messages:
            msg = await self.normalize_message(raw, provider=resolved_provider)
            self._upsert_search_index(msg)
            normalized.append(msg)
        return normalized

    def _upsert_search_index(self, msg: NormalizedEmailMessage):
        """Update fast search index for thread."""
        if not msg.metadata.thread_id: return
        
        try:
            row = self.db.query(EmailIndex).filter(
                EmailIndex.workspace_id == self.workspace_id,
                EmailIndex.thread_id == msg.metadata.thread_id
            ).first()
            
            search_text = (
                f"{msg.metadata.subject or ''} {msg.metadata.sender or ''} "
                f"{msg.content or ''} {msg.metadata.snippet or ''}"
            ).lower()[:10000] # Cap search text
            
            ts = msg.created_at or datetime.utcnow()
            
            if not row:
                 row = EmailIndex(
                     id=str(uuid.uuid4()),
                     workspace_id=self.workspace_id,
                     thread_id=msg.metadata.thread_id,
                     provider=msg.provider,
                     subject=msg.metadata.subject,
                     sender=msg.metadata.sender,
                     last_message_at=ts,
                     snippet=(msg.content or "")[:500],
                     latest_reply_text=(msg.content or "")[:500],
                     searchable_text=search_text,
                     message_count=1
                 )
                 self.db.add(row)
            else:
                 if row.last_message_at is None or ts > row.last_message_at:
                     row.last_message_at = ts
                     row.snippet = (msg.content or "")[:500]
                     row.latest_reply_text = (msg.content or "")[:500]
                     row.searchable_text = search_text
                 row.message_count += 1
            self.db.commit()
        except Exception as e:
            self.logger.warning(f"Failed to update search index for thread {msg.metadata.thread_id}: {e}")
            self.db.rollback()

    async def fetch_full_content(self, message_id: str, provider: str) -> Optional[NormalizedEmailMessage]:
        """Fetch full message content for deep reading."""
        resolved_provider = self._resolve_provider(provider)
        if not resolved_provider:
             return None

        try:
             service = self._get_service(resolved_provider)
             if not service: return None
             
             if resolved_provider == "google":
                  raw = await service.get_message(message_id, format="full")
                  return await self.normalize_message(raw, provider="google")
             elif resolved_provider == "microsoft":
                  raw = await service.get_message(message_id)
                  return await self.normalize_message(raw, provider="microsoft")
        except Exception as exc:
             self.logger.warning("Fetch full content failed id=%s err=%s", message_id, redact_text(str(exc)))
        
        return None

    async def fetch_thread(self, thread_id: str, provider: str):
        """Fetch all messages in a thread for deep reading."""
        resolved = self._resolve_provider(provider)
        if not resolved: return None
        try:
            if resolved == "google":
                from app.models.integration import IntegrationProvider
                token = get_valid_token(self.db, self.workspace_id, IntegrationProvider.GOOGLE_GMAIL.value)
                if not token: return None
                service = GmailService(token)
                thread_data = await service.get_thread(thread_id)
                return thread_data
            elif resolved == "microsoft":
                from app.models.integration import IntegrationProvider
                token_str = get_valid_token(self.db, self.workspace_id, IntegrationProvider.OUTLOOK.value)
                if not token_str: return None
                service = OutlookService(token_str)
                thread_data = await service.get_thread(thread_id)
                return thread_data
        except Exception as e:
            self.logger.error(f"Failed to fetch thread {thread_id}: {e}")
        return None


    async def normalize_message(self, raw_msg: Dict[str, Any], provider: str) -> NormalizedEmailMessage:
        """Convert provider-specific payload into stable internal shape."""
        created_at: Optional[datetime] = None
        raw_created = raw_msg.get("received_at") or raw_msg.get("receivedDateTime")
        
        if isinstance(raw_created, datetime):
            created_at = raw_created
        elif isinstance(raw_created, str) and raw_created.strip():
            try:
                # Try standard email date format first (e.g., 'Thu, 24 Oct 2024 16:34:25 -0700')
                import email.utils
                from email.utils import parsedate_to_datetime
                parsed = parsedate_to_datetime(raw_created)
                created_at = parsed
            except (ValueError, TypeError):
                try:
                    # Fallback to ISO format
                    created_at = datetime.fromisoformat(raw_created.replace("Z", "+00:00"))
                except (ValueError, TypeError):
                    created_at = None

        # Content extraction
        snippet = str(raw_msg.get("snippet") or raw_msg.get("bodyPreview") or "")
        content = snippet
        
        # If we have full body, use it to get the latest reply
        body_text = None
        if provider == "google":
            payload = raw_msg.get("payload", {})
            def _get_body_part(parts_list):
                for part in parts_list:
                    mime_type = part.get("mimeType")
                    if mime_type == "text/plain":
                        data = part.get("body", {}).get("data")
                        if data:
                            import base64
                            return base64.urlsafe_b64decode(data).decode('utf-8', errors='replace')
                    if "parts" in part:
                         res = _get_body_part(part["parts"])
                         if res: return res
                return None
            
            body_text = _get_body_part(payload.get("parts", []))
            if not body_text and payload.get("body", {}).get("data"):
                 import base64
                 body_text = base64.urlsafe_b64decode(payload["body"]["data"]).decode('utf-8', errors='replace')

        elif provider == "microsoft":
            body = raw_msg.get("body", {})
            if isinstance(body, dict):
                body_content = body.get("content", "")
                if body.get("contentType") == "html":
                    from app.services.email.parsing.html_cleaner import clean_html_to_text
                    body_text = clean_html_to_text(body_content)
                else:
                    body_text = body_content

        if body_text:
            from app.services.email.parsing.reply_parser import parse_email_body
            content = parse_email_body(body_text) or snippet

        headers = raw_msg.get("headers", {})

        # Attachment Extraction & Metadata Indexing
        attachments: List[AttachmentMetadata] = []
        has_attachments = False
        
        if provider == "google":
            payload = raw_msg.get("payload", {})
            def _extract_attachments(parts_list):
                for part in parts_list:
                    filename = part.get("filename")
                    attachment_id = part.get("body", {}).get("attachmentId")
                    if filename and attachment_id:
                        attachments.append(AttachmentMetadata(
                            id=attachment_id,
                            filename=filename,
                            mime_type=part.get("mimeType", "application/octet-stream"),
                            size=part.get("body", {}).get("size", 0)
                        ))
                    if "parts" in part:
                        _extract_attachments(part["parts"])

            _extract_attachments(payload.get("parts", []))
            has_attachments = len(attachments) > 0

        elif provider == "microsoft":
            has_attachments = bool(raw_msg.get("has_attachments", raw_msg.get("hasAttachments", False)))
            if has_attachments:
                # We might need to fetch them if they aren't in the payload
                raw_atts = raw_msg.get("attachments")
                if not raw_atts:
                    # Lazy fetch or assume they are already there if we used a specific select?
                    # Graph API usually requires a separate call or $expand=attachments
                    # For now, if not present, we just mark as has_attachments=True
                    # and the sync job might have fetched them.
                    pass
                else:
                    for att in raw_atts:
                        attachments.append(AttachmentMetadata(
                            id=att.get("id"),
                            filename=att.get("name", "unnamed"),
                            mime_type=att.get("contentType", "application/octet-stream"),
                            size=att.get("size", 0)
                        ))

        # Append attachment names to searchable content for indexing
        if attachments:
            attachment_names = [a.filename for a in attachments]
            content += f"\n[Attachments: {', '.join(attachment_names)}]"
            
            # Deep Indexing (Enterprise Feature): OCR/Text Extraction for Search
            # We only do this for "relevant" files to save costs/time
            for att in attachments:
                if any(kw in att.filename.lower() for kw in ["invoice", "contract", "agreement", "resume", "pdf"]):
                    try:
                        # We only fetch if it's small (<2MB) for indexing
                        if att.size < 2 * 1024 * 1024:
                            # We need the connector here to fetch data
                            # For simplicity in this sprint, we'll assume the caller wants deep index
                            # and provided the connector/service. 
                            # If not, we'll skip but log the potential.
                            from app.services.extraction.file_extractor import FileExtractorService
                            # Note: This requires getting raw bytes, which we'll skip for now
                            # in basic unread fetch to keep it FAST. 
                            # But we'll add the hook.
                            pass
                    except Exception as e:
                        self.logger.warning(f"Failed deep index for {att.filename}: {e}")

        normalized = NormalizedEmailMessage(
            id=str(raw_msg.get("id") or "").strip() or "unknown",
            workspace_id=self.workspace_id,
            provider=provider,
            metadata=EmailMetadata(
                sender=normalize_sender(str(raw_msg.get("sender") or "").strip() or None),
                subject=(str(raw_msg.get("subject") or "").strip() or None),
                thread_id=(str(raw_msg.get("thread_id") or raw_msg.get("conversationId") or "").strip() or None),
                headers=headers,
                attachments=attachments,
            ),
            content=content,
            created_at=normalize_timestamp(created_at),
            is_read=bool(raw_msg.get("is_read", raw_msg.get("isRead", False))),
            has_attachments=has_attachments,
        )
        return normalized

    async def fetch_and_normalize(self, provider: str = "auto", max_results: int = 10) -> List[NormalizedEmailMessage]:
        raw_messages = await self.fetch_latest(provider=provider, max_results=max_results)
        resolved_provider = self._resolve_provider(provider) or "unknown"
        normalized: List[NormalizedEmailMessage] = []
        for raw in raw_messages:
            msg = await self.normalize_message(raw, provider=resolved_provider)
            self._upsert_search_index(msg)
            normalized.append(msg)
        return normalized

    async def fetch_incremental(self, provider: str = "auto") -> Tuple[List[NormalizedEmailMessage], List[str]]:
        """Incremental sync for Gmail/Outlook. Returns (new_messages, deleted_ids)."""
        resolved_provider = self._resolve_provider(provider)
        if not resolved_provider:
            return [], []

        self.logger.info("Incremental sync provider=%s", resolved_provider)
        
        provider_enum = IntegrationProvider.GOOGLE_GMAIL if resolved_provider == "google" else IntegrationProvider.OUTLOOK
        config = self.token_manager.get_config(self.workspace_id, provider_enum)
        
        try:
            if resolved_provider == "google":
                token = get_valid_token(self.db, self.workspace_id, IntegrationProvider.GOOGLE_GMAIL)
                if not token: return [], []
                service = GmailService(token)
                
                last_history_id = config.get("last_history_id")
                if not last_history_id:
                    # Initial sync marker setup
                    profile = await service.get_profile()
                    IntegrationTokenManager(self.db).update_config(self.workspace_id, provider_enum, {"last_history_id": profile.get("historyId")})
                    
                    # ZERO-INBOX DAY 1: Fetch 5 sent emails for Style DNA silently
                    sent_raw = await self.fetch_sent(provider="google", max_results=5)
                    from app.services.brain.memory import DualStateMemory
                    memory = DualStateMemory(self.db, self.workspace_id)
                    for raw in sent_raw:
                        msg = await self.normalize_message(raw, provider="google")
                        memory.extract_and_learn_from_email(
                            sender=msg.metadata.sender or "",
                            subject=msg.metadata.subject or "",
                            body=msg.content or "",
                            email_id=msg.id,
                        )
                    return [], []
                
                history_resp = await service.list_history(last_history_id)
                if history_resp.get("expired"):
                    profile = await service.get_profile()
                    IntegrationTokenManager(self.db).update_config(self.workspace_id, provider_enum, {"last_history_id": profile.get("historyId")})
                    history_fetch = await self.fetch_and_normalize(provider="google", max_results=20)
                    return history_fetch, []
                
                new_message_ids = set()
                deleted_ids = set()
                for record in history_resp.get("history", []):
                    for added in record.get("messagesAdded", []):
                        new_message_ids.add(added["message"]["id"])
                    for deleted in record.get("messagesDeleted", []):
                        deleted_ids.add(deleted["message"]["id"])
                    for labeled in record.get("labelsAdded", []):
                        if "TRASH" in labeled.get("labelIds", []):
                            deleted_ids.add(labeled["message"]["id"])
                
                IntegrationTokenManager(self.db).update_config(self.workspace_id, provider_enum, {"last_history_id": history_resp.get("historyId")})
                
                normalized = []
                for msg_id in new_message_ids:
                    raw = await service.get_message(msg_id, format="full")
                    msg = await self.normalize_message(raw, provider="google")
                    self._upsert_search_index(msg)
                    normalized.append(msg)
                return normalized, list(deleted_ids)

            else: # microsoft
                token_str = get_valid_token(self.db, self.workspace_id, IntegrationProvider.OUTLOOK)
                if not token_str: return [], []
                service = OutlookService(token_str)
                
                delta_link = config.get("delta_link")
                
                if not delta_link:
                    # Initial sync logic
                    delta_resp = await service.list_delta()
                    IntegrationTokenManager(self.db).update_config(self.workspace_id, provider_enum, {
                        "delta_link": delta_resp.get("@odata.deltaLink"),
                    })
                    
                    # ZERO-INBOX DAY 1: Fetch 5 sent emails for Style DNA silently
                    sent_raw = await self.fetch_sent(provider="microsoft", max_results=5)
                    from app.services.brain.memory import DualStateMemory
                    memory = DualStateMemory(self.db, self.workspace_id)
                    for raw in sent_raw:
                        msg = await self.normalize_message(raw, provider="microsoft")
                        memory.extract_and_learn_from_email(
                            sender=msg.metadata.sender or "",
                            subject=msg.metadata.subject or "",
                            body=msg.content or "",
                            email_id=msg.id,
                        )
                    return [], []
                else:
                    delta_resp = await service.list_delta(delta_link)
                    IntegrationTokenManager(self.db).update_config(self.workspace_id, provider_enum, {
                        "delta_link": delta_resp.get("@odata.deltaLink"),
                    })
                
                items = delta_resp.get("value", [])
                normalized = []
                deleted_ids = []
                for item in items:
                    if "@removed" in item:
                        deleted_ids.append(item.get("id"))
                        continue
                    msg = await self.normalize_message(item, provider="microsoft")
                    self._upsert_search_index(msg)
                    normalized.append(msg)
                return normalized, deleted_ids

        except Exception as exc:
            self.logger.warning("Incremental sync failed provider=%s err=%s", resolved_provider, redact_text(str(exc)))
            return [], []
