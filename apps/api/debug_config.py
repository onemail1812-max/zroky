import sys
from pydantic import ValidationError

try:
    from app.config import Settings
    # Simulate pytest environment empty variables
    Settings(OAUTH_ENCRYPTION_KEY="")
except ValidationError as e:
    print(e.json())
except Exception as e:
    print(str(e))
