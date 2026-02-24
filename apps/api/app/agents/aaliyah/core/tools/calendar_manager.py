"""Calendar Manager Tool backed by live Google/Outlook calendar APIs."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Tuple

from app.database import SessionLocal
from app.models.integration import IntegrationProvider
from app.services.brain.guardrails import redact_text
from app.services.integrations.token_store import get_valid_token

from ..ingestion.calendar_sync import CalendarSync
from ..interfaces.tool import AaliyahTool


def _to_dt(value: str) -> datetime:
    dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
    return dt.astimezone(timezone.utc) if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


class CalendarManager(AaliyahTool):
    @property
    def name(self) -> str:
        return "calendar_manager"

    @property
    def description(self) -> str:
        return "Reads availability, schedules events, and detects calendar conflicts."

    async def run(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        action = str(input_data.get("action") or "").lower().strip()
        if action in {"check_availability", "availability"}:
            return await self._check_availability(input_data)
        if action in {"schedule", "schedule_event"}:
            return await self._schedule_event(input_data)
        if action in {"check_conflicts", "sync_conflicts"}:
            return await self._check_conflicts(input_data)
        return {"error": "unsupported_action", "message": f"Unsupported calendar action '{action}'"}

    async def _resolve_client(self, *, workspace_id: str, provider: str, db) -> Tuple[str, Any]:
        from app.services.integrations.google_calendar import GoogleCalendarService
        from app.services.integrations.microsoft_calendar import MicrosoftCalendarService
        
        normalized = (provider or "auto").lower().strip()
        if normalized in {"auto", ""}:
            if get_valid_token(db, workspace_id, "google"):
                normalized = "google"
            elif get_valid_token(db, workspace_id, "microsoft"):
                normalized = "microsoft"

        if normalized in {"google", "gcal"}:
            token = get_valid_token(db, workspace_id, "google")
            if not token:
                raise ValueError("Google Calendar is not connected for this workspace")
            return "google", GoogleCalendarService(token)

        if normalized in {"microsoft", "outlook", "ocal"}:
            token = get_valid_token(db, workspace_id, "microsoft")
            if not token:
                raise ValueError("Outlook Calendar is not connected for this workspace")
            return "microsoft", MicrosoftCalendarService(token)

        raise ValueError(f"Unsupported provider '{provider}'")

    async def _check_availability(self, data: Dict[str, Any]) -> Dict[str, Any]:
        workspace_id = str(data.get("workspace_id") or "").strip()
        provider = str(data.get("provider") or "auto")
        duration_minutes = int(data.get("duration_minutes") or 30)
        window_start = _to_dt(str(data.get("window_start") or datetime.now(timezone.utc).isoformat()))
        window_end = _to_dt(str(data.get("window_end") or (window_start + timedelta(days=1)).isoformat()))

        if not workspace_id:
            return {"error": "invalid_request", "message": "workspace_id is required"}
        if window_end <= window_start:
            return {"error": "invalid_request", "message": "window_end must be after window_start"}

        db = SessionLocal()
        try:
            _, client = self._resolve_client(workspace_id=workspace_id, provider=provider, db=db)
            events = client.list_events(time_min=window_start, time_max=window_end, max_results=200)

            busy_ranges: List[Tuple[datetime, datetime]] = []
            for event in events:
                start = event.get("start_at")
                end = event.get("end_at")
                try:
                    s = _to_dt(str(start))
                    e = _to_dt(str(end))
                except Exception:
                    continue
                if e > s:
                    busy_ranges.append((s, e))

            busy_ranges.sort(key=lambda item: item[0])
            slot = window_start
            step = timedelta(minutes=15)
            duration = timedelta(minutes=max(15, min(duration_minutes, 240)))
            available_slots: List[dict[str, str]] = []
            while slot + duration <= window_end:
                candidate_end = slot + duration
                overlap = any(not (candidate_end <= busy_start or slot >= busy_end) for busy_start, busy_end in busy_ranges)
                if not overlap:
                    available_slots.append({"start_at": slot.isoformat(), "end_at": candidate_end.isoformat()})
                slot += step

            return {"available_slots": available_slots}
        except Exception as exc:
            return {"error": "availability_failed", "message": redact_text(str(exc))}
        finally:
            db.close()

    async def _schedule_event(self, data: Dict[str, Any]) -> Dict[str, Any]:
        workspace_id = str(data.get("workspace_id") or "").strip()
        provider = str(data.get("provider") or "auto")
        title = str(data.get("title") or "").strip()
        start_at = str(data.get("start_at") or "").strip()
        end_at = str(data.get("end_at") or "").strip()
        timezone_name = str(data.get("timezone") or "UTC").strip()
        attendees = data.get("attendees") if isinstance(data.get("attendees"), list) else []
        description = str(data.get("description") or "")

        if not workspace_id:
            return {"error": "invalid_request", "message": "workspace_id is required"}
        if not title or not start_at or not end_at:
            return {"error": "invalid_request", "message": "title, start_at and end_at are required"}

        db = SessionLocal()
        try:
            resolved_provider, client = self._resolve_client(workspace_id=workspace_id, provider=provider, db=db)
            created = client.create_event(
                title=title,
                start_at=start_at,
                end_at=end_at,
                timezone=timezone_name,
                attendees=[str(email) for email in attendees],
                description=description,
            )
            return {"status": "scheduled", "provider": resolved_provider, "raw": created}
        except Exception as exc:
            return {"error": "schedule_failed", "message": redact_text(str(exc))}
        finally:
            db.close()

    async def _check_conflicts(self, data: Dict[str, Any]) -> Dict[str, Any]:
        workspace_id = str(data.get("workspace_id") or "").strip()
        provider = str(data.get("provider") or "auto")
        window_days = int(data.get("window_days") or 7)
        buffer_minutes = int(data.get("buffer_minutes") or 15)
        if not workspace_id:
            return {"error": "invalid_request", "message": "workspace_id is required"}

        db = SessionLocal()
        try:
            sync = CalendarSync(workspace_id, db)
            return await sync.sync_and_detect(
                provider=provider,
                window_days=window_days,
                max_results=200,
                buffer_minutes=buffer_minutes,
            )
        except Exception as exc:
            return {"error": "conflict_scan_failed", "message": redact_text(str(exc))}
        finally:
            db.close()
