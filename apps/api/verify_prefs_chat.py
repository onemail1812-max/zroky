
import requests
import json
import sys

BASE_URL = "http://localhost:8000"
TOKEN_FILE = "token.txt"

def load_token():
    try:
        with open(TOKEN_FILE, "r") as f:
            return f.read().strip()
    except FileNotFoundError:
        print("FAIL: token.txt not found.")
        sys.exit(1)

def run():
    token = load_token()
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    # 1. Ask Aaliyah to update preferences
    msg = "Please add boss@mycompany.com to my VIP senders list."
    print(f"Sending: {msg}")
    
    resp = requests.post(
        f"{BASE_URL}/aaliyah/ask", 
        headers=headers, 
        json={"message": msg}
    )
    
    if resp.status_code != 200:
        print(f"FAIL: /ask returned {resp.status_code}: {resp.text}")
        sys.exit(1)
        
    data = resp.json()
    print("Response:", json.dumps(data, indent=2))
    
    if "vip_senders" in str(data):
        print("PASS: Response contains updated setting confirmation.")
    else:
        print("WARN: Response might not have updated nicely.")

    # 2. Verify with settings endpoint
    resp = requests.get(f"{BASE_URL}/aaliyah/labeling/preferences", headers=headers)
    if resp.status_code == 200:
        prefs = resp.json()
        vips = prefs.get("vip_senders", [])
        if "boss@mycompany.com" in vips:
            print("PASS: Verified boss@mycompany.com is in VIP list.")
        else:
            print(f"FAIL: boss@mycompany.com NOT in VIP list. Got: {vips}")
            sys.exit(1)

if __name__ == "__main__":
    run()
