import os
import re

# Base path
base_dir = r"d:\Zroky\apps\api\app\agents\aaliyah\core"
orch_file = os.path.join(base_dir, "orchestrator.py")

with open(orch_file, "r", encoding="utf-8") as f:
    lines = f.readlines()

new_orch_lines = lines[:421]

delegations = """
    # --- DELEGATED HANDLERS ---
    async def handle_webhook(self, *args, **kwargs): return await self.webhook_handler.handle_webhook(*args, **kwargs)
    async def run_followup_scan(self, *args, **kwargs): return await self.followup_scanner.run_followup_scan(*args, **kwargs)
    async def sync_calendar(self, *args, **kwargs): return await self.calendar_syncer.sync_calendar(*args, **kwargs)
    def list_calendar_conflicts(self, *args, **kwargs): return self.calendar_syncer.list_calendar_conflicts(*args, **kwargs)
    async def sync_inbox(self, *args, **kwargs): return await self.inbox_manager.sync_inbox(*args, **kwargs)
    def list_inbox(self, *args, **kwargs): return self.inbox_manager.list_inbox(*args, **kwargs)
    async def historical_sync(self, *args, **kwargs): return await self.inbox_manager.historical_sync(*args, **kwargs)
    async def handle_chat(self, *args, **kwargs): return await self.chat_handler.handle_chat(*args, **kwargs)
    async def handle_chat_stream(self, *args, **kwargs):
        async for chunk in self.chat_handler.handle_chat_stream(*args, **kwargs):
            yield chunk
"""
new_orch_lines.append(delegations)

with open(os.path.join(base_dir, "orchestrator_refactored.py"), "w", encoding="utf-8") as f:
    f.writelines(new_orch_lines)

print("Updated orchestrator_refactored.py with async delegations")
