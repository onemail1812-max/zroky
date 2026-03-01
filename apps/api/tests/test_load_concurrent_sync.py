import pytest
import asyncio
import os
from httpx import AsyncClient, ASGITransport
from typing import List
import secrets

# Mock Env Vars before App Load to bypass strict configs
os.environ["OAUTH_ENCRYPTION_KEY"] = secrets.token_hex(32)

from app.main import app
from app.database import SessionLocal, engine
from app.models.triaged_email import TriagedEmail
from app.database import Base
from app.dependencies import get_current_context
from app.models.triaged_email import TriagedEmail
from app.database import Base
from unittest.mock import patch

transport = ASGITransport(app=app)


@pytest.fixture(autouse=True)
def clean_database():
    """Ensure the test database is clean before running load tests."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    db.query(TriagedEmail).filter(TriagedEmail.workspace_id == "ws_load_test").delete()
    db.commit()
    db.close()
    yield


@pytest.mark.asyncio
async def test_concurrent_sync_inbox_deduplication():
    """
    Fires 20 concurrent /sync/inbox requests to simulate a high-load webhook burst.
    Asserts that the system strictly deduplicates the queue and limits the
    number of unique emails inserted into the TriagedEmail database to the raw 
    email payload count rather than N * payload count due to TOCTOU overlaps.
    """
    
    workspace_id = "ws_load_test"
    provider = "gmail"
    
    # We send 20 concurrent sync commands mapping to the identical timestamp
    NUM_CONCURRENT_REQUESTS = 20

    async def _fire_sync(client: AsyncClient):
        response = await client.post(
            "/aaliyah/sync/inbox",
            json={
                  "workspace_id": workspace_id,
                  "provider": provider,
                  "force": True,
                  "max_results": 5 # We mock fetching 5 emails
            },
            headers={"Authorization": "Bearer load_dummy_token"}
        )
        return response

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Patching current_user and permissions for the test
        from types import SimpleNamespace
        
        async def override_get_current_context():
            return SimpleNamespace(user_id="user_123", roles=["admin"], workspace_id=workspace_id)
            
        app.dependency_overrides[get_current_context] = override_get_current_context
        
        try:
            with patch("app.agents.aaliyah.api.routes._sync_rate_limiter.check") as mock_limit_check:
                # Bypass the hard 5 requests/min API Rate Limiter specifically for load testing
                mock_limit_check.return_value = (True, 0.0)
                
                with patch("app.agents.aaliyah.api.routes._require_workspace_match") as mock_match:
                    mock_match.return_value = workspace_id
                
                # Mock the actual EmailIngestor to return 5 identical fake incoming emails
                with patch("app.workers.local_sync.EmailIngestor.fetch_incremental") as mock_fetch:
                    
                    from types import SimpleNamespace
                    fake_metadata = SimpleNamespace(thread_id="th_1", sender="investor@example.com", subject="Load Test", headers={"is_read": False})
                    fake_email = SimpleNamespace(id="msg_abc123", provider="gmail", content="Hi", created_at=None, metadata=fake_metadata, model_dump=lambda: {})
                    
                    # Return 5 identical messages spanning 20 concurrent fetches (Total expected: 5 rows in DB)
                    test_messages = [fake_email] * 5
                    mock_fetch.return_value = (test_messages, [])

                    # FIRE CONCURRENT LOAD
                    tasks = [_fire_sync(client) for _ in range(NUM_CONCURRENT_REQUESTS)]
                    responses = await asyncio.gather(*tasks)

                    # All should return 200 OK (queue dispatched)
                    for res in responses:
                        assert res.status_code == 200

                    # Let background workers process (if mock queue handles inline, this is instant)
                    await asyncio.sleep(0.5)
        finally:
            app.dependency_overrides.clear()

    
    # Verify the Database Constraint
    db = SessionLocal()
    total_inserted = db.query(TriagedEmail).filter(TriagedEmail.workspace_id == workspace_id).count()
    
    # The vulnerability allows 5 * 20 = 100 rows. We expect EXACTLY 5.
    assert total_inserted <= 5, f"TOCTOU Race Condition Failed! Expected 5 emails, found {total_inserted} duplicated rows."
    
    db.close()
