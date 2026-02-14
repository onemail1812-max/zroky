
import requests
import json

try:
    response = requests.get('http://localhost:3001/api/v1/connectors/accounts', headers={'x-tenant-id': 'default-tenant', 'x-user-id': 'default-user'})
    if response.status_code == 200:
        print(json.dumps(response.json(), indent=2))
        
        # Check if we should revoke
        accounts = response.json()
        for account in accounts:
            if account.get('provider') == 'google' and account.get('status') == 'ACTIVE':
                print(f"Disabling Active Google Account: {account['id']}")
                # Attempt to disconnect
                revoke_response = requests.post(f"http://localhost:3001/api/v1/connectors/accounts/{account['id']}/revoke", headers={'x-tenant-id': 'default-tenant', 'x-user-id': 'default-user'})
                if revoke_response.status_code == 200:
                    print("REVOKED Successfully")
                else:
                    print(f"Failed to revoke: {revoke_response.status_code}")
    else:
        print(f"Error: {response.status_code} {response.text}")
except Exception as e:
    print(f"Exception: {e}")
