
from sqlalchemy import Column, String, DateTime, Text, Boolean
from app.database import Base
from app.db_types import SafeJSON
from datetime import datetime
import uuid

class BookingLink(Base):
    __tablename__ = "booking_links"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    slug = Column(String, unique=True, index=True, nullable=False)
    workspace_id = Column(String, index=True, nullable=False)
    
    # JSON list of slots: [{"start": "...", "end": "..."}]
    proposed_slots = Column(SafeJSON(), nullable=False)
    
    # Who is this for?
    recipient_email = Column(String, nullable=True)
    subject = Column(String, nullable=True) # "Meeting with Steve"
    
    status = Column(String, default="active") # active, booked, expired
    booked_slot = Column(SafeJSON(), nullable=True) # The slot that was picked
    
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)
