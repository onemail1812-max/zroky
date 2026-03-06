with open('pytest_cov_utf8.log', encoding='utf-8') as f:
    lines = f.readlines()
in_table = False
table = []
for line in lines:
    if line.startswith('Name ') and 'Stmts' in line:
        in_table = True
    if in_table:
        table.append(line.rstrip())
        if line.startswith('TOTAL '):
            break
print('\n'.join(table))
