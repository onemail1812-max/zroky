"""Calendar API — manages events, availability, and booking links."""
from __future__ import annotations

import logging
from typing import Optional, List
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_context, CurrentContext
from app.services.integrations.token_store import get_valid_token

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/calendar", tags=["calendar"])
from app.services.cache import cached_response, invalidate_cache
from app.core.limiter import limiter


# ── Request / Response Models ────────────────────────────────────────

class CreateEventRequest(BaseModel):
    summary: str
    start: str  # ISO datetime
    end: str  # ISO datetime
    attendees: Optional[List[str]] = None
    description: str = ""
    location: str = ""
    conference: bool = False  # Auto-create Google Meet / Teams link


class BookingLinkRequest(BaseModel):
    recipient_email: Optional[str] = None
    subject: Optional[str] = None
    duration_minutes: int = 30
    days_ahead: int = 7
    n_slots: int = 5


class ConfirmBookingRequest(BaseModel):
    start: str
    end: str


# ── Endpoints ────────────────────────────────────────────────────────

@router.get("/events")
@limiter.limit("60/minute")
@cached_response(ttl_seconds=60, prefix="calendar_events")
async def list_events(
    request: Request,
    start: Optional[str] = Query(None, description="ISO datetime start range"),
    end: Optional[str] = Query(None, description="ISO datetime end range"),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    context: CurrentContext = Depends(get_current_context),
):
    """List calendar events for the authenticated user."""
    time_min = datetime.fromisoformat(start) if start else datetime.now(timezone.utc)
    time_max = datetime.fromisoformat(end) if end else time_min + timedelta(days=7)

    events = []

    # Try Google Calendar
    g_token = get_valid_token(db, context.workspace_id, "google")
    if g_token:
        try:
            from app.services.integrations.google_calendar import GoogleCalendarService
            gcal = GoogleCalendarService(g_token)
            g_events = await gcal.list_events(time_min=time_min, time_max=time_max, max_results=limit)
            for e in g_events:
                events.append({
                    "id": e.get("id"),
                    "provider": "google",
                    "summary": e.get("summary", "(No Title)"),
                    "start": e.get("start", {}).get("dateTime") or e.get("start", {}).get("date"),
                    "end": e.get("end", {}).get("dateTime") or e.get("end", {}).get("date"),
                    "location": e.get("location", ""),
                    "attendees": [a.get("email") for a in e.get("attendees", [])],
                    "html_link": e.get("htmlLink", ""),
                    "status": e.get("status", "confirmed"),
                    "conference_link": (e.get("conferenceData", {}) or {}).get("entryPoints", [{}])[0].get("uri") if e.get("conferenceData") else None,
                })
        except Exception as ex:
            logger.warning(f"Google Calendar fetch failed: {ex}")

    # Try Microsoft Calendar
    ms_token = get_valid_token(db, context.workspace_id, "microsoft")
    if ms_token:
        try:
            from app.services.integrations.microsoft_calendar import MicrosoftCalendarService
            mscal = MicrosoftCalendarService(ms_token)
            ms_events = await mscal.list_events(time_min=time_min, time_max=time_max, max_results=limit)
            for e in ms_events:
                events.append({
                    "id": e.get("id"),
                    "provider": "microsoft",
                    "summary": e.get("subject", "(No Title)"),
                    "start": e.get("start", {}).get("dateTime"),
                    "end": e.get("end", {}).get("dateTime"),
                    "location": (e.get("location", {}) or {}).get("displayName", ""),
                    "attendees": [a.get("emailAddress", {}).get("address") for a in e.get("attendees", [])],
                    "html_link": e.get("webLink", ""),
                    "status": "confirmed",
                    "conference_link": (e.get("onlineMeeting", {}) or {}).get("joinUrl"),
                })
        except Exception as ex:
            logger.warning(f"Microsoft Calendar fetch failed: {ex}")

    if not events and not g_token and not ms_token:
        raise HTTPException(status_code=401, detail="No calendar integration connected.")

    events.sort(key=lambda x: x.get("start") or "", reverse=False)
    return {"events": events, "count": len(events)}


@router.get("/availability")
@limiter.limit("20/minute")
@cached_response(ttl_seconds=120, prefix="calendar_availability")
async def get_availability(
    request: Request,
    days_ahead: int = Query(5, ge=1, le=30),
    duration: int = Query(30, ge=15, le=240, description="Slot duration in minutes"),
    n: int = Query(5, ge=1, le=20, description="Number of slots to propose"),
    db: Session = Depends(get_db),
    context: CurrentContext = Depends(get_current_context),
):
    """Get free time slots for scheduling.
    
    Uses the existing AvailabilityEngine or falls back to Google Calendar API.
    """
    # Try using the DB-backed AvailabilityEngine first
    try:
        from app.agents.aaliyah.core.scheduling.availability_engine import AvailabilityEngine
        engine = AvailabilityEngine(db, context.workspace_id)
        slots = engine.propose_n_slots(
            search_start_dt=datetime.now(timezone.utc),
            n=n,
            duration_minutes=duration,
            days_ahead=days_ahead,
        )
        return {
            "slots": [
                {"start": s.start.isoformat(), "end": s.end.isoformat(), "duration_minutes": s.duration_minutes}
                for s in slots
            ],
            "source": "availability_engine",
        }
    except Exception as e:
        logger.warning(f"AvailabilityEngine failed, trying Google Calendar API: {e}")

    # Fallback: use Google Calendar API directly
    g_token = get_valid_token(db, context.workspace_id, "google")
    if g_token:
        try:
            from app.services.integrations.google_calendar import GoogleCalendarService
            gcal = GoogleCalendarService(g_token)
            slots = await gcal.find_free_slots(
                days_ahead=days_ahead,
                slot_duration_minutes=duration,
            )
            return {"slots": slots[:n], "source": "google_calendar_api"}
        except Exception as ex:
            logger.error(f"Google Calendar availability check failed: {ex}")

    raise HTTPException(status_code=500, detail="Could not determine availability. Check calendar integration.")


@router.post("/events")
@limiter.limit("20/minute")
async def create_event(
    request: Request,
    req: CreateEventRequest,
    db: Session = Depends(get_db),
    context: CurrentContext = Depends(get_current_context),
):
    """Create a new calendar event via Google or Microsoft."""
    start_dt = datetime.fromisoformat(req.start)
    end_dt = datetime.fromisoformat(req.end)

    # Try Google Calendar
    g_token = get_valid_token(db, context.workspace_id, "google")
    if g_token:
        try:
            from app.services.integrations.google_calendar import GoogleCalendarService
            gcal = GoogleCalendarService(g_token)
            event = await gcal.create_event(
                summary=req.summary,
                start=start_dt,
                end=end_dt,
                attendees=req.attendees,
                description=req.description,
                location=req.location,
                conference=req.conference,
            )
            return {
                "status": "created",
                "provider": "google",
                "event_id": event.get("id"),
                "html_link": event.get("htmlLink"),
                "conference_link": (event.get("conferenceData", {}) or {}).get("entryPoints", [{}])[0].get("uri") if event.get("conferenceData") else None,
            }
        except Exception as ex:
            logger.error(f"Google Calendar event creation failed: {ex}")

    # Try Microsoft
    ms_token = get_valid_token(db, context.workspace_id, "microsoft")
    if ms_token:
        try:
            from app.services.integrations.microsoft_calendar import MicrosoftCalendarService
            mscal = MicrosoftCalendarService(ms_token)
            event = await mscal.create_event(
                summary=req.summary,
                start=start_dt,
                end=end_dt,
                attendees=req.attendees,
                description=req.description,
                location=req.location,
                online_meeting=req.conference,
            )
            return {
                "status": "created",
                "provider": "microsoft",
                "event_id": event.get("id"),
                "html_link": event.get("webLink"),
                "conference_link": (event.get("onlineMeeting", {}) or {}).get("joinUrl"),
            }
        except Exception as ex:
            logger.error(f"Microsoft Calendar event creation failed: {ex}")

    raise HTTPException(status_code=500, detail="Could not create event. Check calendar integration.")


@router.post("/booking-links")
@limiter.limit("20/minute")
async def create_booking_link(
    request: Request,
    req: BookingLinkRequest,
    db: Session = Depends(get_db),
    context: CurrentContext = Depends(get_current_context),
):
    """Generate a shareable booking link with proposed time slots."""
    try:
        from app.agents.aaliyah.core.scheduling.availability_engine import AvailabilityEngine
        from app.agents.aaliyah.core.scheduling.booking_manager import BookingManager

        engine = AvailabilityEngine(db, context.workspace_id)
        slots = engine.propose_n_slots(
            search_start_dt=datetime.now(timezone.utc),
            n=req.n_slots,
            duration_minutes=req.duration_minutes,
            days_ahead=req.days_ahead,
        )

        manager = BookingManager(db, context.workspace_id)
        link = manager.create_link(
            slots=slots,
            recipient_email=req.recipient_email,
            subject=req.subject,
        )

        return {
            "status": "created",
            "slug": link.slug,
            "url": f"/book/{link.slug}",
            "slots": link.proposed_slots,
            "expires_at": link.expires_at.isoformat() if link.expires_at else None,
        }
    except Exception as e:
        logger.error(f"Booking link creation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/booking/{slug}")
async def get_booking_link(
    slug: str,
    db: Session = Depends(get_db),
):
    """Public endpoint — get booking link details for a recipient."""
    from app.models.booking_link import BookingLink as BL
    link = db.query(BL).filter(BL.slug == slug).first()
    if not link:
        raise HTTPException(status_code=404, detail="Booking link not found")

    return {
        "slug": link.slug,
        "status": link.status,
        "subject": link.subject,
        "slots": link.proposed_slots,
        "booked_slot": link.booked_slot,
        "expires_at": link.expires_at.isoformat() if link.expires_at else None,
    }


@router.post("/booking/{slug}/confirm")
@limiter.limit("10/minute")
async def confirm_booking(
    request: Request,
    slug: str,
    req: ConfirmBookingRequest,
    db: Session = Depends(get_db),
):
    """Public endpoint — confirm a booking by selecting a slot."""
    from app.models.booking_link import BookingLink as BL
    from app.agents.aaliyah.core.scheduling.booking_manager import BookingManager

    # Look up the booking link to get the workspace_id
    link_row = db.query(BL).filter(BL.slug == slug).first()
    if not link_row:
        raise HTTPException(status_code=404, detail="Booking link not found")

    manager = BookingManager(db, link_row.workspace_id)

    try:
        link = manager.confirm_booking(slug, {"start": req.start, "end": req.end})

        # Auto-create calendar event using the workspace's connected calendar
        try:
            g_token = get_valid_token(db, link_row.workspace_id, "google")
            if g_token:
                from app.services.integrations.google_calendar import GoogleCalendarService
                gcal = GoogleCalendarService(g_token)
                await gcal.create_event(
                    summary=f"Meeting: {link_row.subject or 'Booked via Aaliyah'}",
                    start=datetime.fromisoformat(req.start),
                    end=datetime.fromisoformat(req.end),
                    attendees=[link_row.recipient_email] if link_row.recipient_email else [],
                    description=f"Booked via Aaliyah booking link.",
                )
            else:
                ms_token = get_valid_token(db, link_row.workspace_id, "microsoft")
                if ms_token:
                    from app.services.integrations.microsoft_calendar import MicrosoftCalendarService
                    mscal = MicrosoftCalendarService(ms_token)
                    await mscal.create_event(
                        summary=f"Meeting: {link_row.subject or 'Booked via Aaliyah'}",
                        start=datetime.fromisoformat(req.start),
                        end=datetime.fromisoformat(req.end),
                        attendees=[link_row.recipient_email] if link_row.recipient_email else [],
                        description=f"Booked via Aaliyah booking link.",
                    )
        except Exception as cal_err:
            logger.error(f"Auto-create calendar event failed for booking {slug}: {cal_err}")

        return {
            "status": "booked",
            "booked_slot": link.booked_slot,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
