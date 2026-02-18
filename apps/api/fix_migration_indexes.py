import re

file_path = 'd:/Zroky/apps/api/alembic/versions/57700417e24a_sprint_2_schema_fix_email.py'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Pattern to find commented out drop_index calls
# Matches: # op.drop_index(op.f('index_name'), table_name='table')
# We want to extract 'index_name' and replace the whole line with op.execute("DROP INDEX IF EXISTS index_name")

def replace_drop_index(match):
    indent = match.group(1)
    index_name = match.group(2)
    return f'{indent}op.execute("DROP INDEX IF EXISTS {index_name}")'

# Regex:
# ^(\s*)#\s*op\.drop_index\(op\.f\('([^']+)'\).*$
content = re.sub(r"^(\s*)#\s*op\.drop_index\(op\.f\('([^']+)'\).*", replace_drop_index, content, flags=re.MULTILINE)

# Also handle cases where op.f is not used (if any)
def replace_drop_index_simple(match):
    indent = match.group(1)
    index_name = match.group(2)
    return f'{indent}op.execute("DROP INDEX IF EXISTS {index_name}")'

content = re.sub(r"^(\s*)#\s*op\.drop_index\('([^']+)'\).*", replace_drop_index_simple, content, flags=re.MULTILINE)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Updated {file_path}")
