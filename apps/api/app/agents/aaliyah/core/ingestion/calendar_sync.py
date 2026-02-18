"""Calendar sync and conflict detection service."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
import uuid
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from app.models.calendar_event_snapshot import CalendarConflict, CalendarEventSnapshot
from app.models.search_index import CalendarIndex
from app.models.integration import IntegrationProvider
from app.services.integrations.google_calendar import GoogleCalendarService
from app.services.integrations.integration_token_manager import IntegrationTokenManager
from app.services.integrations.microsoft_calendar import MicrosoftCalendarService


class NormalizedCalendarEvent(BaseModel):
    id: str = Field(min_length=1, max_length=256)
    workspace_id: str = Field(min_length=1, max_length=128)
    provider: str = Field(min_length=1, max_length=32)
    title: str = Field(min_length=1, max_length=300)
    organizer: Optional[str] = None
    start_at: datetime
    end_at: datetime
    is_all_day: bool = False
    is_cancelled: bool = False
    raw: Dict[str, Any] = Field(default_factory=dict)

    @field_validator("provider")
    @classmethod
    def normalize_provider(cls, value: str) -> str:
        normalized = value.lower().strip()
        if normalized in {"google", "gcal", "google_calendar"}:
            return "google"
        if normalized in {"microsoft", "outlook", "ocal"}:
            return "microsoft"
        return normalized

    @field_validator("end_at")
    @classmethod
    def end_must_be_after_start(cls, value: datetime, info):  # type: ignore[override]
        start_at = info.data.get("start_at")
        if isinstance(start_at, datetime) and value <= start_at:
            raise ValueError("end_at must be after start_at")
        return value


@dataclass(frozen=True)
class ConflictResult:
    event_a_id: str
    event_b_id: str
    conflict_type: str  # overlap|tight_buffer
    conflict_minutes: int
    explain: str


class CalendarSync:
    def __init__(self, workspace_id: str, db: Session):
        self.workspace_id = workspace_id
        self.db = db
        self.token_manager = IntegrationTokenManager(db)

    def _resolve_provider(self, provider: str) -> Optional[str]:
        provider = (provider or "auto").lower().strip()
        if provider in {"google", "gcal"}:
            return "google"
        if provider in {"microsoft", "outlook", "ocal"}:
            return "microsoft"

        if self.token_manager.get_valid_token(self.workspace_id, IntegrationProvider.GOOGLE_CALENDAR):
            return "google"
        if self.token_manager.get_valid_token(self.workspace_id, IntegrationProvider.OUTLOOK):
            return "microsoft"
        return None

    def _parse_datetime(self, value: Any) -> Optional[datetime]:
        if isinstance(value, datetime):
            return value.astimezone(timezone.utc) if value.tzinfo else value.replace(tzinfo=timezone.utc)
        if isinstance(value, str) and value.strip():
            try:
                dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
                return dt.astimezone(timezone.utc) if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
            except ValueError:
                return None
        return None

    async def fetch_events(
        self,
        *,
        provider: str = "auto",
        window_days: int = 7,
        max_results: int = 100,
    ) -> List[NormalizedCalendarEvent]:
        resolved = self._resolve_provider(provider)
        if not resolved:
            return []

        now = datetime.now(timezone.utc)
        time_min = now - timedelta(days=1)
        time_max = now + timedelta(days=max(1, min(window_days, 30)))

        raw_events: List[Dict[str, Any]]
        if resolved == "google":
            token = self.token_manager.get_valid_token(self.workspace_id, IntegrationProvider.GOOGLE_CALENDAR)
            if not token:
                return []
            raw_events = GoogleCalendarService(token).list_events(time_min=time_min, time_max=time_max, max_results=max_results)
        else:
            token = self.token_manager.get_valid_token(self.workspace_id, IntegrationProvider.OUTLOOK)
            access_token = str((token or {}).get("access_token") or "")
            if not access_token:
                return []
            raw_events = MicrosoftCalendarService(access_token).list_events(
                time_min=time_min,
                time_max=time_max,
                max_results=max_results,
            )

        normalized: List[NormalizedCalendarEvent] = []
        for item in raw_events:
            start_at = self._parse_datetime(item.get("start_at"))
            end_at = self._parse_datetime(item.get("end_at"))
            if not start_at or not end_at:
                continue
            try:
                normalized.append(
                    NormalizedCalendarEvent(
                        id=str(item.get("id") or ""),
                        workspace_id=self.workspace_id,
                        provider=resolved,
                        title=str(item.get("title") or "(No title)"),
                        organizer=(str(item.get("organizer")) if item.get("organizer") else None),
                        start_at=start_at,
                        end_at=end_at,
                        is_all_day=bool(item.get("is_all_day", False)),
                        is_cancelled=str(item.get("status") or "").lower() == "cancelled",
                        raw=item,
                    )
                )
            except Exception:
                continue
        return normalized

    async def fetch_event(self, event_id: str, provider: str) -> Optional[Dict[str, Any]]:
        """Fetch a specific event from provider."""
        resolved = provider.lower()
        try:
            if resolved == "google":
                token = self.token_manager.get_valid_token(self.workspace_id, IntegrationProvider.GOOGLE_CALENDAR)
                if not token: return None
                return GoogleCalendarService(token).get_event(event_id)
            elif resolved == "microsoft":
                token = self.token_manager.get_valid_token(self.workspace_id, IntegrationProvider.OUTLOOK)
                if not token: return None
                return MicrosoftCalendarService(token["access_token"]).get_event(event_id)
        except Exception as e:
            logger.error(f"Failed to fetch event {event_id}: {e}")
        return None

    def detect_conflicts(self, events: List[NormalizedCalendarEvent], buffer_minutes: int = 15) -> List[ConflictResult]:
        if not events:
            return []
        sorted_events = sorted(events, key=lambda event: event.start_at)
        conflicts: List[ConflictResult] = []
        for index in range(len(sorted_events) - 1):
            current = sorted_events[index]
            nxt = sorted_events[index + 1]
            if current.is_cancelled or nxt.is_cancelled:
                continue
            overlap_minutes = int((current.end_at - nxt.start_at).total_seconds() / 60)
            if overlap_minutes > 0:
                conflicts.append(
                    ConflictResult(
                        event_a_id=current.id,
                        event_b_id=nxt.id,
                        conflict_type="overlap",
                        conflict_minutes=overlap_minutes,
                        explain=f"'{current.title}' overlaps '{nxt.title}' by {overlap_minutes} minutes.",
                    )
                )
                continue
            buffer_gap = int((nxt.start_at - current.end_at).total_seconds() / 60)
            if buffer_gap < buffer_minutes:
                conflicts.append(
                    ConflictResult(
                        event_a_id=current.id,
                        event_b_id=nxt.id,
                        conflict_type="tight_buffer",
                        conflict_minutes=max(0, buffer_gap),
                        explain=f"'{current.title}' and '{nxt.title}' have only {buffer_gap} minutes buffer.",
                    )
                )
        return conflicts

    def upsert_events(self, events: List[NormalizedCalendarEvent]) -> None:
        for event in events:
            row = (
                self.db.query(CalendarEventSnapshot)
                .filter(
                    CalendarEventSnapshot.workspace_id == self.workspace_id,
                    CalendarEventSnapshot.provider == event.provider,
                    CalendarEventSnapshot.external_event_id == event.id,
                )
                .first()
            )
            if not row:
                row = CalendarEventSnapshot(
                    id=str(uuid.uuid4()),
                    workspace_id=self.workspace_id,
                    provider=event.provider,
                    external_event_id=event.id,
                    title=event.title,
                    organizer=event.organizer,
                    start_at=event.start_at,
                    end_at=event.end_at,
                    is_all_day=event.is_all_day,
                    is_cancelled=event.is_cancelled,
                    metadata_json=event.raw,
                )
                self.db.add(row)
            else:
                row.title = event.title
                row.organizer = event.organizer
                row.start_at = event.start_at
                row.end_at = event.end_at
                row.is_all_day = event.is_all_day
                row.is_cancelled = event.is_cancelled
                row.metadata_json = event.raw
            
            # Update CalendarIndex
            idx = (
                self.db.query(CalendarIndex)
                .filter(
                    CalendarIndex.workspace_id == self.workspace_id,
                    CalendarIndex.event_id == event.id,
                    CalendarIndex.provider == event.provider,
                )
                .first()
            )
            
            search_text = (
                f"{event.title or ''} {event.organizer or ''} {event.raw.get('location', '')} "
                f"{event.raw.get('description', '')}"
            ).lower()[:10000]
            
            if not idx:
                idx = CalendarIndex(
                    id=str(uuid.uuid4()),
                    workspace_id=self.workspace_id,
                    event_id=event.id,
                    provider=event.provider,
                    title=event.title,
                    start_at=event.start_at,
                    end_at=event.end_at,
                    location=str(event.raw.get('location') or ""),
                    description_snippet=(str(event.raw.get('description') or ""))[:500],
                    searchable_text=search_text,
                )
                self.db.add(idx)
            else:
                idx.title = event.title
                idx.start_at = event.start_at
                idx.end_at = event.end_at
                idx.location = str(event.raw.get('location') or "")
                idx.description_snippet = (str(event.raw.get('description') or ""))[:500]
                idx.searchable_text = search_text

        self.db.commit()

    def replace_conflicts(self, conflicts: List[ConflictResult]) -> None:
        self.db.query(CalendarConflict).filter(CalendarConflict.workspace_id == self.workspace_id).delete()
        for conflict in conflicts:
            self.db.add(
                CalendarConflict(
                    id=str(uuid.uuid4()),
                    workspace_id=self.workspace_id,
                    event_a_id=conflict.event_a_id,
                    event_b_id=conflict.event_b_id,
                    conflict_type=conflict.conflict_type,
                    conflict_minutes=str(conflict.conflict_minutes),
                    explain=conflict.explain,
                    metadata_json={},
                )
            )
        self.db.commit()

    async def sync_and_detect(
        self,
        *,
        provider: str = "auto",
        window_days: int = 7,
        max_results: int = 100,
        buffer_minutes: int = 15,
    ) -> dict[str, Any]:
        events = await self.fetch_events(provider=provider, window_days=window_days, max_results=max_results)
        conflicts = self.detect_conflicts(events, buffer_minutes=buffer_minutes)
        self.upsert_events(events)
        self.replace_conflicts(conflicts)
        return {
            "events": [event.model_dump(mode="json") for event in events],
            "conflicts": [
                {
                    "event_a_id": conflict.event_a_id,
                    "event_b_id": conflict.event_b_id,
                    "conflict_type": conflict.conflict_type,
                    "conflict_minutes": conflict.conflict_minutes,
                    "explain": conflict.explain,
                }
                for conflict in conflicts
            ],
            "event_count": len(events),
            "conflict_count": len(conflicts),
        }
