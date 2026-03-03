import sys
import traceback
import os
import asyncio

print('Creating fresh SQLite DB...')
if os.path.exists("test_pg.db"):
    os.remove("test_pg.db")

os.environ["DATABASE_URL"] = "sqlite:///./test_pg.db"

print('Running Alembic upgrade head...')
from alembic.config import Config
from alembic import command
alembic_cfg = Config("alembic.ini")
try:
    command.upgrade(alembic_cfg, "head")
    print('Alembic migration success!')
except Exception as e:
    print('Alembic migration FAILED!')
    traceback.print_exc()
    sys.exit(1)

print('Starting API test...')
try:
    import app.main
    from fastapi.testclient import TestClient
    from app.security import get_current_user
    
    # Override auth to pretend we are logged in
    def mock_get_current_user():
        return {
            "sub": "user_123",
            "email": "test@example.com",
            "workspace_id": "ws_123"
        }
    
    app.main.app.dependency_overrides[get_current_user] = mock_get_current_user

    with TestClient(app.main.app) as client:
        print('Created TestClient')

        endpoints = [
            "/assist/history",
            "/health/providers",
            "/aaliyah/status",
            "/aaliyah/counts",
        ]
        
        for ep in endpoints:
            print(f'\n--- Testing {ep} ---')
            response = client.get(ep, headers={"x-workspace-id": "ws_123"})
            print(f'STATUS: {response.status_code}')
            if response.status_code != 200:
                print(f'RESPONSE: {response.text}')
                
except Exception as e:
    import traceback
    traceback.print_exc()

print('Finished script')
