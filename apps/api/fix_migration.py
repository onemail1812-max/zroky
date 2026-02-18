import re
import os

file_path = 'd:/Zroky/apps/api/alembic/versions/57700417e24a_sprint_2_schema_fix_email.py'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace op.drop_table('name') with op.execute("DROP TABLE IF EXISTS name")
# Using a function as replacement to handle the match explicitly
def replace_drop(match):
    table_name = match.group(1)
    return f'op.execute("DROP TABLE IF EXISTS {table_name}")'

new_content = re.sub(r"op\.drop_table\('([^']+)'\)", replace_drop, content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print(f"Updated {file_path}")
