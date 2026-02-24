import sqlite3

conn = sqlite3.connect('d:/Zroky/apps/api/zroky.db')
cursor = conn.cursor()
cursor.execute("SELECT sql FROM sqlite_master WHERE tbl_name='drafts'")
row = cursor.fetchone()
if row:
    print(row[0])
else:
    print("Table not found")
cursor.close()
conn.close()
