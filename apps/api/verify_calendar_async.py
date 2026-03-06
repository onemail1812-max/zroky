import asyncio
import sys
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock

# Add app directory to sys.path
sys.path.append(str(Path("d:/Zroky/apps/api")))

from app.agents.aaliyah.core.tools.calendar_manager import CalendarManager

async def test_calendar_async():
    tool = CalendarManager()
    
    # Mock _resolve_client to return a mock client with async methods
    mock_client = MagicMock()
    mock_client.list_events = AsyncMock(return_value=[
        {"start_at": "2026-03-05T10:00:00Z", "end_at": "2026-03-05T11:00:00Z"}
    ])
    mock_client.create_event = AsyncMock(return_value={"id": "event_123"})
    
    tool._resolve_client = AsyncMock(return_value=("google", mock_client))
    
    # Test availability
    print("Testing availability (async)...")
    avail_data = {
        "action": "availability",
        "workspace_id": "test_ws",
        "duration_minutes": 30
    }
    result_avail = await tool.run(avail_data)
    print(f"Availability result keys: {list(result_avail.keys())}")
    assert "available_slots" in result_avail
    mock_client.list_events.assert_called_once()
    print("Availability test passed (await confirmed).")

    # Test scheduling
    print("\nTesting scheduling (async)...")
    schedule_data = {
        "action": "schedule",
        "workspace_id": "test_ws",
        "title": "Meeting",
        "start_at": "2026-03-05T14:00:00Z",
        "end_at": "2026-03-05T14:30:00Z"
    }
    result_schedule = await tool.run(schedule_data)
    print(f"Schedule result: {result_schedule}")
    assert result_schedule["status"] == "scheduled"
    mock_client.create_event.assert_called_once()
    print("Scheduling test passed (await confirmed).")

if __name__ == "__main__":
    asyncio.run(test_calendar_async())
