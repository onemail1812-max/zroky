import requests
r = requests.get('http://localhost:8000/aaliyah/threads', headers={'x-workspace-id': 'ws_demo_stable_001'})
print(f'Status: {r.status_code}')
data = r.json()
print(f'Count: {data.get("count", 0)}')
items = data.get('items', [])
print(f'Items: {len(items)}')
if items:
    print(f'First subject: {items[0].get("subject")}')
    print(f'First category: {items[0].get("category")}')
    print(f'First priority: {items[0].get("priority")}')
else:
    print('EMPTY inbox')
