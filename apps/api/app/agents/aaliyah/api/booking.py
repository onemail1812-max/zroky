
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from pydantic import BaseModel

from app.database import get_db
from app.models.booking_link import BookingLink
from app.agents.aaliyah.core.scheduling.booking_manager import BookingManager

router = APIRouter(prefix="/booking", tags=["booking"])

class BookingLinkResponse(BaseModel):
    slug: str
    recipient_email: Optional[str]
    subject: Optional[str]
    proposed_slots: list[Dict[str, Any]]
    status: str
    expires_at: Optional[datetime]

class ConfirmBookingRequest(BaseModel):
    selected_slot: Dict[str, Any]
    booker_email: Optional[str] # If they confirm their email
    booker_name: Optional[str]

@router.get("/{slug}", response_model=BookingLinkResponse)
def get_booking_page(slug: str, db: Session = Depends(get_db)):
    """Public endpoint to view booking options."""
    link = db.query(BookingLink).filter(BookingLink.slug == slug).first()
    if not link:
        raise HTTPException(status_code=404, detail="Booking link not found")
    
    if link.status != "active":
        raise HTTPException(status_code=410, detail=f"Booking link is {link.status}")

    if link.expires_at and link.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        link.status = "expired"
        db.commit()
        raise HTTPException(status_code=410, detail="Booking link expired")

    return BookingLinkResponse(
        slug=link.slug,
        recipient_email=link.recipient_email,
        subject=link.subject,
        proposed_slots=link.proposed_slots,
        status=link.status,
        expires_at=link.expires_at
    )

@router.post("/{slug}/confirm")
def confirm_booking(slug: str, payload: ConfirmBookingRequest, db: Session = Depends(get_db)):
    """Public endpoint to confirm a slot."""
    link = db.query(BookingLink).filter(BookingLink.slug == slug).first()
    if not link:
        raise HTTPException(status_code=404, detail="Booking link not found")

    # Manager logic handles validation
    manager = BookingManager(db, link.workspace_id)
    try:
        updated_link = manager.confirm_booking(slug, payload.selected_slot)
        # TODO: Trigger calendar invite creation here!
        # For Sprint 5 we just mark it as booked.
        # Ideally we'd call `CalendarSync.create_event(...)`
        return {"status": "success", "message": "Slot confirmed", "booked_slot": updated_link.booked_slot}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
