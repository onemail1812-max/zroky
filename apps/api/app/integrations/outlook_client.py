"""Stateless Outlook Client — fetches emails live from Microsoft Graph API."""
from __future__ import annotations

import logging
import httpx
from typing import Optional
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception, before_sleep_log

logger = logging.getLogger(__name__)

GRAPH_API = "https://graph.microsoft.com/v1.0"


def _is_retriable_error(exc: Exception) -> bool:
    """Check if the exception is a retriable rate limit or network error."""
    if isinstance(exc, httpx.HTTPStatusError):
        return exc.response.status_code == 429 or exc.response.status_code >= 500
    return isinstance(exc, (httpx.NetworkError, httpx.TimeoutException))


class OutlookClient:
    """Lightweight, stateless Microsoft Graph API client.
    
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
        retry=retry_if_exception(_is_retriable_error),
        before_sleep=before_sleep_log(logger, logging.WARNING),
        reraise=True
    )
    async def _request(self, method: str, path: str, **kwargs) -> httpx.Response:
        """Centralized retriable request helper."""
        timeout = kwargs.pop("timeout", 15.0)
        url = path if path.startswith("http") else f"{GRAPH_API}/{path.lstrip('/')}"
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.request(
                method=method,
                url=url,
                headers=self._headers,
                **kwargs
            )
            resp.raise_for_status()
            return resp

    async def list_messages(
        self,
        max_results: int = 50,
        folder: str = "inbox",
        skip: int = 0,
        filter_query: Optional[str] = None,
    ) -> dict:
        """Fetch recent messages from Outlook inbox."""
        params = {
            "$top": max_results,
            "$skip": skip,
            "$orderby": "receivedDateTime desc",
            "$select": "id,conversationId,from,subject,bodyPreview,receivedDateTime,isRead,isDraft",
        }
        if filter_query:
            params["$filter"] = filter_query

        resp = await self._request("GET", f"me/mailFolders/{folder}/messages", params=params)
        return resp.json()

    async def get_message(self, message_id: str) -> dict:
        """Get a single message."""
        resp = await self._request("GET", f"me/messages/{message_id}")
        return resp.json()

    async def archive_message(self, message_id: str) -> bool:
        """Moves the message to the archive folder."""
        payload = {"destinationId": "archive"}
        await self._request("POST", f"me/messages/{message_id}/move", json=payload)
        return True

    async def trash_message(self, message_id: str) -> bool:
        """Moves the message to the deleted items folder."""
        payload = {"destinationId": "deleteditems"}
        await self._request("POST", f"me/messages/{message_id}/move", json=payload)
        return True

    async def send_message(self, to: str, subject: str, text: str, cc: Optional[str] = None, bcc: Optional[str] = None, thread_id: Optional[str] = None, attachments: list | None = None) -> bool:
        """Sends an email via Microsoft Graph API."""
        msg_payload = {
            "subject": subject,
            "body": {
                "contentType": "Text",
                "content": text
            },
            "toRecipients": [
                {
                    "emailAddress": {
                        "address": r.strip()
                    }
                } for r in to.split(",") if r.strip()
            ]
        }
        
        if cc:
            msg_payload["ccRecipients"] = [
                {
                    "emailAddress": {
                        "address": r.strip()
                    }
                } for r in cc.split(",") if r.strip()
            ]
            
        if bcc:
            msg_payload["bccRecipients"] = [
                {
                    "emailAddress": {
                        "address": r.strip()
                    }
                } for r in bcc.split(",") if r.strip()
            ]

        if thread_id:
            msg_payload["conversationId"] = thread_id
        
        if attachments:
            msg_payload["hasAttachments"] = True
            msg_payload["attachments"] = []
            import mimetypes
            for attach in attachments:
                filename = attach.get("filename")
                content = attach.get("content")
                if not filename or not content:
                    continue
                mtype, _ = mimetypes.guess_type(filename)
                msg_payload["attachments"].append({
                    "@odata.type": "#microsoft.graph.fileAttachment",
                    "name": filename,
                    "contentType": mtype or "application/octet-stream",
                    "contentBytes": content
                })

        payload = {
            "message": msg_payload,
            "saveToSentItems": "true"
        }

        await self._request("POST", "me/sendMail", json=payload)
        return True

    async def fetch_inbox(self, max_results: int = 50) -> list[dict]:
        """High-level: fetch inbox messages with parsed metadata.
        
        Returns a list of dicts ready for the frontend.
        """
        try:
            resp = await self.list_messages(max_results=max_results)
        except httpx.HTTPStatusError as e:
            logger.error(f"Outlook API error: {e.response.status_code} {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"Outlook connection error: {e}")
            raise

        messages = resp.get("value", [])
        results = []

        for msg in messages:
            parsed = self._parse_message(msg)
            if parsed:
                results.append(parsed)

        return results

    def _parse_message(self, msg: dict) -> dict | None:
        """Parse an Outlook message response into a frontend-ready dict."""
        from_field = msg.get("from", {}).get("emailAddress", {})
        sender_name = from_field.get("name", "Unknown")
        sender_email = from_field.get("address", "")
        sender = f"{sender_name} <{sender_email}>" if sender_email else sender_name

        return {
            "id": msg.get("id", ""),
            "thread_id": msg.get("conversationId", ""),
            "provider": "microsoft",
            "sender": sender,
            "subject": msg.get("subject", "(No Subject)"),
            "snippet": msg.get("bodyPreview", ""),
            "received_at": msg.get("receivedDateTime"),
            "category": "inbox",
            "priority": "normal",
            "is_noise": False,
            "is_read": msg.get("isRead", False),
            "confidence": None,
            "reasoning": None,
            "requires_approval": False,
            "deadline_at": None,
            "awaiting_reply": False,
            "draft_preview": None,
            "draft": None,
        }
