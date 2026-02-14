"""Deterministic mail labeling rules engine with onboarding preferences."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from email.utils import parseaddr
import re
import uuid
from typing import Any, Optional

from sqlalchemy.orm import Session

from app.models.calendar_event_snapshot import CalendarEventSnapshot
from app.models.labeling_preference import LabelingPreference
from app.models.triaged_email import TriagedEmail
from app.agents.aaliyah.core.ingestion.email_ingestor import NormalizedEmailMessage
from app.agents.aaliyah.core.triage_service import TriageResult

ALLOWED_LABELS = (
    "Urgent",
    "Newsletter",
    "Meeting",
    "FYI",
    "Awaiting Reply",
    "High Priority",
    "Actioned",
)

DEFAULT_LABELS = [
    "Urgent",
    "Newsletter",
    "Meeting",
    "FYI",
    "Awaiting Reply",
    "High Priority",
    "Actioned",
]

DEFAULT_KEYWORD_RULES: dict[str, list[str]] = {
    "Urgent": ["urgent", "asap", "immediately", "deadline", "by eod", "escalate"],
    "Newsletter": ["unsubscribe", "newsletter", "digest", "promo", "promotion"],
    "Meeting": ["meeting", "calendar", "availability", "reschedule", "invite"],
    "High Priority": ["priority", "critical", "blocker", "production"],
}


def _normalize_sender(sender: Optional[str]) -> tuple[str, str]:
    _, address = parseaddr(sender or "")
    normalized = address.strip().lower()
    domain = normalized.split("@", 1)[1] if "@" in normalized else ""
    return normalized, domain


def _normalize_domain(value: str) -> str:
    domain = value.strip().lower()
    if domain.startswith("@"):
        domain = domain[1:]
    return domain


def _to_list_of_str(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    out: list[str] = []
    for item in value:
        text = str(item).strip()
        if text:
            out.append(text)
    return out


def _safe_overrides(value: Any) -> dict[str, Any]:
    if not isinstance(value, dict):
        return {"message": {}, "thread": {}}
    message = value.get("message")
    thread = value.get("thread")
    out = {
        "message": dict(message) if isinstance(message, dict) else {},
        "thread": dict(thread) if isinstance(thread, dict) else {},
    }
    return out


def _safe_keyword_rules(value: Any) -> dict[str, list[str]]:
    if not isinstance(value, dict):
        return dict(DEFAULT_KEYWORD_RULES)
    rules: dict[str, list[str]] = {}
    for label, keywords in value.items():
        label_name = str(label).strip()
        if label_name not in ALLOWED_LABELS:
            continue
        rules[label_name] = [k.strip().lower() for k in _to_list_of_str(keywords) if k.strip()]
    for label, keywords in DEFAULT_KEYWORD_RULES.items():
        rules.setdefault(label, keywords)
    return rules


@dataclass(frozen=True)
class LabelDecision:
    labels: list[str]
    reasons: dict[str, str]
    override_applied: bool
    skip_auto: bool


from app.services.cache import RedisCache

# ... imports ...

class LabelingRulesEngine:
    def __init__(self, db: Session, workspace_id: str):
        self.db = db
        self.workspace_id = workspace_id
        self.cache = RedisCache("label_rules")

    def get_or_create_preferences(self) -> LabelingPreference:
        row = (
            self.db.query(LabelingPreference)
            .filter(LabelingPreference.workspace_id == self.workspace_id)
            .first()
        )
        if row:
            return row

        row = LabelingPreference(
            id=str(uuid.uuid4()),
            workspace_id=self.workspace_id,
            enabled_labels=list(DEFAULT_LABELS),
            vip_senders=[],
            internal_domains=[],
            keyword_rules=dict(DEFAULT_KEYWORD_RULES),
            overrides_json={"message": {}, "thread": {}},
            auto_label_enabled=True,
            auto_sync_interval_seconds=120,
        )
        self.db.add(row)
        self.db.commit()
        self.db.refresh(row)
        return row

    def update_preferences(
        self,
        *,
        enabled_labels: Optional[list[str]] = None,
        vip_senders: Optional[list[str]] = None,
        internal_domains: Optional[list[str]] = None,
        keyword_rules: Optional[dict[str, list[str]]] = None,
        auto_label_enabled: Optional[bool] = None,
        auto_sync_interval_seconds: Optional[int] = None,
    ) -> LabelingPreference:
        row = self.get_or_create_preferences()

        if enabled_labels is not None:
            normalized = [label for label in enabled_labels if label in ALLOWED_LABELS]
            row.enabled_labels = normalized or list(DEFAULT_LABELS)
        if vip_senders is not None:
            normalized_senders: list[str] = []
            for sender in vip_senders:
                email_value, _ = _normalize_sender(sender)
                if email_value:
                    normalized_senders.append(email_value)
            row.vip_senders = sorted(set(normalized_senders))
        if internal_domains is not None:
            row.internal_domains = sorted(set([_normalize_domain(value) for value in internal_domains if _normalize_domain(value)]))
        if keyword_rules is not None:
            row.keyword_rules = _safe_keyword_rules(keyword_rules)
        if auto_label_enabled is not None:
            row.auto_label_enabled = bool(auto_label_enabled)
        if auto_sync_interval_seconds is not None:
            row.auto_sync_interval_seconds = max(120, min(int(auto_sync_interval_seconds), 900))

        self.db.commit()
        self.db.refresh(row)
        
        # Invalidate cache
        self.cache.delete(self.workspace_id)
        
        return row

    def get_preferences_payload(self) -> dict[str, Any]:
        # Try Cache
        cached = self.cache.get_json(self.workspace_id)
        if cached:
            return cached

        row = self.get_or_create_preferences()
        payload = {
            "enabled_labels": [label for label in _to_list_of_str(row.enabled_labels) if label in ALLOWED_LABELS],
            "vip_senders": _to_list_of_str(row.vip_senders),
            "internal_domains": _to_list_of_str(row.internal_domains),
            "keyword_rules": _safe_keyword_rules(row.keyword_rules),
            "auto_label_enabled": bool(row.auto_label_enabled),
            "auto_sync_interval_seconds": int(row.auto_sync_interval_seconds or 120),
            "overrides": _safe_overrides(row.overrides_json),
        }
        
        # Write Cache (5 minutes)
        self.cache.set_json(self.workspace_id, payload, ttl_seconds=300)
        return payload

    def set_override(
        self,
        *,
        scope: str,
        target_id: str,
        disable_auto: bool,
        labels: Optional[list[str]] = None,
        mode: str = "replace",
    ) -> dict[str, Any]:
        normalized_scope = scope.lower().strip()
        if normalized_scope not in {"message", "thread"}:
            raise ValueError("scope must be 'message' or 'thread'")
        normalized_target = str(target_id or "").strip()
        if not normalized_target or len(normalized_target) > 256:
            raise ValueError("target_id is required")
        normalized_mode = mode.lower().strip()
        if normalized_mode not in {"replace", "add"}:
            raise ValueError("mode must be 'replace' or 'add'")

        row = self.get_or_create_preferences()
        overrides = _safe_overrides(row.overrides_json)
        labels_list = [label for label in (labels or []) if label in ALLOWED_LABELS]
        payload = {
            "disable_auto": bool(disable_auto),
            "labels": labels_list,
            "mode": normalized_mode,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        overrides[normalized_scope][normalized_target] = payload
        row.overrides_json = overrides
        self.db.commit()
        self.db.refresh(row)
        
        # Invalidate Cache
        self.cache.delete(self.workspace_id)
        
        return payload

    def list_recent_thread_history(
        self,
        *,
        thread_id: Optional[str],
        sender: Optional[str],
        limit: int = 12,
    ) -> list[TriagedEmail]:
        query = self.db.query(TriagedEmail).filter(TriagedEmail.workspace_id == self.workspace_id)
        if thread_id:
            query = query.filter(TriagedEmail.thread_id == thread_id)
        elif sender:
            query = query.filter(TriagedEmail.sender == sender)
        else:
            return []
        return query.order_by(TriagedEmail.updated_at.desc()).limit(max(1, min(limit, 100))).all()

    def list_upcoming_calendar_events(self, *, days_ahead: int = 7, limit: int = 200) -> list[CalendarEventSnapshot]:
        now = datetime.utcnow()
        upper = now + timedelta(days=max(1, min(days_ahead, 30)))
        return (
            self.db.query(CalendarEventSnapshot)
            .filter(
                CalendarEventSnapshot.workspace_id == self.workspace_id,
                CalendarEventSnapshot.start_at >= now,
                CalendarEventSnapshot.start_at <= upper,
                CalendarEventSnapshot.is_cancelled.is_(False),
            )
            .order_by(CalendarEventSnapshot.start_at.asc())
            .limit(max(1, min(limit, 500)))
            .all()
        )

    def _find_override(
        self,
        *,
        overrides: dict[str, Any],
        message_id: str,
        thread_id: Optional[str],
    ) -> Optional[dict[str, Any]]:
        message_rules = overrides.get("message") if isinstance(overrides.get("message"), dict) else {}
        thread_rules = overrides.get("thread") if isinstance(overrides.get("thread"), dict) else {}
        if message_id in message_rules and isinstance(message_rules.get(message_id), dict):
            return message_rules[message_id]
        if thread_id and thread_id in thread_rules and isinstance(thread_rules.get(thread_id), dict):
            return thread_rules[thread_id]
        return None

    def _calendar_association(
        self,
        *,
        subject: str,
        sender_email: str,
        events: list[CalendarEventSnapshot],
    ) -> bool:
        if not events:
            return False
        subject_tokens = {token for token in re.split(r"[^a-z0-9]+", subject.lower()) if len(token) >= 4}
        for event in events:
            title = str(event.title or "").lower()
            organizer = str(event.organizer or "").lower()
            if sender_email and organizer and sender_email in organizer:
                return True
            if subject_tokens and any(token in title for token in subject_tokens):
                return True
        return False

    def decide_labels(
        self,
        *,
        message: NormalizedEmailMessage,
        triage: TriageResult,
        history: list[TriagedEmail],
        upcoming_events: list[CalendarEventSnapshot],
    ) -> LabelDecision:
        preferences = self.get_preferences_payload()
        enabled_set = set(preferences["enabled_labels"])
        if not preferences["auto_label_enabled"]:
            return LabelDecision(labels=[], reasons={}, override_applied=False, skip_auto=True)

        sender_email, sender_domain = _normalize_sender(message.metadata.sender)
        subject = str(message.metadata.subject or "")
        snippet = str(message.content or "")
        text_blob = f"{subject}\n{snippet}".lower()

        labels: list[str] = []
        reasons: dict[str, str] = {}

        def add_label(label_name: str, reason: str) -> None:
            if label_name not in enabled_set:
                return
            if label_name not in labels:
                labels.append(label_name)
            reasons[label_name] = reason

        add_label(
            triage.category,
            triage.reasoning or f"Classified as {triage.category} by Smart Triage Agent.",
        )

        if triage.priority == "High":
            add_label("High Priority", "Fast triage marked this message as high priority.")

        keyword_rules = preferences["keyword_rules"]
        for label_name, terms in keyword_rules.items():
            if label_name not in enabled_set:
                continue
            if any(term in text_blob for term in terms):
                add_label(label_name, f"Matched keyword rule for {label_name}.")

        vip_senders = set([str(x).lower() for x in preferences["vip_senders"]])
        if sender_email and sender_email in vip_senders:
            add_label("High Priority", "Sender is configured as VIP.")

        internal_domains = set([_normalize_domain(x) for x in preferences["internal_domains"]])
        if sender_domain and sender_domain in internal_domains:
            add_label("FYI", "Sender domain is marked as internal.")

        has_calendar_link = self._calendar_association(
            subject=subject,
            sender_email=sender_email,
            events=upcoming_events,
        )
        if has_calendar_link:
            add_label("Meeting", "Related upcoming calendar event detected.")

        if message.is_read:
            add_label("Actioned", "Message is marked as read.")
        else:
            add_label("Awaiting Reply", "Message is unread and likely awaiting response.")

        if history:
            unresolved = [row for row in history if not bool(row.is_read)]
            if len(unresolved) >= 2:
                add_label("High Priority", "Multiple unresolved messages found in this conversation history.")

        overrides = _safe_overrides(preferences["overrides"])
        override = self._find_override(
            overrides=overrides,
            message_id=message.id,
            thread_id=message.metadata.thread_id,
        )
        if not override:
            return LabelDecision(labels=labels, reasons=reasons, override_applied=False, skip_auto=False)

        if bool(override.get("disable_auto")):
            return LabelDecision(labels=[], reasons={"override": "User override disabled auto-labeling."}, override_applied=True, skip_auto=True)

        override_labels = [label for label in _to_list_of_str(override.get("labels")) if label in enabled_set]
        mode = str(override.get("mode") or "replace").lower().strip()
        if override_labels:
            if mode == "add":
                for label in override_labels:
                    add_label(label, "User override added this label.")
            else:
                labels = list(dict.fromkeys(override_labels))
                reasons = {label: "User override replaced labels for this message/thread." for label in labels}
        return LabelDecision(labels=labels, reasons=reasons, override_applied=True, skip_auto=False)
