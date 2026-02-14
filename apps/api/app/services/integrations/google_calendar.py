"""Google Calendar integration service."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

from app.config import settings
from app.services.brain.guardrails import redact_text
import logging

logger = logging.getLogger(__name__)


class GoogleCalendarService:
    def __init__(self, token: Dict[str, Any]):
        if not settings.google_client_id or not settings.google_client_secret:
            raise ValueError("Google OAuth settings missing (GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET)")

        self.creds = Credentials(
            token=token["access_token"],
            refresh_token=token.get("refresh_token"),
            token_uri="https://oauth2.googleapis.com/token",
            client_id=settings.google_client_id,
            client_secret=settings.google_client_secret,
            scopes=token.get("scope").split(" ") if isinstance(token.get("scope"), str) else None,
        )
        self.service = build("calendar", "v3", credentials=self.creds)

    def list_events(
        self,
        *,
        time_min: datetime,
        time_max: datetime,
        max_results: int = 100,
    ) -> List[Dict[str, Any]]:
        try:
            response = (
                self.service.events()
                .list(
                    calendarId="primary",
                    timeMin=time_min.isoformat(),
                    timeMax=time_max.isoformat(),
                    maxResults=max_results,
                    singleEvents=True,
                    orderBy="startTime",
                )
                .execute()
            )
            items = response.get("items") or []
            results: List[Dict[str, Any]] = []
            for item in items:
                start = (item.get("start") or {}).get("dateTime") or (item.get("start") or {}).get("date")
                end = (item.get("end") or {}).get("dateTime") or (item.get("end") or {}).get("date")
                organizer = ((item.get("organizer") or {}).get("email") or None) if isinstance(item, dict) else None
                results.append(
                    {
                        "id": item.get("id"),
                        "title": item.get("summary") or "(No title)",
                        "start_at": start,
                        "end_at": end,
                        "organizer": organizer,
                        "status": item.get("status") or "confirmed",
                        "is_all_day": "date" in (item.get("start") or {}),
                    }
                )
            return results
        except Exception as exc:  # noqa: BLE001
            logger.error("Google Calendar list_events failed: %s", redact_text(str(exc)))
            raise

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
        event_body = {
            "summary": title,
            "description": description or "",
            "start": {"dateTime": start_at, "timeZone": timezone},
            "end": {"dateTime": end_at, "timeZone": timezone},
        }
        if attendees:
            event_body["attendees"] = [{"email": email} for email in attendees]

        try:
            event = self.service.events().insert(calendarId="primary", body=event_body).execute()
            return {
                "id": event.get("id"),
                "html_link": event.get("htmlLink"),
                "status": event.get("status"),
            }
        except Exception as exc:  # noqa: BLE001
            logger.error("Google Calendar create_event failed: %s", redact_text(str(exc)))
            raise
