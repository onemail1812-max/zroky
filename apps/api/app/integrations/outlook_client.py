"""Stateless Outlook Client — fetches emails live from Microsoft Graph API."""
from __future__ import annotations

import logging
import httpx
from typing import Optional

logger = logging.getLogger(__name__)

GRAPH_API = "https://graph.microsoft.com/v1.0"


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

    async def list_messages(
        self,
        max_results: int = 50,
        folder: str = "inbox",
        skip: int = 0,
    ) -> dict:
        """Fetch recent messages from Outlook inbox."""
        params = {
            "$top": max_results,
            "$skip": skip,
            "$orderby": "receivedDateTime desc",
            "$select": "id,conversationId,from,subject,bodyPreview,receivedDateTime,isRead,isDraft",
        }

        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                f"{GRAPH_API}/me/mailFolders/{folder}/messages",
                headers=self._headers,
                params=params,
            )
            resp.raise_for_status()
            return resp.json()

    async def get_message(self, message_id: str) -> dict:
        """Get a single message."""
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                f"{GRAPH_API}/me/messages/{message_id}",
                headers=self._headers,
            )
            resp.raise_for_status()
            return resp.json()

    async def archive_message(self, message_id: str) -> bool:
        """Moves the message to the archive folder."""
        payload = {"destinationId": "archive"}
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                f"{GRAPH_API}/me/messages/{message_id}/move",
                headers=self._headers,
                json=payload,
            )
            resp.raise_for_status()
            return True

    async def trash_message(self, message_id: str) -> bool:
        """Moves the message to the deleted items folder."""
        payload = {"destinationId": "deleteditems"}
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                f"{GRAPH_API}/me/messages/{message_id}/move",
                headers=self._headers,
                json=payload,
            )
            resp.raise_for_status()
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
