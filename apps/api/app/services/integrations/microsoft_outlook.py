"""
Microsoft Outlook (Graph) Service
Minimal wrapper for listing unread mail and basic actions.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Callable
import logging

from app.services.brain.guardrails import redact_text
from app.services.integrations.safe_requester import SafeRequester

logger = logging.getLogger(__name__)


class OutlookService:
    def __init__(self, access_token: str, token_refresher: Optional[Callable[[], Optional[str]]] = None, on_auth_failure: Optional[Callable[[], None]] = None):
        if not access_token:
            raise ValueError("Missing access token")
        self.access_token = access_token
        self.token_refresher = token_refresher
        self.on_auth_failure = on_auth_failure
        self.http = SafeRequester()

    def _execute(self, method: str, url: str, **kwargs) -> Any:
        """Execute request with 401 retry logic."""
        # Ensure Authorization header is set
        headers = kwargs.get("headers", {})
        if "Authorization" not in headers:
            headers["Authorization"] = f"Bearer {self.access_token}"
        kwargs["headers"] = headers

        resp = self.http.request(method, url, **kwargs)
        
        # 1. Check for 401
        if resp.status_code == 401:
            logger.warning("Outlook API 401. Attempting refresh...")
            if self.token_refresher:
                new_token = self.token_refresher()
                if new_token:
                    self.access_token = new_token
                    headers["Authorization"] = f"Bearer {self.access_token}"
                    kwargs["headers"] = headers
                    # Retry
                    resp = self.http.request(method, url, **kwargs)
            
            # If still 401
            if resp.status_code == 401:
                logger.error("Outlook API 401 Persistence. Token revoked.")
                if self.on_auth_failure:
                    self.on_auth_failure()
                resp.raise_for_status()

        if not resp.ok:
            logger.error(f"Outlook API {method} error {resp.status_code}: {redact_text(resp.text)}")
            resp.raise_for_status()
            
        return resp.json() if resp.content else {}

    def list_unread_messages(self, max_results: int = 10) -> List[Dict[str, Any]]:
        """
        Fetch unread messages from Inbox and normalize to a small, stable schema.
        """
        url = "https://graph.microsoft.com/v1.0/me/mailFolders/Inbox/messages"
        params = {
            "$top": str(max_results),
            "$orderby": "receivedDateTime desc",
            "$filter": "isRead eq false",
            "$select": "id,conversationId,subject,from,receivedDateTime,bodyPreview,isRead,body,internetMessageHeaders,hasAttachments",
        }
        data = self._execute("GET", url, params=params, timeout=20)
        
        items = data.get("value") or []
        results: List[Dict[str, Any]] = []
        for item in items:
            frm = ((item.get("from") or {}).get("emailAddress") or {}) if isinstance(item, dict) else {}
            sender = frm.get("address")
            
            headers = {
                (h.get("name") or "").lower(): (h.get("value") or "")
                for h in item.get("internetMessageHeaders", [])
            }

            results.append(
                {
                    "id": item.get("id"),
                    "thread_id": item.get("conversationId"),
                    "sender": sender,
                    "subject": item.get("subject"),
                    "snippet": item.get("bodyPreview") or "",
                    "received_at": item.get("receivedDateTime"),
                    "is_read": bool(item.get("isRead")),
                    "body": item.get("body"),
                    "headers": headers,
                }
            )
        return results

    def search_messages(self, query: str, max_results: int = 10) -> List[Dict[str, Any]]:
        """Search messages using KQL keywords via $search"""
        if not query:
            return []

        url = "https://graph.microsoft.com/v1.0/me/messages"
        params = {
            "$top": str(max_results),
            "$search": f'"{query}"',
            "$select": "id,conversationId,subject,from,receivedDateTime,bodyPreview,isRead,body,internetMessageHeaders,hasAttachments",
        }
        
        # Note: $search returns best match, orderby is tricky with search.
        try:
            data = self._execute("GET", url, params=params, timeout=20)
        except Exception:
            # Fallback or tolerate?
            return []

        items = data.get("value") or []
        results: List[Dict[str, Any]] = []
        for item in items:
            frm = ((item.get("from") or {}).get("emailAddress") or {}) if isinstance(item, dict) else {}
            sender = frm.get("address")
            
            headers = {
                (h.get("name") or "").lower(): (h.get("value") or "")
                for h in item.get("internetMessageHeaders", [])
            }

            results.append(
                {
                    "id": item.get("id"),
                    "thread_id": item.get("conversationId"),
                    "sender": sender,
                    "subject": item.get("subject"),
                    "snippet": item.get("bodyPreview") or "",
                    "received_at": item.get("receivedDateTime"),
                    "is_read": bool(item.get("isRead")), 
                    "has_attachments": bool(item.get("hasAttachments")),
                    "body": item.get("body"),
                    "headers": headers,
                }
            )
        return results

    def list_delta(self, delta_link: Optional[str] = None) -> Dict[str, Any]:
        """Fetch changes using delta query."""
        url = delta_link or "https://graph.microsoft.com/v1.0/me/mailFolders/Inbox/messages/delta"
        params = {
            "$select": "id,conversationId,subject,from,receivedDateTime,bodyPreview,isRead,body,hasAttachments",
        }
        # params are ignored if delta_link is provided as it has them encoded
        
        return self._execute(
            "GET",
            url,
            params=params if not delta_link else None,
            timeout=20,
        )

    def list_sent_messages(self, max_results: int = 5) -> List[Dict[str, Any]]:
        """Fetch recent sent messages for style analysis."""
        url = "https://graph.microsoft.com/v1.0/me/mailFolders/SentItems/messages"
        params = {
            "$top": str(max_results),
            "$orderby": "sentDateTime desc",
            "$select": "id,conversationId,subject,toRecipients,sentDateTime,bodyPreview",
        }
        try:
            data = self._execute("GET", url, params=params, timeout=20)
        except Exception:
            return []

        items = data.get("value") or []
        results: List[Dict[str, Any]] = []
        for item in items:
            recipients = [
                ((r.get("emailAddress") or {}).get("address"))
                for r in (item.get("toRecipients") or [])
            ]
            
            results.append(
                {
                    "id": item.get("id"),
                    "thread_id": item.get("conversationId"),
                    "recipient": ", ".join(filter(None, recipients)),
                    "subject": item.get("subject"),
                    "snippet": item.get("bodyPreview") or "",
                    "date": item.get("sentDateTime"),
                }
            )
        return results

    def get_message(self, message_id: str) -> Dict[str, Any]:
        url = f"https://graph.microsoft.com/v1.0/me/messages/{message_id}"
        params = {
            "$select": "id,conversationId,subject,from,receivedDateTime,bodyPreview,isRead,categories,body,internetMessageHeaders",
        }
        item = self._execute("GET", url, params=params, timeout=20)
        
        sender = (((item.get("from") or {}).get("emailAddress") or {}).get("address")) if isinstance(item, dict) else None
        
        headers = {
            (h.get("name") or "").lower(): (h.get("value") or "")
            for h in item.get("internetMessageHeaders", [])
        }

        return {
            "id": item.get("id"),
            "thread_id": item.get("conversationId"),
            "sender": sender,
            "subject": item.get("subject"),
            "snippet": item.get("bodyPreview") or "",
            "received_at": item.get("receivedDateTime"),
            "is_read": bool(item.get("isRead")),
            "labelIds": [str(category) for category in (item.get("categories") or [])],
            "body": item.get("body"),
            "headers": headers,
        }

    def get_thread(self, thread_id: str) -> Dict[str, Any]:
        """Fetch all messages in a conversation/thread."""
        url = "https://graph.microsoft.com/v1.0/me/messages"
        params = {
            "$filter": f"conversationId eq '{thread_id}'",
            "$select": "id,conversationId,subject,from,receivedDateTime,bodyPreview,body",
            "$orderby": "receivedDateTime asc"
        }
        
        data = self._execute("GET", url, params=params, timeout=20)
        items = data.get("value") or []
        
        messages = []
        for item in items:
            frm = ((item.get("from") or {}).get("emailAddress") or {})
            messages.append({
                "id": item.get("id"),
                "sender": frm.get("address"),
                "subject": item.get("subject"),
                "snippet": item.get("bodyPreview"),
                "received_at": item.get("receivedDateTime"),
                "body": (item.get("body") or {}).get("content") or item.get("bodyPreview")
            })
            
        return {
            "id": thread_id,
            "messages": messages
        }

    def apply_label(self, message_id: str, label_name: str) -> Dict[str, Any]:
        normalized = str(label_name or "").strip()
        if not normalized:
            raise ValueError("label_name is required")

        current = self.get_message(message_id)
        categories = [str(value) for value in (current.get("labelIds") or [])]
        if normalized in categories:
            return {"status": "already_applied", "name": normalized, "id": normalized}

        categories.append(normalized)
        patch_url = f"https://graph.microsoft.com/v1.0/me/messages/{message_id}"
        self._execute("PATCH", patch_url, json={"categories": categories}, timeout=20)
        
        return {"status": "applied", "name": normalized, "id": normalized, "label_ids": categories}

    def remove_label(self, message_id: str, label_name: str, label_id: Optional[str] = None) -> Dict[str, Any]:
        normalized = str(label_name or "").strip()
        resolved = str(label_id or "").strip() or normalized
        current = self.get_message(message_id)
        categories = [str(value) for value in (current.get("labelIds") or [])]
        if resolved not in categories and normalized not in categories:
            return {"status": "not_found", "name": normalized}

        next_categories = [value for value in categories if value not in {resolved, normalized}]
        patch_url = f"https://graph.microsoft.com/v1.0/me/messages/{message_id}"
        self._execute("PATCH", patch_url, json={"categories": next_categories}, timeout=20)
        
        return {"status": "removed", "name": normalized, "id": resolved, "label_ids": next_categories}

    def move_to_inbox(self, message_id: str) -> Dict[str, Any]:
        url = f"https://graph.microsoft.com/v1.0/me/messages/{message_id}/move"
        data = self._execute("POST", url, json={"destinationId": "inbox"}, timeout=20)
        return {"status": "moved_to_inbox", "id": data.get("id")}

    def archive_message(self, message_id: str) -> Dict[str, Any]:
        url = f"https://graph.microsoft.com/v1.0/me/messages/{message_id}/move"
        data = self._execute("POST", url, json={"destinationId": "archive"}, timeout=20)
        return {"status": "archived", "id": data.get("id")}

    def delete_draft(self, draft_id: str) -> Dict[str, Any]:
        url = f"https://graph.microsoft.com/v1.0/me/messages/{draft_id}"
        self._execute("DELETE", url, timeout=20)
        return {"status": "deleted", "draft_id": draft_id}

    def create_draft(self, recipient: str, subject: str, body: str) -> Dict[str, Any]:
        """Create an Outlook draft message."""
        url = "https://graph.microsoft.com/v1.0/me/messages"
        payload = {
            "subject": subject,
            "body": {"contentType": "Text", "content": body},
            "toRecipients": [{"emailAddress": {"address": recipient}}],
        }
        data = self._execute("POST", url, json=payload, timeout=20)
        return {
            "id": data.get("id"),
            "conversation_id": data.get("conversationId"),
            "is_draft": bool(data.get("isDraft", True)),
        }

    def send_message(self, recipient: str, subject: str, body: str, thread_id: Optional[str] = None, reply_to_id: Optional[str] = None) -> Dict[str, Any]:
        """Send an Outlook email with threading headers."""
        url = "https://graph.microsoft.com/v1.0/me/sendMail"
        
        msg_payload: Dict[str, Any] = {
            "subject": subject,
            "body": {"contentType": "Text", "content": body},
            "toRecipients": [{"emailAddress": {"address": recipient}}],
        }

        # Handle threading via headers
        headers = []
        if reply_to_id:
            headers.append({"name": "In-Reply-To", "value": reply_to_id})
            headers.append({"name": "References", "value": reply_to_id})
        
        if headers:
            msg_payload["internetMessageHeaders"] = headers

        payload = {
            "message": msg_payload,
            "saveToSentItems": True,
        }
        
        self._execute("POST", url, json=payload, timeout=20)
        return {"status": "sent"}

    def get_attachments(self, message_id: str) -> List[Dict[str, Any]]:
        """Fetch attachments for a specific message."""
        url = f"https://graph.microsoft.com/v1.0/me/messages/{message_id}/attachments"
        try:
            data = self._execute("GET", url, timeout=10)
            return data.get("value", [])
        except Exception as e:
            logger.error(f"Outlook attachment error: {e}")
            return []
