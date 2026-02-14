"""
Microsoft Outlook (Graph) Service
Minimal wrapper for listing unread mail and basic actions.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional
import logging

from app.services.brain.guardrails import redact_text
from app.services.integrations.safe_requester import SafeRequester

logger = logging.getLogger(__name__)


class OutlookService:
    def __init__(self, access_token: str):
        if not access_token:
            raise ValueError("Missing access token")
        self.access_token = access_token
        self.http = SafeRequester()

    def list_unread_messages(self, max_results: int = 10) -> List[Dict[str, Any]]:
        """
        Fetch unread messages from Inbox and normalize to a small, stable schema.
        """
        url = "https://graph.microsoft.com/v1.0/me/mailFolders/Inbox/messages"
        params = {
            "$top": str(max_results),
            "$orderby": "receivedDateTime desc",
            "$filter": "isRead eq false",
            "$select": "id,conversationId,subject,from,receivedDateTime,bodyPreview,isRead",
        }
        resp = self.http.get(
            url,
            headers={"Authorization": f"Bearer {self.access_token}"},
            params=params,
            timeout=20,
        )
        if not resp.ok:
            logger.error("Outlook API error %s: %s", resp.status_code, redact_text(resp.text))
            resp.raise_for_status()

        data = resp.json()
        items = data.get("value") or []
        results: List[Dict[str, Any]] = []
        for item in items:
            frm = ((item.get("from") or {}).get("emailAddress") or {}) if isinstance(item, dict) else {}
            sender = frm.get("address")
            results.append(
                {
                    "id": item.get("id"),
                    "thread_id": item.get("conversationId"),
                    "sender": sender,
                    "subject": item.get("subject"),
                    "snippet": item.get("bodyPreview") or "",
                    "received_at": item.get("receivedDateTime"),
                    "is_read": bool(item.get("isRead")),
                }
            )
        return results

    def list_sent_messages(self, max_results: int = 5) -> List[Dict[str, Any]]:
        """Fetch recent sent messages for style analysis."""
        url = "https://graph.microsoft.com/v1.0/me/mailFolders/SentItems/messages"
        params = {
            "$top": str(max_results),
            "$orderby": "sentDateTime desc",
            "$select": "id,conversationId,subject,toRecipients,sentDateTime,bodyPreview",
        }
        resp = self.http.get(
            url,
            headers={"Authorization": f"Bearer {self.access_token}"},
            params=params,
            timeout=20,
        )
        if not resp.ok:
            logger.error("Outlook API error (Sent) %s: %s", resp.status_code, redact_text(resp.text))
            return []

        data = resp.json()
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
            "$select": "id,conversationId,subject,from,receivedDateTime,bodyPreview,isRead,categories",
        }
        resp = self.http.get(
            url,
            headers={"Authorization": f"Bearer {self.access_token}"},
            params=params,
            timeout=20,
        )
        if not resp.ok:
            logger.error("Outlook get_message error %s: %s", resp.status_code, redact_text(resp.text))
            resp.raise_for_status()
        item = resp.json()
        sender = (((item.get("from") or {}).get("emailAddress") or {}).get("address")) if isinstance(item, dict) else None
        return {
            "id": item.get("id"),
            "thread_id": item.get("conversationId"),
            "sender": sender,
            "subject": item.get("subject"),
            "snippet": item.get("bodyPreview") or "",
            "received_at": item.get("receivedDateTime"),
            "is_read": bool(item.get("isRead")),
            "labelIds": [str(category) for category in (item.get("categories") or [])],
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
        resp = self.http.patch(
            patch_url,
            headers={
                "Authorization": f"Bearer {self.access_token}",
                "Content-Type": "application/json",
            },
            json={"categories": categories},
            timeout=20,
        )
        if not resp.ok:
            logger.error("Outlook apply_label error %s: %s", resp.status_code, redact_text(resp.text))
            resp.raise_for_status()
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
        resp = self.http.patch(
            patch_url,
            headers={
                "Authorization": f"Bearer {self.access_token}",
                "Content-Type": "application/json",
            },
            json={"categories": next_categories},
            timeout=20,
        )
        if not resp.ok:
            logger.error("Outlook remove_label error %s: %s", resp.status_code, redact_text(resp.text))
            resp.raise_for_status()
        return {"status": "removed", "name": normalized, "id": resolved, "label_ids": next_categories}

    def move_to_inbox(self, message_id: str) -> Dict[str, Any]:
        url = f"https://graph.microsoft.com/v1.0/me/messages/{message_id}/move"
        resp = self.http.post(
            url,
            headers={
                "Authorization": f"Bearer {self.access_token}",
                "Content-Type": "application/json",
            },
            json={"destinationId": "inbox"},
            timeout=20,
        )
        if not resp.ok:
            logger.error("Outlook move_to_inbox error %s: %s", resp.status_code, redact_text(resp.text))
            resp.raise_for_status()
        data = resp.json()
        return {"status": "moved_to_inbox", "id": data.get("id")}

    def archive_message(self, message_id: str) -> Dict[str, Any]:
        url = f"https://graph.microsoft.com/v1.0/me/messages/{message_id}/move"
        resp = self.http.post(
            url,
            headers={
                "Authorization": f"Bearer {self.access_token}",
                "Content-Type": "application/json",
            },
            json={"destinationId": "archive"},
            timeout=20,
        )
        if not resp.ok:
            logger.error("Outlook archive_message error %s: %s", resp.status_code, redact_text(resp.text))
            resp.raise_for_status()
        data = resp.json()
        return {"status": "archived", "id": data.get("id")}

    def delete_draft(self, draft_id: str) -> Dict[str, Any]:
        url = f"https://graph.microsoft.com/v1.0/me/messages/{draft_id}"
        resp = self.http.delete(
            url,
            headers={"Authorization": f"Bearer {self.access_token}"},
            timeout=20,
        )
        if not resp.ok:
            logger.error("Outlook delete_draft error %s: %s", resp.status_code, redact_text(resp.text))
            resp.raise_for_status()
        return {"status": "deleted", "draft_id": draft_id}

    def create_draft(self, recipient: str, subject: str, body: str) -> Dict[str, Any]:
        """Create an Outlook draft message."""
        url = "https://graph.microsoft.com/v1.0/me/messages"
        payload = {
            "subject": subject,
            "body": {"contentType": "Text", "content": body},
            "toRecipients": [{"emailAddress": {"address": recipient}}],
        }
        resp = self.http.post(
            url,
            headers={
                "Authorization": f"Bearer {self.access_token}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=20,
        )
        if not resp.ok:
            logger.error("Outlook draft error %s: %s", resp.status_code, redact_text(resp.text))
            resp.raise_for_status()
        data = resp.json()
        return {
            "id": data.get("id"),
            "conversation_id": data.get("conversationId"),
            "is_draft": bool(data.get("isDraft", True)),
        }

    def send_message(self, recipient: str, subject: str, body: str) -> Dict[str, Any]:
        """Send an Outlook email."""
        url = "https://graph.microsoft.com/v1.0/me/sendMail"
        payload = {
            "message": {
                "subject": subject,
                "body": {"contentType": "Text", "content": body},
                "toRecipients": [{"emailAddress": {"address": recipient}}],
            },
            "saveToSentItems": True,
        }
        resp = self.http.post(
            url,
            headers={
                "Authorization": f"Bearer {self.access_token}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=20,
        )
        if not resp.ok:
            logger.error("Outlook send error %s: %s", resp.status_code, redact_text(resp.text))
            resp.raise_for_status()
        return {"status": "sent"}
