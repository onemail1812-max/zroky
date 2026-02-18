import re

file_path = 'd:/Zroky/apps/api/alembic/versions/57700417e24a_sprint_2_schema_fix_email.py'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    # If line starts with op.execute or op.drop_table and has no indentation (column 0), add 4 spaces
    if line.startswith('op.execute') or line.startswith('op.drop_table'):
        new_lines.append('    ' + line)
    else:
        new_lines.append(line)

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print(f"Fixed indentation globally in {file_path}")
