"""Webhook Receiver — Handles push notifications from Google (PubSub) and Microsoft (Graph)."""
import logging
import base64
import json
from fastapi import APIRouter, Request, HTTPException
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.core.queue import queue, JobType
from app.models.integration import Integration

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/webhooks", tags=["webhooks"])

@router.post("/google")
async def google_pubsub_webhook(request: Request):
    """
    Handles Gmail push notifications via Google Cloud Pub/Sub.
    Expects a message containing the email address.
    """
    try:
        data = await request.json()
        message = data.get("message", {})
        if not message:
            return {"status": "no_message"}

        # Pub/Sub payload is base64 encoded
        encoded_data = message.get("data")
        if not encoded_data:
            return {"status": "no_data"}
            
        decoded_bytes = base64.b64decode(encoded_data)
        decoded_json = json.loads(decoded_bytes.decode("utf-8"))
        email_address = decoded_json.get("emailAddress")

        if not email_address:
             return {"status": "no_email"}

        logger.info(f"Incoming Gmail Webhook for {email_address}")

        db = SessionLocal()
        try:
            # Find workspace by email integration
            # Note: In a production app, we would use a dedicated 'subscription_id' map.
            integration = db.query(Integration).filter(
                Integration.username == email_address
            ).first()

            if integration:
                await queue.enqueue(
                    job_type=JobType.SYNC_PROVIDER.value,
                    payload={"workspace_id": integration.workspace_id, "provider": "google"},
                    dedupe_id=f"webhook_sync:google:{integration.workspace_id}"
                )
                logger.info(f"Queued instant sync for workspace {integration.workspace_id}")
        finally:
            db.close()

        return {"status": "accepted"}
    except Exception as e:
        logger.error(f"Google Webhook Error: {e}")
        return {"status": "error", "detail": str(e)}

@router.post("/microsoft")
async def microsoft_graph_webhook(request: Request):
    """
    Handles Outlook push notifications via Microsoft Graph Webhooks.
    """
    # Microsoft Graph sends a 'validationToken' as a query param on initial setup
    params = request.query_params
    if "validationToken" in params:
        return params["validationToken"]

    # Notification payload
    try:
        data = await request.json()
        notifications = data.get("value", [])
        if not notifications:
            return {"status": "no_notifications"}

        db = SessionLocal()
        try:
            for note in notifications:
                sub_id = note.get("subscriptionId")
                # Look up integration by subscriptionId stored in metadata_json
                # (Assumes we store subscriptionId when setting up Graph webhook)
                integration = db.query(Integration).filter(
                    Integration.metadata_json.contains({"subscription_id": sub_id})
                ).first()

                if integration:
                    await queue.enqueue(
                        job_type=JobType.SYNC_PROVIDER.value,
                        payload={"workspace_id": integration.workspace_id, "provider": "microsoft"},
                        dedupe_id=f"webhook_sync:microsoft:{integration.workspace_id}"
                    )
        finally:
            db.close()

        return {"status": "accepted"}
    except Exception as e:
        logger.error(f"Microsoft Webhook Error: {e}")
        return {"status": "error"}
