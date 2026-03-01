import json
import traceback

try:
    import app.main
    from app.database import SessionLocal
    from app.models.user import User
    from app.models.workspace import Workspace
    from app.models.membership import Membership, MembershipRole
    import uuid

    db = SessionLocal()
    u = User(id='user_123', email='test@example.com', hashed_password='foo')
    db.add(u)
    w = Workspace(id='ws_123', name='WS', slug='ws', owner_id='user_123')
    db.add(w)
    m = Membership(id='m_123', workspace_id='ws_123', user_id='user_123', role=MembershipRole.ADMIN)
    db.add(m)
    db.commit()
    db.close()

    from fastapi.testclient import TestClient
    from app.security import get_current_user
    
    def mock_get_current_user():
        return {"sub": "user_123", "email": "test@example.com", "workspace_id": "ws_123"}
    
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
                import traceback
                results[ep] = {"status_code": 500, "traceback": traceback.format_exc()}

    with open("test_results2.json", "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)

except Exception as e:
    with open("test_err.txt", "w") as f:
        f.write(traceback.format_exc())
