import os
import re

# We want to replace datetime.utcnow() with datetime.now(timezone.utc).
# We also need to ensure 'from datetime import timezone' is imported.

utc_now_pattern = re.compile(r'\bdatetime\.utcnow\(\)')

# We'll check if files need modification first
root_dir = r"d:\Zroky\apps\api\app"
files_changed = 0

for dirpath, dirnames, filenames in os.walk(root_dir):
    for filename in filenames:
        if filename.endswith(".py"):
            filepath = os.path.join(dirpath, filename)
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()
            
            if "datetime.utcnow()" in content:
                # Replace the call
                new_content = utc_now_pattern.sub('datetime.now(timezone.utc)', content)
                
                # Ensure timezone is imported
                if "import timezone" not in new_content and "timezone" not in new_content.splitlines()[0:50]:  # Rough check for existing import
                     # Find 'from datetime import' and append timezone if not there
                     if "from datetime import" in new_content:
                         # Append to existing
                         lines = new_content.splitlines()
                         for i, line in enumerate(lines):
                             if line.startswith("from datetime import"):
                                 if "timezone" not in line:
                                     lines[i] = line + ", timezone"
                                 break
                         new_content = "\n".join(lines)
                     else:
                         # Add new import at top (after typical docstrings/shebangs)
                         new_content = "from datetime import timezone\n" + new_content
                
                with open(filepath, "w", encoding="utf-8") as f:
                    f.write(new_content)
                print(f"Updated {filepath}")
                files_changed += 1

print(f"Total files updated: {files_changed}")
