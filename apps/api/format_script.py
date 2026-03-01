import re
import sys

file_path = 'alembic/versions/a24b6e75ba04_add_missing_tables_and_columns.py'
with open(file_path, 'r', encoding='utf-8') as f:
    code = f.read()

# Replace sqlite.JSON()
code = code.replace('sqlite.JSON()', 'app.db_types.SafeJSON()')
code = code.replace('from sqlalchemy.dialects import sqlite\n', '')

# Remove drop blocks for tables that were actually recreated.
# We just want to remove the sections dropping triaged_threads, calendar_conflicts, calendar_event_snapshots

def remove_drop_block(table_name, text):
    pattern = r"    with op\.batch_alter_table\('" + table_name + r"', schema=None\) as batch_op:\n(?:        batch_op\.drop_index.*?\n)*\n    op\.drop_table\('" + table_name + r"'\)\n"
    return re.sub(pattern, '', text, flags=re.MULTILINE|re.DOTALL)

for t in ['calendar_conflicts', 'triaged_threads', 'calendar_event_snapshots']:
    code = remove_drop_block(t, code)
    
# Wait, let's also remove them from downgrade() where it drops the CREATEd ones? 
# In downgrade(), Alembic drops the recreated tables. Since we didn't drop them in upgrade(), we shouldn't recreate them in downgrade().
# Actually, downgrade() will drop them if they were created in upgrade. 
# Did upgrade CREATE triaged_threads? Yes, because we kept op.create_table('triaged_threads').
# IF we keep op.create_table('triaged_threads') in upgrade, we MUST keep op.drop_table('triaged_threads') in downgrade!
# BUT wait! triaged_threads ALREADY EXISTED before this migration!
# If it already existed, op.create_table in upgrade() will CRASH Postgres (elation "triaged_threads" already exists)!
# Oh my god. Yes!

print("Done string replacement part 1")
