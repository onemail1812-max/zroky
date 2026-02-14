import jwt
import requests
import datetime
import json
import os

# Default from .env.example or hardcoded fallback
SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret")
ALGORITHM = "HS256"

def create_debug_token():
    payload = {
        "sub": "user_test_001",
        "workspace_id": "ws_test_001",
        "exp": datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=1)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def run_checks():
    base_url = "http://localhost:8000"
    token = create_debug_token()
    headers = {"Authorization": f"Bearer {token}"}
    
    print(f"Using Token: {token[:10]}...")

    # 1. Health Check
    print("\n[1] Checking /health...")
    try:
        resp = requests.get(f"{base_url}/health", timeout=5)
        print(f"Status: {resp.status_code}")
        print(f"Response: {resp.json()}")
    except Exception as e:
        print(f"FAILED: {e}")

    # 2. Aaliyah Status (Requires Auth)
    print("\n[2] Checking /aaliyah/status...")
    try:
        resp = requests.get(f"{base_url}/aaliyah/status", headers=headers, timeout=5)
        print(f"Status: {resp.status_code}")
        if resp.ok:
            print(f"Response: {json.dumps(resp.json(), indent=2)}")
        else:
            print(f"Error: {resp.text}")
    except Exception as e:
        print(f"FAILED: {e}")

    # 3. Aaliyah Briefing
    print("\n[3] Checking /aaliyah/briefing...")
    try:
        resp = requests.get(f"{base_url}/aaliyah/briefing", headers=headers, timeout=10)
        print(f"Status: {resp.status_code}")
        if resp.ok:
            print(f"Content Preview: {str(resp.json())[:200]}...")
        else:
            print(f"Error: {resp.text}")
    except Exception as e:
        print(f"FAILED: {e}")

    # 4. Test Chat (Ask)
    print("\n[4] Testing Chat (/aaliyah/ask)...")
    try:
        payload = {"message": "Hello Aaliyah, are you online?", "workspace_id": "ws_test_001"}
        resp = requests.post(f"{base_url}/aaliyah/ask", json=payload, headers=headers, timeout=15)
        print(f"Status: {resp.status_code}")
        if resp.ok:
            print(f"Response: {json.dumps(resp.json(), indent=2)}")
        else:
            print(f"Error: {resp.text}")
    except Exception as e:
        print(f"FAILED: {e}")

if __name__ == "__main__":
    run_checks()
