import json
import traceback
import sys

print('Starting API test to test_results.json')
try:
    import app.main
    from fastapi.testclient import TestClient
    from app.security import get_current_user
    
    # Override auth
    def mock_get_current_user():
        return {
            "sub": "user_123",
            "email": "test@example.com",
            "workspace_id": "ws_123"
        }
    
    app.main.app.dependency_overrides[get_current_user] = mock_get_current_user

    results = {}
    with TestClient(app.main.app) as client:
        endpoints = [
            "/assist/history",
            "/health/providers",
            "/aaliyah/status",
            "/aaliyah/counts",
        ]
        
        for ep in endpoints:
            try:
                response = client.get(ep, headers={"x-workspace-id": "ws_123"})
                results[ep] = {
                    "status_code": response.status_code,
                    "response": response.json() if response.status_code == 200 else response.text
                }
            except Exception as e:
                results[ep] = {
                    "status_code": 500,
                    "exception": str(e),
                    "traceback": traceback.format_exc()
                }

    with open("test_results.json", "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
                
except Exception as e:
    with open("test_err.txt", "w", encoding="utf-8") as f:
        f.write(traceback.format_exc())

print('Finished script')
