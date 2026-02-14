import requests
import sys

try:
    response = requests.get("http://localhost:8000/health", timeout=5)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    sys.exit(0)
except requests.exceptions.Timeout:
    print("ERROR: Request timed out - server is hanging")
    sys.exit(1)
except requests.exceptions.ConnectionError:
    print("ERROR: Cannot connect to server - is it running?")
    sys.exit(1)
except Exception as e:
    print(f"ERROR: {str(e)}")
    sys.exit(1)
