
import sqlite3
import os

DB_PATH = "zroky.db"

def create_table():
    if not os.path.exists(DB_PATH):
        print(f"DB {DB_PATH} missing!")
        return

    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    print("Dropping existing table...")
    c.execute("DROP TABLE IF EXISTS meeting_transcripts;")
    
    sql = """
    CREATE TABLE meeting_transcripts (
        id VARCHAR PRIMARY KEY,
        workspace_id VARCHAR NOT NULL,
        event_id VARCHAR NOT NULL,
        transcript_text TEXT NOT NULL,
        summary_json TEXT,
        status VARCHAR DEFAULT 'pending',
        platform VARCHAR,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL,
        FOREIGN KEY(event_id) REFERENCES calendar_event_snapshots(id)
    );
    """
    try:
        c.execute(sql)
        conn.commit()
        print("Table meeting_transcripts created (or existed).")
        
        # Check indices
        c.execute("CREATE INDEX IF NOT EXISTS ix_meeting_transcripts_id ON meeting_transcripts (id);")
        c.execute("CREATE INDEX IF NOT EXISTS ix_meeting_transcripts_workspace_id ON meeting_transcripts (workspace_id);")
        c.execute("CREATE INDEX IF NOT EXISTS ix_meeting_transcripts_event_id ON meeting_transcripts (event_id);")
        c.execute("CREATE INDEX IF NOT EXISTS ix_meeting_transcripts_status ON meeting_transcripts (status);")
        conn.commit()
        print("Indices created.")
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    create_table()
