
import requests
import json

try:
    response = requests.get('http://localhost:8000/api/v1/connectors/accounts', headers={'x-tenant-id': 'default-tenant', 'x-user-id': 'default-user'})
    if response.status_code == 200:
        print(json.dumps(response.json(), indent=2))
    else:
        print(f"Error: {response.status_code} {response.text}")
except Exception as e:
    print(f"Exception: {e}")
