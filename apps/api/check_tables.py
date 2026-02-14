
import sys
import os
sys.path.append(os.getcwd())
from app.database import engine
from sqlalchemy import inspect

inspector = inspect(engine)
tables = inspector.get_table_names()
print(f"Tables: {tables}")

if "meeting_transcripts" in tables:
    print("Table meeting_transcripts exists.")
else:
    print("Table meeting_transcripts MISSING.")
