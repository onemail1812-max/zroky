
import requests
import json

try:
    response = requests.get('http://localhost:8000/api/v1/connectors/accounts', headers={'x-tenant-id': 'default-tenant', 'x-user-id': 'default-user'})
    if response.status_code == 200:
        accounts = response.json()
        print(f"Found {len(accounts)} accounts on Python Backend")
        for account in accounts:
            if account.get('provider') == 'google':
                print(f"Revoking Google Account: {account['id']}")
                res = requests.post(f"http://localhost:8000/api/v1/connectors/accounts/{account['id']}/revoke", headers={'x-tenant-id': 'default-tenant', 'x-user-id': 'default-user'})
                print(f"Status: {res.status_code}")
    else:
        print(f"Error listing: {response.status_code}")
except Exception as e:
    print(f"Exception: {e}")
