"""Google Calendar Service — stateless, uses httpx like GmailClient."""
from __future__ import annotations

import logging
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta, timezone

import httpx

logger = logging.getLogger(__name__)

GCAL_API = "https://www.googleapis.com/calendar/v3"


class GoogleCalendarService:
    """Lightweight, stateless Google Calendar API client.
    
    Takes an OAuth access token and interacts with Google Calendar on-demand.
    Mirrors the pattern used in GmailClient for consistency.
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
        calendar_id: str = "primary",
    ) -> List[Dict[str, Any]]:
        """List calendar events within a time range."""
        if not time_min:
            time_min = datetime.now(timezone.utc)
        if not time_max:
            time_max = time_min + timedelta(days=7)

        params = {
            "timeMin": time_min.isoformat(),
            "timeMax": time_max.isoformat(),
            "maxResults": max_results,
            "singleEvents": "true",
            "orderBy": "startTime",
        }

        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                f"{GCAL_API}/calendars/{calendar_id}/events",
                headers=self._headers,
                params=params,
            )
            resp.raise_for_status()
            data = resp.json()
            return data.get("items", [])

    async def get_freebusy(
        self,
        time_min: datetime,
        time_max: datetime,
        calendar_ids: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """Check free/busy status across calendars."""
        if not calendar_ids:
            calendar_ids = ["primary"]

        payload = {
            "timeMin": time_min.isoformat(),
            "timeMax": time_max.isoformat(),
            "items": [{"id": cid} for cid in calendar_ids],
        }

        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                f"{GCAL_API}/freeBusy",
                headers=self._headers,
                json=payload,
            )
            resp.raise_for_status()
            return resp.json()

    async def get_event(self, event_id: str, calendar_id: str = "primary") -> Dict[str, Any]:
        """Get a single calendar event."""
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                f"{GCAL_API}/calendars/{calendar_id}/events/{event_id}",
                headers=self._headers,
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
        calendar_id: str = "primary",
        send_updates: str = "all",
        conference: bool = False,
    ) -> Dict[str, Any]:
        """Create a new calendar event with optional Google Meet link."""
        event_body: Dict[str, Any] = {
            "summary": summary,
            "description": description,
            "location": location,
            "start": {
                "dateTime": start.isoformat(),
                "timeZone": "UTC",
            },
            "end": {
                "dateTime": end.isoformat(),
                "timeZone": "UTC",
            },
        }

        if attendees:
            event_body["attendees"] = [{"email": e} for e in attendees]

        if conference:
            event_body["conferenceData"] = {
                "createRequest": {
                    "requestId": f"aaliyah-{int(datetime.now().timestamp())}",
                    "conferenceSolutionKey": {"type": "hangoutsMeet"},
                }
            }

        params = {"sendUpdates": send_updates}
        if conference:
            params["conferenceDataVersion"] = "1"

        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                f"{GCAL_API}/calendars/{calendar_id}/events",
                headers=self._headers,
                json=event_body,
                params=params,
            )
            resp.raise_for_status()
            return resp.json()

    async def update_event(
        self,
        event_id: str,
        updates: Dict[str, Any],
        calendar_id: str = "primary",
        send_updates: str = "all",
    ) -> Dict[str, Any]:
        """Update an existing calendar event."""
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.patch(
                f"{GCAL_API}/calendars/{calendar_id}/events/{event_id}",
                headers=self._headers,
                json=updates,
                params={"sendUpdates": send_updates},
            )
            resp.raise_for_status()
            return resp.json()

    async def delete_event(
        self,
        event_id: str,
        calendar_id: str = "primary",
        send_updates: str = "all",
    ) -> bool:
        """Delete a calendar event."""
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.delete(
                f"{GCAL_API}/calendars/{calendar_id}/events/{event_id}",
                headers=self._headers,
                params={"sendUpdates": send_updates},
            )
            resp.raise_for_status()
            return True

    # ── Helpers ───────────────────────────────────────────────────────

    async def find_free_slots(
        self,
        days_ahead: int = 5,
        slot_duration_minutes: int = 30,
        working_hours: tuple = (9, 17),
    ) -> List[Dict[str, str]]:
        """Find available time slots in the next N days during working hours.
        
        Returns a list of {start, end} ISO datetime strings.
        """
        now = datetime.now(timezone.utc)
        end_range = now + timedelta(days=days_ahead)

        # Get busy times
        freebusy = await self.get_freebusy(now, end_range)
        busy_periods = []
        for cal_data in freebusy.get("calendars", {}).values():
            for busy in cal_data.get("busy", []):
                busy_start = datetime.fromisoformat(busy["start"].replace("Z", "+00:00"))
                busy_end = datetime.fromisoformat(busy["end"].replace("Z", "+00:00"))
                busy_periods.append((busy_start, busy_end))

        # Scan working hours for free slots
        free_slots = []
        current_day = now.replace(hour=working_hours[0], minute=0, second=0, microsecond=0)
        if current_day < now:
            current_day += timedelta(days=1)

        while current_day < end_range and len(free_slots) < 10:
            if current_day.weekday() < 5:  # Skip weekends
                slot_start = current_day
                day_end = current_day.replace(hour=working_hours[1], minute=0)

                while slot_start + timedelta(minutes=slot_duration_minutes) <= day_end:
                    slot_end = slot_start + timedelta(minutes=slot_duration_minutes)
                    
                    # Check if slot is free
                    is_busy = any(
                        not (slot_end <= bs or slot_start >= be)
                        for bs, be in busy_periods
                    )

                    if not is_busy:
                        free_slots.append({
                            "start": slot_start.isoformat(),
                            "end": slot_end.isoformat(),
                            "duration_minutes": slot_duration_minutes,
                        })

                    slot_start += timedelta(minutes=30)  # Step by 30 min

            current_day += timedelta(days=1)
            current_day = current_day.replace(hour=working_hours[0], minute=0)

        return free_slots
