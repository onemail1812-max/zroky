"""
Google Gmail Service
Wrapper around Google API Client for Email Operations.
"""

from typing import List, Dict, Any, Optional, Callable
import time
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from google.auth.exceptions import RefreshError
import logging
from email.utils import parsedate_to_datetime
from email.mime.text import MIMEText
import base64

from app.config import settings
from app.services.brain.guardrails import redact_text

logger = logging.getLogger(__name__)

class GmailService:
    def __init__(self, token: Dict[str, Any], on_auth_failure: Optional[Callable[[], None]] = None):
        if not settings.google_client_id or not settings.google_client_secret:
            raise ValueError("Google OAuth settings missing (GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET)")

        self.on_auth_failure = on_auth_failure
        self.creds = Credentials(
            token=token["access_token"],
            refresh_token=token.get("refresh_token"),
            token_uri="https://oauth2.googleapis.com/token",
            client_id=settings.google_client_id,
            client_secret=settings.google_client_secret,
            scopes=token.get("scope").split(" ") if isinstance(token.get("scope"), str) else None,
        )
        self.service = build('gmail', 'v1', credentials=self.creds)

    def _retry_execute(self, request, retries: int = 5):
        """Execute a Google API request with retries for transient errors."""
        try:
            for i in range(retries):
                try:
                    return request.execute()
                except HttpError as e:
                    if e.resp.status == 401:
                        logger.error("Gmail API 401 Unauthorized - Token expired/revoked.")
                        if self.on_auth_failure:
                            self.on_auth_failure()
                        raise e
                    
                    if e.resp.status in {429, 500, 502, 503, 504} and i < retries - 1:
                        wait = (2 ** i) * 0.5
                        logger.warning(f"Gmail API {e.resp.status} error, retrying in {wait}s...")
                        time.sleep(wait)
                        continue
                    raise e
        except RefreshError as e:
            logger.error(f"Gmail Token Refresh Failed: {e}")
            if self.on_auth_failure:
                self.on_auth_failure()
            raise e
        return request.execute()

    def get_profile(self) -> Dict[str, Any]:
        """Get user profile, including current historyId."""
        return self._retry_execute(self.service.users().getProfile(userId="me"))

    def list_history(self, start_history_id: str, max_results: int = 50) -> Dict[str, Any]:
        """List history record from a given historyId."""
        try:
            return self._retry_execute(self.service.users().history().list(
                userId='me',
                startHistoryId=start_history_id,
                maxResults=max_results
            ))
        except HttpError as e:
            if e.resp.status == 404: # History expired
                logger.warning(f"Gmail History {start_history_id} expired.")
                return {"expired": True}
            raise e

    def _label_map(self) -> Dict[str, str]:
        labels = self._retry_execute(self.service.users().labels().list(userId="me")).get("labels") or []
        out: Dict[str, str] = {}
        for label in labels:
            name = str(label.get("name") or "").strip()
            label_id = str(label.get("id") or "").strip()
            if name and label_id:
                out[name] = label_id
        return out

    def _find_label_id(self, label_name: str) -> Optional[str]:
        normalized = str(label_name or "").strip()
        if not normalized:
            return None
        return self._label_map().get(normalized)

    def _ensure_user_label(self, label_name: str) -> str:
        normalized = str(label_name or "").strip()
        if not normalized:
            raise ValueError("label_name is required")

        existing_id = self._find_label_id(normalized)
        if existing_id:
            return existing_id

        created = self._retry_execute(self.service.users().labels().create(
            userId="me",
            body={
                "name": normalized,
                "labelListVisibility": "labelShow",
                "messageListVisibility": "show",
            },
        ))
        label_id = str(created.get("id") or "").strip()
        if not label_id:
            raise RuntimeError("Failed to create Gmail label")
        return label_id

    def list_unread_messages(self, max_results: int = 10) -> List[Dict[str, Any]]:
        """Fetch unread messages and normalize to a small, stable schema."""
        try:
            results = self._retry_execute(self.service.users().messages().list(
                userId='me', 
                q='is:unread', 
                maxResults=max_results
            ))
            
            messages = results.get('messages', [])
            full_messages = []
            
            for msg in messages:
                # Fetch full details
                txt = self.get_message(msg['id'], format='full')

                headers = {
                    (h.get("name") or "").lower(): (h.get("value") or "")
                    for h in (txt.get("payload", {}) or {}).get("headers", []) or []
                    if isinstance(h, dict)
                }

                received_at = headers.get("date") or ""
                try:
                    received_at_iso = parsedate_to_datetime(received_at).isoformat() if received_at else None
                except Exception:
                    received_at_iso = None

                label_ids = txt.get("labelIds") or []
                is_read = "UNREAD" not in label_ids

                full_messages.append(
                    {
                        "id": txt.get("id"),
                        "thread_id": txt.get("threadId"),
                        "history_id": txt.get("historyId"),
                        "sender": headers.get("from") or None,
                        "subject": headers.get("subject") or None,
                        "snippet": txt.get("snippet") or "",
                        "received_at": received_at_iso,
                        "is_read": is_read,
                        "payload": txt.get("payload"),
                        "headers": headers,
                    }
                )
                
            return full_messages
        except Exception as e:
            logger.error("Gmail API Error: %s", redact_text(str(e)))
            return []

    def search_messages(self, query: str, max_results: int = 10) -> List[Dict[str, Any]]:
        """Search messages using Gmail query syntax."""
        try:
            results = self._retry_execute(self.service.users().messages().list(
                userId='me', 
                q=query, 
                maxResults=max_results
            ))
            
            messages = results.get('messages', [])
            full_messages = []
            
            for msg in messages:
                # Fetch full details
                txt = self.get_message(msg['id'], format='full')

                headers = {
                    (h.get("name") or "").lower(): (h.get("value") or "")
                    for h in (txt.get("payload", {}) or {}).get("headers", []) or []
                    if isinstance(h, dict)
                }

                received_at = headers.get("date") or ""
                try:
                    received_at_iso = parsedate_to_datetime(received_at).isoformat() if received_at else None
                except Exception:
                    received_at_iso = None

                label_ids = txt.get("labelIds") or []
                is_read = "UNREAD" not in label_ids

                full_messages.append(
                    {
                        "id": txt.get("id"),
                        "thread_id": txt.get("threadId"),
                        "history_id": txt.get("historyId"),
                        "sender": headers.get("from") or None,
                        "subject": headers.get("subject") or None,
                        "snippet": txt.get("snippet") or "",
                        "received_at": received_at_iso,
                        "is_read": is_read,
                        "payload": txt.get("payload"),
                        "headers": headers,
                    }
                )
                
            return full_messages
        except Exception as e:
            logger.error("Gmail Search Error: %s", redact_text(str(e)))
            return []

    def list_sent_messages(self, max_results: int = 5) -> List[Dict[str, Any]]:
        """Fetch recent sent messages for style analysis."""
        try:
            results = self._retry_execute(self.service.users().messages().list(
                userId='me', 
                q='label:SENT', 
                maxResults=max_results
            ))
            
            messages = results.get('messages', [])
            full_messages = []
            
            for msg in messages:
                # Fetch full details
                txt = self._retry_execute(self.service.users().messages().get(
                    userId='me', 
                    id=msg['id'], 
                    format='metadata',
                    metadataHeaders=['To', 'Subject', 'Date']
                ))

                headers = {
                    (h.get("name") or "").lower(): (h.get("value") or "")
                    for h in (txt.get("payload", {}) or {}).get("headers", []) or []
                    if isinstance(h, dict)
                }

                # Get snippet for style
                snippet = txt.get("snippet") or ""

                full_messages.append(
                    {
                        "id": txt.get("id"),
                        "thread_id": txt.get("threadId"),
                        "recipient": headers.get("to") or None,
                        "subject": headers.get("subject") or None,
                        "snippet": snippet,
                        "date": headers.get("date")
                    }
                )
                
            return full_messages
        except Exception as e:
            logger.error("Gmail API Error (Sent): %s", redact_text(str(e)))
            return []

    def get_message(self, message_id: str, format: str = "metadata") -> Dict[str, Any]:
        params = {
            "userId": "me",
            "id": message_id,
            "format": format
        }
        if format == "metadata":
            params["metadataHeaders"] = ["From", "Subject", "Date", "List-Unsubscribe", "Precedence", "Auto-Submitted"]
            
        txt = self._retry_execute(self.service.users().messages().get(**params))
        headers = {
            (h.get("name") or "").lower(): (h.get("value") or "")
            for h in (txt.get("payload", {}) or {}).get("headers", []) or []
            if isinstance(h, dict)
        }
        return {
            "id": txt.get("id"),
            "thread_id": txt.get("threadId"),
            "history_id": txt.get("historyId"),
            "sender": headers.get("from") or None,
            "subject": headers.get("subject") or None,
            "snippet": txt.get("snippet") or "",
            "labelIds": txt.get("labelIds") or [],
            "payload": txt.get("payload"),
            "historyId": txt.get("historyId"),
            "headers": headers,
        }

    def get_thread(self, thread_id: str) -> Dict[str, Any]:
        """Fetch all messages in a thread."""
        thread = self._retry_execute(self.service.users().threads().get(userId='me', id=thread_id))
        messages = thread.get("messages", [])
        
        # We don't need full bodies for all for simple thread view, but schema says messages[] (minimal text)
        result = {
            "id": thread.get("id"),
            "historyId": thread.get("historyId"),
            "messages": []
        }
        
        for m in messages:
            headers = {
                (h.get("name") or "").lower(): (h.get("value") or "")
                for h in (m.get("payload", {}) or {}).get("headers", []) or []
            }
            # Extract body if available
            body = m.get("snippet")
            payload = m.get("payload", {})
            
            def _get_text(parts):
                for p in parts:
                    if p.get("mimeType") == "text/plain":
                         data = p.get("body", {}).get("data")
                         if data:
                             import base64
                             return base64.urlsafe_b64decode(data).decode('utf-8', errors='replace')
                    if "parts" in p:
                        res = _get_text(p["parts"])
                        if res: return res
                return None
            
            full_body = _get_text(payload.get("parts", []))
            if not full_body and payload.get("body", {}).get("data"):
                 import base64
                 full_body = base64.urlsafe_b64decode(payload["body"]["data"]).decode('utf-8', errors='replace')
            
            if full_body:
                body = full_body

            result["messages"].append({
                "id": m.get("id"),
                "sender": headers.get("from"),
                "subject": headers.get("subject"),
                "snippet": m.get("snippet"),
                "received_at": headers.get("date"),
                "body": body
            })
            
        return result

    def apply_label(self, message_id: str, label_name: str) -> Dict[str, Any]:
        label_id = self._ensure_user_label(label_name)
        current = self.get_message(message_id)
        current_label_ids = [str(value) for value in (current.get("labelIds") or [])]
        if label_id in current_label_ids:
            return {"status": "already_applied", "name": label_name, "id": label_id}

        modified = self._retry_execute(self.service.users().messages().modify(
            userId="me",
            id=message_id,
            body={"addLabelIds": [label_id], "removeLabelIds": []},
        ))
        return {
            "status": "applied",
            "name": label_name,
            "id": label_id,
            "label_ids": modified.get("labelIds") or [],
        }

    def remove_label(self, message_id: str, label_name: str, label_id: Optional[str] = None) -> Dict[str, Any]:
        resolved_id = str(label_id or "").strip() or self._find_label_id(label_name)
        if not resolved_id:
            return {"status": "not_found", "name": label_name}

        modified = self._retry_execute(self.service.users().messages().modify(
            userId="me",
            id=message_id,
            body={"addLabelIds": [], "removeLabelIds": [resolved_id]},
        ))
        return {
            "status": "removed",
            "name": label_name,
            "id": resolved_id,
            "label_ids": modified.get("labelIds") or [],
        }

    def move_to_inbox(self, message_id: str) -> Dict[str, Any]:
        modified = self._retry_execute(self.service.users().messages().modify(
            userId="me",
            id=message_id,
            body={"addLabelIds": ["INBOX"], "removeLabelIds": []},
        ))
        return {"status": "moved_to_inbox", "label_ids": modified.get("labelIds") or []}

    def archive_message(self, message_id: str) -> Dict[str, Any]:
        modified = self._retry_execute(self.service.users().messages().modify(
            userId="me",
            id=message_id,
            body={"addLabelIds": [], "removeLabelIds": ["INBOX"]},
        ))
        return {"status": "archived", "label_ids": modified.get("labelIds") or []}

    def delete_draft(self, draft_id: str) -> Dict[str, Any]:
        self._retry_execute(self.service.users().drafts().delete(userId="me", id=draft_id))
        return {"status": "deleted", "draft_id": draft_id}

    def create_draft(self, recipient: str, subject: str, body: str) -> Dict[str, Any]:
        """Create a draft email"""
        message = MIMEText(body)
        message['to'] = recipient
        message['subject'] = subject
        
        raw_string = base64.urlsafe_b64encode(message.as_bytes()).decode()
        
        try:
            draft = self._retry_execute(self.service.users().drafts().create(
                userId='me', 
                body={'message': {'raw': raw_string}}
            ))
            return draft
        except Exception as e:
            logger.error("Gmail Draft Error: %s", redact_text(str(e)))
            raise e

    def send_message(self, recipient: str, subject: str, body: str, thread_id: Optional[str] = None, reply_to_id: Optional[str] = None) -> Dict[str, Any]:
        """Send an email immediately with proper threading headers."""
        message = MIMEText(body)
        message["to"] = recipient
        message["subject"] = subject
        
        if reply_to_id:
            # Proper threading headers
            message["In-Reply-To"] = reply_to_id
            message["References"] = reply_to_id

        raw_string = base64.urlsafe_b64encode(message.as_bytes()).decode()
        
        body_payload: Dict[str, Any] = {"raw": raw_string}
        if thread_id:
            body_payload["threadId"] = thread_id

        try:
            sent = self._retry_execute(self.service.users().messages().send(
                userId="me",
                body=body_payload,
            ))
            return {
                "id": sent.get("id"),
                "thread_id": sent.get("threadId"),
                "label_ids": sent.get("labelIds") or [],
            }
        except Exception as e:
            logger.error("Gmail Send Error: %s", redact_text(str(e)))
            raise e

    def get_attachment(self, message_id: str, attachment_id: str) -> Dict[str, Any]:
        """Fetch attachment data."""
        try:
            return self._retry_execute(self.service.users().messages().attachments().get(
                userId='me', messageId=message_id, id=attachment_id
            ))
        except Exception as e:
            logger.error("Gmail attachment error: %s", redact_text(str(e)))
            raise e
