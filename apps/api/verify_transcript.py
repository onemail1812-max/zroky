
import requests
import json
import time
import sys
import os

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
    
    # 1. Get an event ID (Upcoming)
    print("Getting upcoming event...")
    resp = requests.get(f"{BASE_URL}/aaliyah/calendar/upcoming", headers=headers)
    if resp.status_code != 200:
        print(f"FAIL: /upcoming returned {resp.status_code}")
        sys.exit(1)
        
    data = resp.json()
    if not data["items"]:
        print("FAIL: No upcoming events to attach transcript to.")
        sys.exit(1)
        
    event_id = data["items"][0]["id"]
    print(f"Using event ID: {event_id}")
    
    # 2. Upload Transcript
    print("Uploading transcript...")
    transcript_text = """
    Sam: Okay, let's start the strategy session.
    Ilya: I think we need to focus on safety. Zroky's approach is interesting.
    Sam: Agreed. Let's decide to allocate 20% of compute to this alignment research.
    Ilya: That sounds like a good decision. 
    Sam: Also, action item for you Ilya: review the Zroky codebase by Friday.
    Ilya: Will do.
    Sam: Great. See you next week.
    """
    
    payload = {
        "text": transcript_text,
        "platform": "zoom_manual"
    }
    
    resp = requests.post(f"{BASE_URL}/aaliyah/calendar/events/{event_id}/transcript", headers=headers, json=payload)
    if resp.status_code != 200:
        print(f"FAIL: Upload failed {resp.status_code}: {resp.text}")
        sys.exit(1)
        
    tid = resp.json().get("transcript_id")
    print(f"Transcript uploaded. ID: {tid}. Processing...")
    
    # 3. Poll for Summary
    max_retries = 10
    for i in range(max_retries):
        time.sleep(2)
        print(f"Polling attempt {i+1}...")
        resp = requests.get(f"{BASE_URL}/aaliyah/calendar/events/{event_id}/transcript", headers=headers)
        if resp.status_code == 200:
            data = resp.json()
            status = data.get("status")
            print(f"Status: {status}")
            
            if status == "completed":
                print("SUCCESS: Summary generated!")
                print(json.dumps(data["summary"], indent=2))
                break
            elif status == "failed":
                print("FAIL: Summarization failed.")
                break
        else:
            print(f"WARN: Poll returned {resp.status_code}")
            
    else:
        print("TIMEOUT: Summarization took too long.")

if __name__ == "__main__":
    run()
