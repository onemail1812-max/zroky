import requests
import json
import sys
import os

# Configuration
BASE_URL = "http://localhost:8000"
TOKEN_FILE = "token.txt"

def load_token():
    try:
        with open(TOKEN_FILE, "r") as f:
            return f.read().strip()
    except FileNotFoundError:
        print("FAIL: token.txt not found. Cannot authenticate.")
        sys.exit(1)

def run_verification():
    token = load_token()
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    results = {}

    print("=== STARTING LIVE VERIFICATION ===")

    # 1. Health Probe
    try:
        resp = requests.get(f"{BASE_URL}/aaliyah/status", headers=headers, timeout=5)
        if resp.status_code == 200:
            print("PASS: /aaliyah/status")
            results["health"] = "PASS"
        else:
            print(f"FAIL: /aaliyah/status returned {resp.status_code}")
            results["health"] = "FAIL"
    except Exception as e:
        print(f"FAIL: Connection refused or error: {e}")
        results["health"] = "FAIL"
        sys.exit(1)

    # 2. Workspace Settings (Feature 2.3)
    try:
        resp = requests.get(f"{BASE_URL}/aaliyah/settings", headers=headers)
        if resp.status_code == 200:
            data = resp.json()
            if "auto_send_enabled" in data and "draft_tone" in data:
                print("PASS: /aaliyah/settings")
                results["settings"] = "PASS"
            else:
                print(f"FAIL: settings missing keys. Got: {data}")
                results["settings"] = "FAIL"
        else:
            print(f"FAIL: /aaliyah/settings returned {resp.status_code}")
            results["settings"] = "FAIL_HTTP"
    except Exception as e:
        print(f"FAIL: settings error: {e}")
        results["settings"] = "FAIL_EX"

    # 3. Inbox Retrieval (Feature 2.5)
    try:
        resp = requests.get(f"{BASE_URL}/aaliyah/inbox?limit=5", headers=headers)
        if resp.status_code == 200:
            data = resp.json()
            if "items" in data and isinstance(data["items"], list):
                print(f"PASS: /aaliyah/inbox (Items: {len(data['items'])})")
                results["inbox"] = "PASS"
            else:
                print("FAIL: inbox response format invalid")
                results["inbox"] = "FAIL"
        else:
            print(f"FAIL: /aaliyah/inbox returned {resp.status_code}")
            results["inbox"] = "FAIL_HTTP"
    except Exception as e:
        print(f"FAIL: inbox error: {e}")
        results["inbox"] = "FAIL_EX"

    # 4. Upcoming Meetings (Feature 2.5, 2.4 - Prep)
    try:
        resp = requests.get(f"{BASE_URL}/aaliyah/calendar/upcoming", headers=headers)
        if resp.status_code == 200:
            data = resp.json()
            if "items" in data:
                print(f"PASS: /aaliyah/calendar/upcoming (Items: {len(data['items'])})")
                results["calendar"] = "PASS"
                # Check for prep data
                if len(data["items"]) > 0:
                    first = data["items"][0]
                    if "meeting_prep" in first and first["meeting_prep"]:
                        print("PASS: Meeting prep data present")
                        results["prep"] = "PASS"
                    else:
                        print("WARN: Meeting prep missing in event")
                        results["prep"] = "WARN"
            else:
                print("FAIL: calendar response format invalid")
                results["calendar"] = "FAIL"
        else:
            print(f"FAIL: /aaliyah/calendar/upcoming returned {resp.status_code}")
            results["calendar"] = "FAIL_HTTP"
    except Exception as e:
        print(f"FAIL: calendar error: {e}")
        results["calendar"] = "FAIL_EX"

    # 5. Templates (Feature 3 - Strict Control)
    try:
        # Create
        t_payload = {"name": "Test Template", "body": "Hello World"}
        resp = requests.post(f"{BASE_URL}/aaliyah/templates", headers=headers, json=t_payload)
        if resp.status_code == 200:
            tid = resp.json()["id"]
            print("PASS: Created template")
            
            # List
            resp = requests.get(f"{BASE_URL}/aaliyah/templates", headers=headers)
            if resp.status_code == 200 and any(t["id"] == tid for t in resp.json()["items"]):
                print("PASS: Listed template")
                results["templates"] = "PASS"
            else:
                print("FAIL: Template not found in list")
                results["templates"] = "FAIL_LIST"
                
            # Cleanup
            requests.delete(f"{BASE_URL}/aaliyah/templates/{tid}", headers=headers)
        else:
            print(f"FAIL: Create template returned {resp.status_code}")
            results["templates"] = "FAIL_CREATE"
    except Exception as e:
        print(f"FAIL: template error: {e}")
        results["templates"] = "FAIL_EX"
        
    print("\n=== VERIFICATION SUMMARY ===")
    print(json.dumps(results, indent=2))

if __name__ == "__main__":
    run_verification()
