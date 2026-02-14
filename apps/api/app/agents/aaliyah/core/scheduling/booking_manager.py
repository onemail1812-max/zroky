
import uuid
import random
import string
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models.booking_link import BookingLink
from app.agents.aaliyah.core.scheduling.availability_engine import TimeSlot

def generate_short_slug(length=8):
    chars = string.ascii_letters + string.digits
    return ''.join(random.choice(chars) for _ in range(length))

class BookingManager:
    def __init__(self, db: Session, workspace_id: str):
        self.db = db
        self.workspace_id = workspace_id

    def create_link(
        self, 
        slots: List[TimeSlot], 
        recipient_email: str = None, 
        subject: str = None,
        expires_days: int = 7
    ) -> BookingLink:
        """Create a new ephemeral booking link."""
        
        # Convert TimeSlot objects to JSON-serializable dicts
        slots_json = [
            {
                "start": s.start.isoformat(),
                "end": s.end.isoformat(),
                "duration": s.duration_minutes
            }
            for s in slots
        ]
        
        # Create unique slug
        max_retries = 5
        slug = generate_short_slug()
        for _ in range(max_retries):
            existing = self.db.query(BookingLink).filter(BookingLink.slug == slug).first()
            if not existing:
                break
            slug = generate_short_slug()
            
        expires_at = datetime.now(timezone.utc) + timedelta(days=expires_days)
        
        link = BookingLink(
            workspace_id=self.workspace_id,
            slug=slug,
            proposed_slots=slots_json,
            recipient_email=recipient_email,
            subject=subject,
            status="active",
            expires_at=expires_at
        )
        
        self.db.add(link)
        self.db.commit()
        return link

    def get_link_by_slug(self, slug: str) -> Optional[BookingLink]:
        return self.db.query(BookingLink).filter(BookingLink.slug == slug).first()

    def confirm_booking(self, slug: str, selected_slot: Dict[str, Any]) -> BookingLink:
        """
        Mark a slot as booked.
        Validity checks:
        - Link is active
        - Slot is in proposed_slots
        - Not expired
        """
        link = self.get_link_by_slug(slug)
        if not link:
            raise ValueError("Invalid booking link")
            
        if link.status != "active":
             raise ValueError(f"Link is {link.status}")

        if link.expires_at and link.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
             link.status = "expired"
             self.db.commit()
             raise ValueError("Link expired")

        # Verify slot match (simple exact match check)
        # In prod we might need fuzzy match or handle TZ diffs carefully
        is_valid_slot = False
        proposed = link.proposed_slots or []
        for p in proposed:
            if p.get("start") == selected_slot.get("start") and p.get("end") == selected_slot.get("end"):
                is_valid_slot = True
                break
        
        if not is_valid_slot:
            raise ValueError("Selected slot was not offered in this link")

        link.booked_slot = selected_slot
        link.status = "booked"
        self.db.commit()
        
        return link
