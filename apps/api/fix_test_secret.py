import os

root_dir = r"d:\Zroky\apps\api"
files_changed = 0

old_key = '"test-secret-must-be-min-16-chars"'
new_key = '"test-secret-must-be-min-16-chars"'

for dirpath, dirnames, filenames in os.walk(root_dir):
    if ".venv" in dirpath or "__pycache__" in dirpath or ".pytest_cache" in dirpath:
        continue
    for filename in filenames:
        if filename.endswith(".py"):
            filepath = os.path.join(dirpath, filename)
            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    content = f.read()
                
                if old_key in content:
                    new_content = content.replace(old_key, new_key)
                    with open(filepath, "w", encoding="utf-8") as f:
                        f.write(new_content)
                    print(f"Updated {filepath}")
                    files_changed += 1
            except Exception as e:
                pass

print(f"Total files updated: {files_changed}")
