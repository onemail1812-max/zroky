
import sys
import os
import json
from datetime import datetime, timedelta, timezone
from jose import jwt

sys.path.append(os.getcwd())
from app.config import settings

def generate_token():
    payload = {
        "sub": "user_demo_001",
        "workspace_id": "ws_demo_stable_001",
        "email": "demo@zroky.com",
        "user_metadata": {
            "full_name": "Demo User",
            "workspace_name": "Demo Workspace"
        },
        "exp": datetime.now(timezone.utc) + timedelta(days=365)
    }
    
    token = jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)
    with open("token.txt", "w") as f:
        f.write(token)
    print("Token written to token.txt")
    
if __name__ == "__main__":
    generate_token()
