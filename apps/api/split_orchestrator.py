import os
import re

# Base path
base_dir = r"d:\Zroky\apps\api\app\agents\aaliyah\core"
orch_file = os.path.join(base_dir, "orchestrator.py")

with open(orch_file, "r", encoding="utf-8") as f:
    lines = f.readlines()

# Extract top-level imports (everything before class AaliyahOrchestrator:)
import_lines = []
for idx, line in enumerate(lines):
    if line.startswith("class AaliyahOrchestrator"):
        class_start_idx = idx
        break
    import_lines.append(line)

imports_block = "".join(import_lines).strip()

base_handler_code = """
from typing import TYPE_CHECKING, Any, Optional
if TYPE_CHECKING:
    from app.agents.aaliyah.core.orchestrator import AaliyahOrchestrator
from sqlalchemy.orm import Session

class BaseHandler:
    def __init__(self, orchestrator: "AaliyahOrchestrator"):
        self.orchestrator = orchestrator

    @property
    def workspace_id(self) -> str:
        return self.orchestrator.workspace_id
        
    @property
    def brain(self):
        return self.orchestrator.brain

    @property
    def _state(self):
        return self.orchestrator._state

    def emit_status(self, *args, **kwargs):
        return self.orchestrator.emit_status(*args, **kwargs)
        
    def _get_state(self):
        return self.orchestrator._get_state()

    def _patch_state(self, **kwargs):
        return self.orchestrator._patch_state(**kwargs)

    def _audit(self, *args, **kwargs):
        return self.orchestrator._audit(*args, **kwargs)
        
    def get_stats(self, *args, **kwargs):
        return self.orchestrator.get_stats(*args, **kwargs)

    def broadcast_updates(self, *args, **kwargs):
        return self.orchestrator.broadcast_updates(*args, **kwargs)
        
    def flush_communication(self, *args, **kwargs):
        return self.orchestrator.flush_communication(*args, **kwargs)

    def _emit(self, *args, **kwargs):
        return self.orchestrator._emit(*args, **kwargs)
"""

with open(os.path.join(base_dir, "handlers", "base.py"), "w", encoding="utf-8") as f:
    f.write(base_handler_code)

def extract_chunks(ranges):
    # ranges is a list of (start_line, end_line)
    # returns unindented block of code
    code_lines = []
    for s, e in ranges:
        for i in range(s-1, e):
            # unindent by 4 spaces
            line = lines[i]
            if line.startswith("    "):
                code_lines.append(line[4:])
            else:
                code_lines.append(line)
    return "".join(code_lines)

# Definition of handlers and their line ranges (1-indexed)
handlers = {
    "webhook_handler": {
        "class_name": "WebhookHandler",
        "ranges": [(2111, 2241)]
    },
    "followup_scanner": {
        "class_name": "FollowupScanner",
        "ranges": [(1973, 2109)]
    },
    "calendar_syncer": {
        "class_name": "CalendarSyncer",
        "ranges": [(489, 511), (1903, 1971)]
    },
    "inbox_manager": {
        "class_name": "InboxManager",
        "ranges": [(422, 487), (514, 539), (1430, 1564), (1566, 1901)]
    },
    "chat_handler": {
        "class_name": "ChatHandler",
        "ranges": [(541, 543), (545, 547), (549, 558), (560, 570), (572, 647), (649, 987), (989, 1428)]
    }
}

for filename, spec in handlers.items():
    class_name = spec["class_name"]
    code = extract_chunks(spec["ranges"])
    content = f"{imports_block}\nfrom .base import BaseHandler\n\nclass {class_name}(BaseHandler):\n{code}"
    
    out_path = os.path.join(base_dir, "handlers", f"{filename}.py")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(content)

# Now generate the new orchestrator.py
# First keep lines before 422
new_orch_lines = lines[:421]

# Append the delegation methods
delegations = """    # --- DELEGATED HANDLERS ---
    def handle_webhook(self, *args, **kwargs): return self.webhook_handler.handle_webhook(*args, **kwargs)
    def run_followup_scan(self, *args, **kwargs): return self.followup_scanner.run_followup_scan(*args, **kwargs)
    def sync_calendar(self, *args, **kwargs): return self.calendar_syncer.sync_calendar(*args, **kwargs)
    def list_calendar_conflicts(self, *args, **kwargs): return self.calendar_syncer.list_calendar_conflicts(*args, **kwargs)
    def sync_inbox(self, *args, **kwargs): return self.inbox_manager.sync_inbox(*args, **kwargs)
    def list_inbox(self, *args, **kwargs): return self.inbox_manager.list_inbox(*args, **kwargs)
    def historical_sync(self, *args, **kwargs): return self.inbox_manager.historical_sync(*args, **kwargs)
    def handle_chat(self, *args, **kwargs): return self.chat_handler.handle_chat(*args, **kwargs)
    def handle_chat_stream(self, *args, **kwargs): return self.chat_handler.handle_chat_stream(*args, **kwargs)
"""
new_orch_lines.append(delegations)

# Inject instantiation into __init__
init_injection = """
        # Initialize handlers
        from app.agents.aaliyah.core.handlers import (
            ChatHandler, InboxManager, CalendarSyncer, FollowupScanner, WebhookHandler
        )
        self.chat_handler = ChatHandler(self)
        self.inbox_manager = InboxManager(self)
        self.calendar_syncer = CalendarSyncer(self)
        self.followup_scanner = FollowupScanner(self)
        self.webhook_handler = WebhookHandler(self)
"""

# Let's write the new orchestartor to a temp file first
with open(os.path.join(base_dir, "orchestrator_refactored.py"), "w", encoding="utf-8") as f:
    f.writelines(new_orch_lines)

print("Split complete. Check orchestrator_refactored.py")
