"""Health check integration test — requires a running server."""
import pytest
import requests


@pytest.mark.skipif(True, reason="Integration test: requires running server at localhost:8000")
def test_health_endpoint():
    response = requests.get("http://localhost:8000/health", timeout=5)
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
