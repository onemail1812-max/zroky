"""Background sync worker for periodic inbox synchronization."""

from __future__ import annotations

import asyncio
import logging

from app.config import settings
from app.database import SessionLocal
from app.agents.aaliyah.core.orchestrator import AaliyahOrchestrator

logger = logging.getLogger(__name__)


class SyncWorker:
    def __init__(self, workspace_id: str, user_id: str):
        self.workspace_id = workspace_id
        self.user_id = user_id
        self.orchestrator = AaliyahOrchestrator(workspace_id)
        self.is_running = False

    async def start(self) -> None:
        self.is_running = True
        logger.info("SyncWorker started workspace=%s", self.workspace_id)
        while self.is_running:
            # 1. Determine user-preferred interval
            interval = 120
            db = SessionLocal()
            try:
                from app.agents.aaliyah.core.labeling_rules import LabelingRulesEngine
                engine = LabelingRulesEngine(db, self.workspace_id)
                prefs = engine.get_preferences_payload()
                interval = int(prefs.get("auto_sync_interval_seconds", 120))
            except Exception:
                logger.warning("Failed to read sync prefs, using default 120s")
            finally:
                db.close()

            # 2. Execute Sync
            await self.sync_cycle()
            
            # 3. Sleep for user-defined interval
            # Ensure we don't hammer the API if sync acts fast
            sleep_time = max(30, interval)
            logger.debug("Sync cycle complete. Sleeping for %ss", sleep_time)
            await asyncio.sleep(sleep_time)

    async def stop(self) -> None:
        self.is_running = False
        logger.info("SyncWorker stopping workspace=%s", self.workspace_id)

    async def sync_cycle(self) -> None:
        db = SessionLocal()
        try:
            await self.orchestrator.sync_inbox(db, user_id=self.user_id, provider="auto", max_results=20)
            await self.orchestrator.sync_calendar(db, user_id=self.user_id, provider="auto", window_days=7)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Sync cycle failed workspace=%s err=%s", self.workspace_id, str(exc))
        finally:
            db.close()
