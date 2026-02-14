
import asyncio
from unittest.mock import MagicMock, AsyncMock, patch
from datetime import datetime, timezone, timedelta
from app.services.aaliyah.drafting import DraftingAgent, DraftResponse
from app.models.triaged_email import TriagedEmail
from app.models.workspace import Workspace
from app.services.aaliyah.scheduling.availability_engine import TimeSlot
from app.database import SessionLocal

import pytest

@pytest.mark.asyncio
async def test_drafting_with_availability():
    db = MagicMock()
    workspace_id = "ws_test"
    
    # Mock Settings
    ws = Workspace(id=workspace_id, settings_json={"aaliyah": {"signature": "- Aaliyah"}})
    db.query.return_value.filter.return_value.first.return_value = ws
    
    # Mock Templates
    db.query.return_value.filter.return_value.all.return_value = []

    # Mock Labels
    mock_lre = MagicMock()
    mock_lre.list_recent_thread_history.return_value = []
    
    # Mock Availability
    mock_availability = MagicMock()
    # Return 2 fake slots
    now = datetime.now(timezone.utc)
    slot1 = TimeSlot(
        start=now + timedelta(days=1, hours=2), 
        end=now + timedelta(days=1, hours=3), 
        duration_minutes=60
    )
    slot2 = TimeSlot(
        start=now + timedelta(days=1, hours=4), 
        end=now + timedelta(days=1, hours=5), 
        duration_minutes=60
    )
    mock_availability.find_slots.return_value = [slot1, slot2]

    # Mock KG
    mock_kg = MagicMock()
    mock_kg.summarize_for_prompt.return_value = "User is important."

    # Mock Brain to return placeholder
    mock_brain = MagicMock()
    mock_brain.think = AsyncMock()
    mock_brain.think.return_value = MagicMock(
        content='{"action": "reply", "subject": "Re: Meeting", "body": "I am free at 2pm. [BOOKING_LINK]", "rationale": "Scheduling"}'
    )

    with patch("app.services.aaliyah.drafting.LabelingRulesEngine", return_value=mock_lre), \
         patch("app.services.aaliyah.drafting.KnowledgeGraphService", return_value=mock_kg), \
         patch("app.services.aaliyah.drafting.AvailabilityEngine", return_value=mock_availability), \
         patch("app.services.aaliyah.drafting.Brain", return_value=mock_brain), \
         patch("app.services.aaliyah.drafting.BookingManager") as MockBookingManager:
         
        # Mock BookingManager instance
        mock_bm_instance = MockBookingManager.return_value
        mock_link = MagicMock()
        mock_link.slug = "slug_123"
        mock_bm_instance.create_link.return_value = mock_link

        agent = DraftingAgent(db, workspace_id)

        # Manually force the mocks we created since "patch" only mocks the class constructor
        agent.availability = mock_availability
        agent.brain = mock_brain
        agent.kg = mock_kg # ensure consistency

        # Case 1: Scheduling Intent
        email = TriagedEmail(
            id="1", 
            sender="bob@example.com", 
            subject="Meeting?", 
            snippet="Can we meet?", 
            category="Meeting", # Trigger
            priority="High",
            metadata_json={"labels": ["Meeting"]}
        )
        
        draft = await agent.generate_draft(email)
        
        # Verify find_slots called
        mock_availability.find_slots.assert_called_once()
        mock_bm_instance.create_link.assert_called_once()
        
        # Verify prompt contained slots
        args, kwargs = mock_brain.think.call_args
        prompt = kwargs.get("prompt")
        
        if "My Available Slots" in prompt:
            print("✅ SUCCESS: Availability slots injected into prompt.")
        else:
             print("❌ FAILURE: Availability slots NOT found in prompt.")

        if "http://localhost:3002/booking/slug_123" in draft.body:
             print("✅ SUCCESS: [BOOKING_LINK] placeholder replaced with real URL.")
        else:
             print("❌ FAILURE: Placeholder NOT replaced.")
             print("Body:", draft.body)

if __name__ == "__main__":
    asyncio.run(test_drafting_with_availability())
