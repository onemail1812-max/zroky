
import requests
import json
import time

print("Starting polling for active accounts on Node (3001)...")
for i in range(15):
    try:
        response = requests.get('http://localhost:3001/api/v1/connectors/accounts', headers={'x-tenant-id': 'default-tenant', 'x-user-id': 'default-user'})
        if response.status_code == 200:
            data = response.json()
            accounts = data.get('accounts', []) if isinstance(data, dict) else data
            if accounts:
                print(f"SUCCESS! Found active accounts: {len(accounts)}")
                print(json.dumps(accounts, indent=2))
                break
            else:
                print(f"Attempt {i+1}: No accounts found yet...")
        else:
            print(f"Attempt {i+1}: Error {response.status_code}")
    except Exception as e:
        print(f"Attempt {i+1}: Exception {e}")
    time.sleep(2)
