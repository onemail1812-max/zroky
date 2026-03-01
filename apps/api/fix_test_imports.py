import os

root_dir = r"d:\Zroky\apps\api\tests"
files_changed = 0

replacements = {
    "from app.services.aaliyah.action_executor import ActionExecutor": "from app.agents.aaliyah.core.action_executor import ActionExecutor",
    "from app.services.aaliyah.undo_service import UndoService": "from app.agents.aaliyah.core.undo_service import UndoService"
}

for dirpath, dirnames, filenames in os.walk(root_dir):
    for filename in filenames:
        if filename.endswith(".py"):
            filepath = os.path.join(dirpath, filename)
            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    content = f.read()
                
                new_content = content
                for old, new in replacements.items():
                    new_content = new_content.replace(old, new)
                
                if new_content != content:
                    with open(filepath, "w", encoding="utf-8") as f:
                        f.write(new_content)
                    print(f"Updated {filepath}")
                    files_changed += 1
            except Exception as e:
                pass

print(f"Total files updated: {files_changed}")
