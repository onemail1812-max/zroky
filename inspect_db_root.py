
import sqlite3
conn = sqlite3.connect("./zroky.db")
try:
    cursor = conn.execute("PRAGMA table_info(workspaces);")
    for row in cursor:
        print(row)
except Exception as e:
    print(f"Error: {e}")
conn.close()
