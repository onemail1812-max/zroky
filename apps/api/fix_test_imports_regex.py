import os
import re

root_dir = r"d:\Zroky\apps\api\tests"
files_changed = 0

pattern = re.compile(r'app\.services\.aaliyah\.(?!(relationship_manager|vision_service))')
replacement = r'app.agents.aaliyah.core.'

for dirpath, dirnames, filenames in os.walk(root_dir):
    for filename in filenames:
        if filename.endswith(".py"):
            filepath = os.path.join(dirpath, filename)
            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    content = f.read()
                
                new_content, count = pattern.subn(replacement, content)
                
                if count > 0:
                    with open(filepath, "w", encoding="utf-8") as f:
                        f.write(new_content)
                    print(f"Updated {filepath} ({count} replacements)")
                    files_changed += 1
            except Exception as e:
                pass

print(f"Total files updated: {files_changed}")
