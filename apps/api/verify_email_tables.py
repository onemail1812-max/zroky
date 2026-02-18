import sqlite3

conn = sqlite3.connect('d:/Zroky/apps/api/zroky.db')
cursor = conn.cursor()

tables = ['email_messages', 'threads']
for t in tables:
    cursor.execute(f"SELECT name FROM sqlite_master WHERE type='table' AND name='{t}'")
    exists = cursor.fetchone()
    print(f"Table '{t}' exists: {exists is not None}")
    if exists:
        cursor.execute(f"PRAGMA table_info({t})")
        print(f"Columns in {t}: {[col[1] for col in cursor.fetchall()]}")

cursor.close()
conn.close()
