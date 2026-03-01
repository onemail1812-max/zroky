import pytest
import asyncio
import json
from httpx import AsyncClient, ASGITransport
from fastapi.testclient import TestClient
from unittest.mock import patch

from app.main import app
from app.agents.aaliyah.core.live_feed import event_bus, LiveEvent

transport = ASGITransport(app=app)


@pytest.fixture(autouse=True)
def mock_decode_live_token():
    with patch("app.agents.aaliyah.api.routes._decode_live_token") as mock_decode:
        mock_decode.return_value = {"workspace_id": "ws_live_test", "sub": "user_123"}
        yield mock_decode


def test_websocket_connection_initial_payload():
    """
    Test that a WebSocket client connects to '/aaliyah/live/ws',
    and quickly receives the initial connection message, 
    without deeply testing the async broadcast internally (which deadlocks TestClient).
    """
    client = TestClient(app)
    with client.websocket_connect("/aaliyah/live/ws?stream_token=dummy_token") as websocket:
        data = websocket.receive_json()
        assert data["type"] == "connected"
        assert "WebSocket connected" in data["message"]


def test_sse_stream_broadcast():
    """
    Test Server-Sent Events by overriding the event_bus subscription generator.
    This guarantees the stream naturally closes after the mock yields its items.
    """
    workspace_id = "ws_live_test"
    client = TestClient(app)

    async def mock_subscribe(ws_id, last_event_id=None):
        yield LiveEvent(
            workspace_id=ws_id,
            type="custom_sse_alert",
            message="Testing Async Stream",
            payload={"data": 987}
        )
        # By not yielding an infinite loop, the endpoint gracefully exits!

    with patch("app.agents.aaliyah.api.routes.event_bus.subscribe", side_effect=mock_subscribe):
        # httpx inside TestClient can stream safely if the backend generator terminates
        with client.stream("GET", "/aaliyah/live/stream", headers={"Authorization": "Bearer dummy_token"}) as response:
            assert response.status_code == 200
            
            lines = [line for line in response.iter_lines() if line]
            
            # Extract just the data segments
            data_lines = [line.replace("data: ", "") for line in lines if line.startswith("data:")]
            
            # 1. Immediate connection event encoded in the route before the event_bus
            initial = json.loads(data_lines[0])
            assert initial["type"] == "connected"
            
            # 2. Mocked bus event
            injected = json.loads(data_lines[1])
            assert injected["type"] == "custom_sse_alert"
            assert injected["message"] == "Testing Async Stream"
            assert injected["payload"]["data"] == 987
