
import sqlite3
conn = sqlite3.connect("./apps/api/zroky.db")
cursor = conn.execute("PRAGMA table_info(workspaces);")
for row in cursor:
    print(row)
conn.close()
