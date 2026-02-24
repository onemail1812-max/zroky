import re

file_path = 'd:/Zroky/apps/api/alembic/versions/57700417e24a_sprint_2_schema_fix_email.py'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Helper function definition
drop_helper = """
def drop_column_safe(table_name, column_name, **kwargs):
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [c['name'] for c in inspector.get_columns(table_name)]
    if column_name in columns:
        op.drop_column(table_name, column_name, **kwargs)
"""

# Inject helper if not present
if "def drop_column_safe" not in content:
    # Find a good place to insert. Maybe after add_column_safe if present, or after imports.
    if "def add_column_safe" in content:
         # Insert after add_column_safe block (assuming indentation and structure)
         # Find end of add_column_safe? Hard.
         # Just insert before it?
         content = content.replace("def add_column_safe", drop_helper + "\ndef add_column_safe")
    else:
         # Insert after imports
         content = content.replace("from sqlalchemy.dialects import sqlite", "from sqlalchemy.dialects import sqlite\n" + drop_helper)

# Replace op.drop_column with drop_column_safe
content = content.replace("op.drop_column", "drop_column_safe")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Updated {file_path} with drop_column_safe")
