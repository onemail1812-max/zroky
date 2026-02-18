import re

file_path = 'd:/Zroky/apps/api/alembic/versions/57700417e24a_sprint_2_schema_fix_email.py'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add helper function definition after imports
# Replace op.add_column with add_column_safe FIRST to avoid recursion in definition
content = content.replace("op.add_column", "add_column_safe")

# Add helper function definition after imports
helper_func = """
def add_column_safe(table_name, column):
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [c['name'] for c in inspector.get_columns(table_name)]
    if column.name not in columns:
        op.add_column(table_name, column)
"""

# Insert helper function after imports (e.g. after 'from sqlalchemy.dialects import sqlite')
content = content.replace("from sqlalchemy.dialects import sqlite", "from sqlalchemy.dialects import sqlite\n" + helper_func)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Updated {file_path}")
