import re

file_path = 'd:/Zroky/apps/api/alembic/versions/57700417e24a_sprint_2_schema_fix_email.py'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
in_upgrade = False
for line in lines:
    if line.strip().startswith('def upgrade()'):
        in_upgrade = True
        new_lines.append(line)
        continue
    
    if line.strip().startswith('def downgrade()'):
        in_upgrade = False
        new_lines.append(line)
        continue

    if in_upgrade:
        # If line starts with op.execute and has no indentation, add 4 spaces
        if line.startswith('op.execute'):
            new_lines.append('    ' + line)
        # Also check for other unindented op calls if any, though likely just these execute ones
        elif line.startswith('op.drop_table'): 
             new_lines.append('    ' + line)
        else:
            new_lines.append(line)
    else:
        new_lines.append(line)

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print(f"Fixed indentation in {file_path}")
