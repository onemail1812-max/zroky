from __future__ import annotations

import logging
import time
from datetime import datetime, timezone, timedelta
from typing import Any, Optional, TYPE_CHECKING

from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from app.models.integration import Integration, IntegrationStatus
from app.services.audit_log_service import AuditAction
from app.core.queue import queue, JobType

from .base import BaseHandler

if TYPE_CHECKING:
    pass

logger = logging.getLogger(__name__)

# Gmail watch expires after 7 days; renew proactively at 6 days
GMAIL_WATCH_RENEWAL_DAYS = 6
# Microsoft Graph subscriptions last 3 days max for mail; renew at 2 days
GRAPH_SUB_RENEWAL_DAYS = 2


class WebhookHandler(BaseHandler):
    """Handles real-time push notification setup and processing.
    
    Responsibilities:
    1. Setting up Gmail Pub/Sub watches for instant email notifications
    2. Setting up Microsoft Graph webhook subscriptions
    3. Processing inbound webhook payloads (delegated from app/api/webhooks.py)
    4. Auto-renewing watch subscriptions before they expire
    """

    # ── Gmail Push Notification Setup ───────────────────────────────────

    async def setup_gmail_watch(self, db: Session, *, user_id: str) -> dict[str, Any]:
        """
        Register a Gmail push notification watch via the Gmail API.
        This tells Google to send notifications to our Pub/Sub topic
        whenever new emails arrive for this user.
        """
        from app.services.integrations.token_store import get_valid_token
        from app.config import settings

        token = get_valid_token(db, self.workspace_id, "google")
        if not token:
            return {"status": "error", "detail": "No valid Google token found"}

        topic_name = getattr(settings, "GOOGLE_PUBSUB_TOPIC", None)
        if not topic_name:
            logger.warning("GOOGLE_PUBSUB_TOPIC not configured, skipping Gmail watch setup")
            return {"status": "skipped", "detail": "Pub/Sub topic not configured"}

        try:
            import httpx
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    "https://gmail.googleapis.com/gmail/v1/users/me/watch",
                    headers={"Authorization": f"Bearer {token}"},
                    json={
                        "topicName": topic_name,
                        "labelIds": ["INBOX"],
                        "labelFilterBehavior": "INCLUDE",
                    },
                    timeout=15,
                )

            if resp.status_code == 200:
                data = resp.json()
                history_id = data.get("historyId")
                expiration = data.get("expiration")  # ms since epoch

                # Store watch metadata on the integration record
                integration = db.query(Integration).filter(
                    Integration.workspace_id == self.workspace_id,
                    Integration.provider.in_(["google", "google_gmail", "GOOGLE_GMAIL"]),
                ).first()
                if integration:
                    meta = dict(integration.metadata_json or {})
                    meta["gmail_watch"] = {
                        "history_id": history_id,
                        "expiration": expiration,
                        "setup_at": datetime.now(timezone.utc).isoformat(),
                    }
                    integration.metadata_json = meta
                    flag_modified(integration, "metadata_json")
                    db.commit()

                await self._emit("webhook_setup", "Gmail push notifications enabled", {
                    "provider": "google",
                    "history_id": history_id,
                })
                await self._audit(
                    db,
                    user_id=user_id,
                    action=AuditAction.CREATE,
                    entity_id=f"gmail_watch:{self.workspace_id}",
                    metadata={"history_id": history_id, "expiration": expiration},
                    explain="Set up Gmail push notification watch",
                )
                logger.info(f"Gmail watch registered for workspace {self.workspace_id}, historyId={history_id}")
                return {"status": "active", "history_id": history_id, "expiration": expiration}
            else:
                error_detail = resp.text[:500]
                logger.error(f"Gmail watch setup failed ({resp.status_code}): {error_detail}")
                return {"status": "error", "detail": f"Gmail API returned {resp.status_code}"}
        except Exception as e:
            logger.error(f"Gmail watch setup failed: {e}", exc_info=True)
            return {"status": "error", "detail": str(e)}

    # ── Microsoft Graph Subscription Setup ──────────────────────────────

    async def setup_graph_subscription(self, db: Session, *, user_id: str) -> dict[str, Any]:
        """
        Create a Microsoft Graph webhook subscription for mail notifications.
        Graph sends POST to our /webhooks/microsoft endpoint when mail arrives.
        """
        from app.services.integrations.token_store import get_valid_token
        from app.config import settings

        token = get_valid_token(db, self.workspace_id, "microsoft")
        if not token:
            return {"status": "error", "detail": "No valid Microsoft token found"}

        webhook_url = getattr(settings, "WEBHOOK_BASE_URL", None)
        if not webhook_url:
            webhook_url = getattr(settings, "FRONTEND_BASE_URL", "http://localhost:8000")
        notification_url = f"{webhook_url}/webhooks/microsoft"

        # Subscription expires in 3 days (Graph max for mail is 4230 minutes)
        expiration = datetime.now(timezone.utc) + timedelta(days=3)

        try:
            import httpx
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    "https://graph.microsoft.com/v1.0/subscriptions",
                    headers={
                        "Authorization": f"Bearer {token}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "changeType": "created,updated",
                        "notificationUrl": notification_url,
                        "resource": "me/mailFolders('Inbox')/messages",
                        "expirationDateTime": expiration.strftime("%Y-%m-%dT%H:%M:%S.0000000Z"),
                        "clientState": f"zroky_{self.workspace_id[:8]}",
                    },
                    timeout=15,
                )

            if resp.status_code in (200, 201):
                data = resp.json()
                sub_id = data.get("id")

                # Store subscription metadata on the integration record
                integration = db.query(Integration).filter(
                    Integration.workspace_id == self.workspace_id,
                    Integration.provider.in_(["microsoft", "outlook", "OUTLOOK"]),
                ).first()
                if integration:
                    meta = dict(integration.metadata_json or {})
                    meta["graph_subscription"] = {
                        "subscription_id": sub_id,
                        "expiration": expiration.isoformat(),
                        "setup_at": datetime.now(timezone.utc).isoformat(),
                    }
                    # Also store at top level for the webhook lookup
                    meta["subscription_id"] = sub_id
                    integration.metadata_json = meta
                    flag_modified(integration, "metadata_json")
                    db.commit()

                await self._emit("webhook_setup", "Outlook push notifications enabled", {
                    "provider": "microsoft",
                    "subscription_id": sub_id,
                })
                logger.info(f"Graph subscription created for workspace {self.workspace_id}, subId={sub_id}")
                return {"status": "active", "subscription_id": sub_id}
            else:
                error_detail = resp.text[:500]
                logger.error(f"Graph subscription failed ({resp.status_code}): {error_detail}")
                return {"status": "error", "detail": f"Graph API returned {resp.status_code}"}
        except Exception as e:
            logger.error(f"Graph subscription setup failed: {e}", exc_info=True)
            return {"status": "error", "detail": str(e)}

    # ── Process Inbound Webhook ─────────────────────────────────────────

    async def handle_webhook(
        self, db: Session, *, provider: str, payload: dict[str, Any]
    ) -> dict[str, Any]:
        """
        Process an inbound webhook notification.
        Called by the orchestrator after the API route validates the payload.
        Enqueues an immediate sync job for the workspace.
        """
        self.logger.info(f"Processing webhook from {provider} for workspace {self.workspace_id}")
        self._patch_state(status="thinking", active_task=f"Processing {provider} push notification")

        # Enqueue an immediate sync job (dedupe prevents flooding)
        job_id = await queue.enqueue(
            job_type=JobType.SYNC_PROVIDER.value,
            payload={
                "workspace_id": self.workspace_id,
                "provider": provider,
            },
            dedupe_id=f"webhook_sync:{provider}:{self.workspace_id}",
        )

        await self._emit("webhook_received", f"Real-time push from {provider}", {
            "provider": provider,
            "job_id": job_id,
        })

        self._patch_state(status="idle", active_task=None)
        return {"status": "accepted", "job_id": job_id}

    # ── Watch/Subscription Renewal ──────────────────────────────────────

    async def renew_watches(self, db: Session, *, user_id: str = "system") -> dict[str, Any]:
        """
        Check all integrations for this workspace and renew any
        expiring Gmail watches or Graph subscriptions.
        Called periodically by the heartbeat worker.
        """
        results = {}
        now = datetime.now(timezone.utc)

        integrations = db.query(Integration).filter(
            Integration.workspace_id == self.workspace_id,
            Integration.status == IntegrationStatus.CONNECTED,
        ).all()

        for integration in integrations:
            meta = integration.metadata_json or {}
            provider = str(integration.provider).lower()

            # Gmail watch renewal
            if "google" in provider or "gmail" in provider:
                watch_info = meta.get("gmail_watch", {})
                expiration_ms = watch_info.get("expiration")
                if expiration_ms:
                    expires_at = datetime.fromtimestamp(int(expiration_ms) / 1000, tz=timezone.utc)
                    renewal_threshold = expires_at - timedelta(days=GMAIL_WATCH_RENEWAL_DAYS)
                    if now >= renewal_threshold:
                        logger.info(f"Renewing Gmail watch for workspace {self.workspace_id}")
                        result = await self.setup_gmail_watch(db, user_id=user_id)
                        results["google"] = result
                elif watch_info.get("setup_at"):
                    # Watch exists but no expiration tracked — renew proactively
                    setup_at = datetime.fromisoformat(watch_info["setup_at"])
                    if (now - setup_at).days >= GMAIL_WATCH_RENEWAL_DAYS:
                        result = await self.setup_gmail_watch(db, user_id=user_id)
                        results["google"] = result

            # Graph subscription renewal
            if "microsoft" in provider or "outlook" in provider:
                sub_info = meta.get("graph_subscription", {})
                expiration_str = sub_info.get("expiration")
                if expiration_str:
                    try:
                        expires_at = datetime.fromisoformat(expiration_str)
                        if expires_at.tzinfo is None:
                            expires_at = expires_at.replace(tzinfo=timezone.utc)
                        renewal_threshold = expires_at - timedelta(days=GRAPH_SUB_RENEWAL_DAYS)
                        if now >= renewal_threshold:
                            logger.info(f"Renewing Graph subscription for workspace {self.workspace_id}")
                            result = await self.setup_graph_subscription(db, user_id=user_id)
                            results["microsoft"] = result
                    except (ValueError, TypeError):
                        # Invalid date, just renew
                        result = await self.setup_graph_subscription(db, user_id=user_id)
                        results["microsoft"] = result

        return results

    # ── Setup All Watches ───────────────────────────────────────────────

    async def setup_all_watches(self, db: Session, *, user_id: str) -> dict[str, Any]:
        """
        Convenience method to set up push notifications for all
        connected providers in one call.
        """
        results = {}

        integrations = db.query(Integration).filter(
            Integration.workspace_id == self.workspace_id,
            Integration.status == IntegrationStatus.CONNECTED,
        ).all()

        for integration in integrations:
            provider = str(integration.provider).lower()
            if "google" in provider or "gmail" in provider:
                results["google"] = await self.setup_gmail_watch(db, user_id=user_id)
            elif "microsoft" in provider or "outlook" in provider:
                results["microsoft"] = await self.setup_graph_subscription(db, user_id=user_id)

        return results
