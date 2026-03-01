import json
try:
    with open('dump2.log', 'r', encoding='utf-16le') as f:
        print(f.read())
except:
    with open('dump2.log', 'r', encoding='utf-8', errors='replace') as f:
        lines = f.readlines()
        for i, l in enumerate(lines):
            if 'STATUS:' in l or 'RESPONSE:' in l or 'Testing' in l:
                print(l.strip())
