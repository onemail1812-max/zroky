from __future__ import annotations

import logging
import httpx
from typing import Optional, Any
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception, before_sleep_log

logger = logging.getLogger(__name__)

GMAIL_API = "https://gmail.googleapis.com/gmail/v1"


def is_rate_limit_or_network_error(exc: Exception) -> bool:
    """Check if the exception is a retriable rate limit or network error."""
    if isinstance(exc, httpx.HTTPStatusError):
        # 429 = Rate Limit, 5xx = Server issues
        return exc.response.status_code == 429 or exc.response.status_code >= 500
    return isinstance(exc, (httpx.NetworkError, httpx.TimeoutException))


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

    @retry(
        wait=wait_exponential(multiplier=1, min=2, max=30),
        stop=stop_after_attempt(5),
        retry=retry_if_exception(is_rate_limit_or_network_error),
        before_sleep=before_sleep_log(logger, logging.WARNING),
        reraise=True
    )
    async def _request(self, method: str, path: str, **kwargs) -> httpx.Response:
        """Centralized retriable request helper."""
        timeout = kwargs.pop("timeout", 15.0)
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.request(
                method=method,
                url=f"{GMAIL_API}/{path.lstrip('/')}",
                headers=self._headers,
                **kwargs
            )
            resp.raise_for_status()
            return resp

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

        resp = await self._request("GET", "users/me/threads", params=params)
        return resp.json()

    async def get_thread(self, thread_id: str, format: str = "metadata") -> dict:
        """Get a single thread with messages."""
        resp = await self._request("GET", f"users/me/threads/{thread_id}", params={"format": format})
        return resp.json()

    async def get_message(self, message_id: str, format: str = "full") -> dict:
        """Get a single message."""
        resp = await self._request("GET", f"users/me/messages/{message_id}", params={"format": format})
        return resp.json()

    async def archive_message(self, message_id: str) -> bool:
        """Removes the INBOX label to archive."""
        payload = {"removeLabelIds": ["INBOX"]}
        await self._request("POST", f"users/me/messages/{message_id}/modify", json=payload)
        return True

    async def trash_message(self, message_id: str) -> bool:
        """Moves the message to trash."""
        await self._request("POST", f"users/me/messages/{message_id}/trash")
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

        resp = await self._request("POST", "users/me/messages/send", json=payload)
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
        for i, t in enumerate(thread_list[:max_results]):
            try:
                if i > 0:
                    import asyncio
                    await asyncio.sleep(0.1)  # Throttle: avoid 429s during bulk fetch
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
        resp = await self._request("GET", f"users/me/messages/{message_id}/attachments/{attachment_id}")
        return resp.json()

    async def get_profile(self) -> dict:
        """Get user's Gmail profile."""
        resp = await self._request("GET", "users/me/profile")
        return resp.json()

    async def list_history(self, start_history_id: str) -> dict:
        """List Gmail history starting from a specific ID."""
        resp = await self._request("GET", "users/me/history", params={"startHistoryId": start_history_id})
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
