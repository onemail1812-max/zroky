import os
import ast

def check_missing_list_import(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            tree = ast.parse(f.read(), filename=filepath)
    except Exception:
        return

    uses_list_typing = False
    has_list_import = False

    for node in ast.walk(tree):
        if isinstance(node, ast.Name) and node.id == 'List':
            uses_list_typing = True
        elif isinstance(node, ast.ImportFrom) and node.module == 'typing':
            for alias in node.names:
                if alias.name == 'List':
                    has_list_import = True

    if uses_list_typing and not has_list_import:
        print(f"Missing List import in: {filepath}")

api_dir = 'd:/Zroky/apps/api'
for root, _, files in os.walk(api_dir):
    for file in files:
        if file.endswith('.py'):
            check_missing_list_import(os.path.join(root, file))
