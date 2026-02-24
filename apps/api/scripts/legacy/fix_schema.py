import sys
import os
# Add current directory to path so we can import app modules
sys.path.append(os.getcwd())

from sqlalchemy import create_engine, text, inspect
from app.config import settings

def fix_schema():
    print(f"Connecting to database: {settings.database_url}")
    engine = create_engine(settings.database_url)
    
    inspector = inspect(engine)
    
    # helper
    def ensure_column(table, col_name, col_type):
        try:
            cols = [c['name'] for c in inspector.get_columns(table)]
            if col_name not in cols:
                print(f"Adding {col_name} to {table}...")
                with engine.connect() as conn:
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col_name} {col_type}"))
                    conn.commit()
            else:
                print(f"Column {col_name} exists in {table}.")
        except Exception as e:
            print(f"Error checking {table}.{col_name}: {e}")

    ensure_column('triaged_threads', 'metadata_json', 'TEXT')
    ensure_column('triaged_threads', 'draft_json', 'TEXT')
    ensure_column('triaged_threads', 'message_count', 'INTEGER DEFAULT 1')
    
    ensure_column('triaged_emails', 'metadata_json', 'TEXT')
    
    ensure_column('workspaces', 'onboarding_status', "VARCHAR DEFAULT 'pending'")
    ensure_column('workspaces', 'settings_json', 'TEXT')

if __name__ == "__main__":
    fix_schema()
