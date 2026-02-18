import sqlite3

conn = sqlite3.connect('d:/Zroky/apps/api/zroky.db')
cursor = conn.cursor()

tables = ['approvals', 'audit_logs', 'drafts', 'triaged_emails', 'workspaces']

for table in tables:
    print(f"\n--- Columns in {table} ---")
    cursor.execute(f"PRAGMA table_info({table})")
    columns = cursor.fetchall()
    for col in columns:
        # col format: (id, name, type, notnull, default_value, pk)
        print(f"Name: {col[1]}, Type: {col[2]}, Default: {col[4]}")

cursor.close()
conn.close()
