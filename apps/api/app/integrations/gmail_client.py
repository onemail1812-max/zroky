"""Stateless Gmail Client — fetches emails live from Gmail API."""
from __future__ import annotations

import logging
import httpx
from typing import Optional

logger = logging.getLogger(__name__)

GMAIL_API = "https://gmail.googleapis.com/gmail/v1"


class GmailClient:
    """Lightweight, stateless Gmail API client.
    
    Takes an OAuth access token and fetches emails on-demand.
    No background sync, no database storage.
    """

    def __init__(self, access_token: str):
        self.access_token = access_token
        self._headers = {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/json",
        }

    async def list_threads(
        self,
        max_results: int = 50,
        query: str = "in:inbox",
        page_token: Optional[str] = None,
    ) -> dict:
        """Fetch recent threads from Gmail."""
        params = {
            "maxResults": max_results,
            "q": query,
            "labelIds": "INBOX",
        }
        if page_token:
            params["pageToken"] = page_token

        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                f"{GMAIL_API}/users/me/threads",
                headers=self._headers,
                params=params,
            )
            resp.raise_for_status()
            return resp.json()

    async def get_thread(self, thread_id: str, format: str = "metadata") -> dict:
        """Get a single thread with messages."""
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                f"{GMAIL_API}/users/me/threads/{thread_id}",
                headers=self._headers,
                params={"format": format},
            )
            resp.raise_for_status()
            return resp.json()

    async def get_message(self, message_id: str, format: str = "full") -> dict:
        """Get a single message."""
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                f"{GMAIL_API}/users/me/messages/{message_id}",
                headers=self._headers,
                params={"format": format},
            )
            resp.raise_for_status()
            return resp.json()

    async def archive_message(self, message_id: str) -> bool:
        """Removes the INBOX label to archive."""
        payload = {"removeLabelIds": ["INBOX"]}
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                f"{GMAIL_API}/users/me/messages/{message_id}/modify",
                headers=self._headers,
                json=payload,
            )
            resp.raise_for_status()
            return True

    async def trash_message(self, message_id: str) -> bool:
        """Moves the message to trash."""
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                f"{GMAIL_API}/users/me/messages/{message_id}/trash",
                headers=self._headers,
            )
            resp.raise_for_status()
            return True

    async def send_message(self, to: str, subject: str, text: str, cc: Optional[str] = None, bcc: Optional[str] = None, thread_id: Optional[str] = None, attachments: Optional[list] = None) -> dict:
        """Sends an email using the Gmail API, with optional attachments."""
        from email.message import EmailMessage
        import base64
        import mimetypes

        message = EmailMessage()
        message.set_content(text)
        message["To"] = to
        if cc:
             message["Cc"] = cc
        if bcc:
             message["Bcc"] = bcc
        message["Subject"] = subject
        
        # Add attachments if any
        if attachments:
            for attach in attachments:
                filename = attach.get("filename")
                content_b64 = attach.get("content")  # expected base64
                if not filename or not content_b64:
                    continue
                
                # Guess mime type
                mtype, _ = mimetypes.guess_type(filename)
                if not mtype:
                    mtype = "application/octet-stream"
                maintype, subtype = mtype.split("/", 1)
                
                try:
                    file_data = base64.b64decode(content_b64)
                    message.add_attachment(file_data, maintype=maintype, subtype=subtype, filename=filename)
                except Exception as e:
                    logger.error(f"Failed to attach file {filename}: {e}")

        # In a real app we'd construct the References and In-Reply-To headers if thread_id is used.
        encoded_message = base64.urlsafe_b64encode(message.as_bytes()).decode()

        payload = {"raw": encoded_message}
        if thread_id:
            payload["threadId"] = thread_id

        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                f"{GMAIL_API}/users/me/messages/send",
                headers=self._headers,
                json=payload,
            )
            resp.raise_for_status()
            return resp.json()

    async def fetch_inbox(self, max_results: int = 50) -> list[dict]:
        """High-level: fetch inbox threads with parsed metadata.
        
        Returns a list of dicts ready for the frontend:
        [{id, thread_id, provider, sender, subject, snippet, received_at, ...}]
        """
        try:
            threads_resp = await self.list_threads(max_results=max_results)
        except httpx.HTTPStatusError as e:
            logger.error(f"Gmail API error: {e.response.status_code} {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"Gmail connection error: {e}")
            raise

        thread_list = threads_resp.get("threads", [])
        if not thread_list:
            return []

        results = []
        # Fetch metadata for each thread (batch would be better, but this works)
        for t in thread_list[:max_results]:
            try:
                thread_data = await self.get_thread(t["id"], format="metadata")
                parsed = self._parse_thread(thread_data)
                if parsed:
                    results.append(parsed)
            except Exception as e:
                logger.warning(f"Failed to fetch thread {t['id']}: {e}")
                continue

        return results

    async def get_attachment_data(self, message_id: str, attachment_id: str) -> dict:
        """Fetch raw attachment data bytes from Gmail API."""
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                f"{GMAIL_API}/users/me/messages/{message_id}/attachments/{attachment_id}",
                headers=self._headers,
            )
            resp.raise_for_status()
            return resp.json()

    def _parse_thread(self, thread: dict) -> dict | None:
        """Parse a Gmail thread response into a frontend-ready dict."""
        messages = thread.get("messages", [])
        if not messages:
            return None

        # Get the latest message for display
        latest = messages[-1]
        headers = {h["name"].lower(): h["value"] for h in latest.get("payload", {}).get("headers", [])}

        sender = headers.get("from", "Unknown")
        subject = headers.get("subject", "(No Subject)")
        date_str = headers.get("date", "")
        snippet = latest.get("snippet", "")

        # Parse date
        received_at = None
        if date_str:
            try:
                from email.utils import parsedate_to_datetime
                received_at = parsedate_to_datetime(date_str).isoformat()
            except Exception:
                received_at = None

        # Determine read status from labels
        labels = latest.get("labelIds", [])
        is_read = "UNREAD" not in labels

        return {
            "id": latest.get("id", ""),
            "thread_id": thread.get("id", ""),
            "provider": "google",
            "sender": sender,
            "subject": subject,
            "snippet": snippet,
            "received_at": received_at,
            "category": "inbox",
            "priority": "normal",
            "is_noise": False,
            "is_read": is_read,
            "confidence": None,
            "reasoning": None,
            "requires_approval": False,
            "deadline_at": None,
            "awaiting_reply": False,
            "draft_preview": None,
            "draft": None,
        }
