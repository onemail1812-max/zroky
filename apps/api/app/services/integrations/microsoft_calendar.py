"""Microsoft Graph Calendar Service — stateless, uses httpx."""
from __future__ import annotations

import logging
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta, timezone

import httpx

logger = logging.getLogger(__name__)

GRAPH_API = "https://graph.microsoft.com/v1.0"


class MicrosoftCalendarService:
    """Lightweight, stateless Microsoft Graph Calendar API client.
    
    Takes an OAuth access token and interacts with Outlook Calendar on-demand.
    """

    def __init__(self, access_token: str):
        self.access_token = access_token
        self._headers = {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/json",
            "Content-Type": "application/json",
        }

    # ── Read Operations ──────────────────────────────────────────────

    async def list_events(
        self,
        time_min: Optional[datetime] = None,
        time_max: Optional[datetime] = None,
        max_results: int = 50,
    ) -> List[Dict[str, Any]]:
        """List calendar events within a time range."""
        if not time_min:
            time_min = datetime.now(timezone.utc)
        if not time_max:
            time_max = time_min + timedelta(days=7)

        params = {
            "$filter": f"start/dateTime ge '{time_min.isoformat()}' and end/dateTime le '{time_max.isoformat()}'",
            "$top": max_results,
            "$orderby": "start/dateTime",
        }

        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                f"{GRAPH_API}/me/events",
                headers=self._headers,
                params=params,
            )
            resp.raise_for_status()
            data = resp.json()
            return data.get("value", [])

    async def get_freebusy(
        self,
        time_min: datetime,
        time_max: datetime,
        schedules: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """Check free/busy using Microsoft Graph getSchedule."""
        if not schedules:
            schedules = ["me"]

        payload = {
            "schedules": schedules,
            "startTime": {"dateTime": time_min.isoformat(), "timeZone": "UTC"},
            "endTime": {"dateTime": time_max.isoformat(), "timeZone": "UTC"},
            "availabilityViewInterval": 30,
        }

        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                f"{GRAPH_API}/me/calendar/getSchedule",
                headers=self._headers,
                json=payload,
            )
            resp.raise_for_status()
            return resp.json()

    # ── Write Operations ─────────────────────────────────────────────

    async def create_event(
        self,
        summary: str,
        start: datetime,
        end: datetime,
        attendees: Optional[List[str]] = None,
        description: str = "",
        location: str = "",
        online_meeting: bool = False,
    ) -> Dict[str, Any]:
        """Create a new Outlook calendar event."""
        event_body: Dict[str, Any] = {
            "subject": summary,
            "body": {"contentType": "text", "content": description},
            "start": {"dateTime": start.isoformat(), "timeZone": "UTC"},
            "end": {"dateTime": end.isoformat(), "timeZone": "UTC"},
        }

        if location:
            event_body["location"] = {"displayName": location}

        if attendees:
            event_body["attendees"] = [
                {"emailAddress": {"address": e}, "type": "required"}
                for e in attendees
            ]

        if online_meeting:
            event_body["isOnlineMeeting"] = True
            event_body["onlineMeetingProvider"] = "teamsForBusiness"

        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                f"{GRAPH_API}/me/events",
                headers=self._headers,
                json=event_body,
            )
            resp.raise_for_status()
            return resp.json()

    async def update_event(
        self, event_id: str, updates: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Update an existing Outlook calendar event."""
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.patch(
                f"{GRAPH_API}/me/events/{event_id}",
                headers=self._headers,
                json=updates,
            )
            resp.raise_for_status()
            return resp.json()

    async def delete_event(self, event_id: str) -> bool:
        """Delete an Outlook calendar event."""
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.delete(
                f"{GRAPH_API}/me/events/{event_id}",
                headers=self._headers,
            )
            resp.raise_for_status()
            return True
