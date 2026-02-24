import urllib.request
import urllib.error
import json

# Endpoint to test
URL = "http://localhost:8000/aaliyah/sync/status"

def check_endpoint():
    print(f"Checking {URL} ...")
    try:
        # Create request without headers (relying on debug bypass)
        req = urllib.request.Request(URL)
        
        with urllib.request.urlopen(req) as response:
            print(f"Status: {response.status}")
            body = response.read().decode('utf-8')
            print("Response Body:")
            print(body)

    except urllib.error.HTTPError as e:
        print(f"HTTP Error: {e.code}")
        body = e.read().decode('utf-8')
        print("Error Body:")
        print(body)
    except Exception as e:
        print(f"Request Failed: {e}")

if __name__ == "__main__":
    check_endpoint()
