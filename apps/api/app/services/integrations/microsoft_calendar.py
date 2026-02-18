"""Microsoft Calendar (Graph) integration service."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

import logging
import requests

from app.services.brain.guardrails import redact_text

logger = logging.getLogger(__name__)


class MicrosoftCalendarService:
    def __init__(self, access_token: str):
        if not access_token:
            raise ValueError("Missing access token")
        self.access_token = access_token

    def list_events(
        self,
        *,
        time_min: datetime,
        time_max: datetime,
        max_results: int = 100,
    ) -> List[Dict[str, Any]]:
        url = "https://graph.microsoft.com/v1.0/me/calendarView"
        params = {
            "startDateTime": time_min.isoformat(),
            "endDateTime": time_max.isoformat(),
            "$top": str(max_results),
            "$orderby": "start/dateTime",
            "$select": "id,subject,start,end,organizer,isAllDay,isCancelled",
        }
        resp = requests.get(
            url,
            headers={
                "Authorization": f"Bearer {self.access_token}",
            },
            params=params,
            timeout=20,
        )
        if not resp.ok:
            logger.error("Microsoft Calendar list_events error %s: %s", resp.status_code, redact_text(resp.text))
            resp.raise_for_status()
        data = resp.json()
        items = data.get("value") or []
        results: List[Dict[str, Any]] = []
        for item in items:
            organizer = (((item.get("organizer") or {}).get("emailAddress") or {}).get("address")) if isinstance(item, dict) else None
            results.append(
                {
                    "id": item.get("id"),
                    "title": item.get("subject") or "(No title)",
                    "start_at": ((item.get("start") or {}).get("dateTime") if isinstance(item, dict) else None),
                    "end_at": ((item.get("end") or {}).get("dateTime") if isinstance(item, dict) else None),
                    "organizer": organizer,
                    "status": "cancelled" if bool(item.get("isCancelled")) else "confirmed",
                    "is_all_day": bool(item.get("isAllDay")),
                }
            )
        return results

    def create_event(
        self,
        *,
        title: str,
        start_at: str,
        end_at: str,
        timezone: str = "UTC",
        attendees: Optional[list[str]] = None,
        description: Optional[str] = None,
    ) -> Dict[str, Any]:
        url = "https://graph.microsoft.com/v1.0/me/events"
        payload: Dict[str, Any] = {
            "subject": title,
            "body": {"contentType": "Text", "content": description or ""},
            "start": {"dateTime": start_at, "timeZone": timezone},
            "end": {"dateTime": end_at, "timeZone": timezone},
        }
        if attendees:
            payload["attendees"] = [{"emailAddress": {"address": email}, "type": "required"} for email in attendees]

        resp = requests.post(
            url,
            headers={
                "Authorization": f"Bearer {self.access_token}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=20,
        )
        if not resp.ok:
            logger.error("Microsoft Calendar create_event error %s: %s", resp.status_code, redact_text(resp.text))
            resp.raise_for_status()
        data = resp.json()
        return {
            "id": data.get("id"),
            "web_link": data.get("webLink"),
            "status": "created",
        }

    def get_event(self, event_id: str) -> Dict[str, Any]:
        """Fetch a specific event by ID."""
        url = f"https://graph.microsoft.com/v1.0/me/events/{event_id}"
        resp = requests.get(
            url,
            headers={"Authorization": f"Bearer {self.access_token}"},
            timeout=20,
        )
        if not resp.ok:
            logger.error("Microsoft Calendar get_event error %s: %s", resp.status_code, redact_text(resp.text))
            resp.raise_for_status()
        item = resp.json()
        organizer = (((item.get("organizer") or {}).get("emailAddress") or {}).get("address")) if isinstance(item, dict) else None
        
        attendees = []
        for att in (item.get("attendees") or []):
            email = ((att.get("emailAddress") or {}).get("address"))
            if email: attendees.append(email)

        return {
            "id": item.get("id"),
            "title": item.get("subject") or "(No title)",
            "start_at": ((item.get("start") or {}).get("dateTime")),
            "end_at": ((item.get("end") or {}).get("dateTime")),
            "organizer": organizer,
            "location": (item.get("location") or {}).get("displayName"),
            "description": (item.get("body") or {}).get("content"),
            "attendees": attendees,
            "status": "cancelled" if bool(item.get("isCancelled")) else "confirmed",
            "is_all_day": bool(item.get("isAllDay")),
        }
