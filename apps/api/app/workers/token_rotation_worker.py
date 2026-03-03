"""Automated OAuth token rotation worker.

Periodically refreshes OAuth tokens before expiration to prevent auth failures.
Runs every 30 minutes to check all workspaces and integrations.
"""

import logging
import json
import time
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any

from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.integration import Integration, IntegrationProvider
from app.models.workspace import Workspace
from app.services.integrations.token_store import encrypt_token, decrypt_token, _refresh_access_token

logger = logging.getLogger(__name__)


class TokenRotationWorker:
    """Handles proactive OAuth token refresh across all workspaces."""
    
    def __init__(self):
        self.db: Optional[Session] = None
        self.refresh_window_seconds = 300  # Refresh if expiring within 5 minutes
        
    async def run_periodic_rotation(self):
        """
        Main periodic task: Scan all integrations and refresh tokens near expiration.
        Called every 30 minutes by the orchestrator.
        """
        logger.info("Starting periodic token rotation scan")
        self.db = SessionLocal()
        
        try:
            # Get all integrations that are marked as CONNECTED
            integrations = self.db.query(Integration).filter(
                Integration.status == "CONNECTED"
            ).all()
            
            if not integrations:
                logger.debug("No connected integrations to rotate")
                return
            
            rotated_count = 0
            failed_count = 0
            
            for integration in integrations:
                try:
                    refreshed = await self._check_and_refresh_token(integration)
                    if refreshed:
                        rotated_count += 1
                        logger.info(
                            f"Token rotated: workspace={integration.workspace_id}, "
                            f"provider={integration.provider}"
                        )
                except Exception as e:
                    failed_count += 1
                    logger.warning(
                        f"Token rotation failed for workspace={integration.workspace_id}, "
                        f"provider={integration.provider}: {str(e)}"
                    )
            
            logger.info(
                f"Token rotation completed: rotated={rotated_count}, "
                f"failed={failed_count}, total={len(integrations)}"
            )
            
        except Exception as e:
            logger.error(f"Token rotation worker crashed: {str(e)}", exc_info=True)
        finally:
            if self.db:
                self.db.close()
    
    async def _check_and_refresh_token(self, integration: Integration) -> bool:
        """
        Check if a token needs rotation. Refresh if:
        - expires_at is set and token is expiring within the window
        - refresh_token exists (defensive refresh if expiry is unknown)
        
        Returns True if token was refreshed, False otherwise.
        """
        if not integration.token_encrypted:
            logger.debug(f"No token for integration {integration.id}")
            return False
        
        try:
            # Decrypt and parse token
            raw_token = decrypt_token(integration.token_encrypted)
            if not raw_token:
                # Try as fallback plaintext
                raw_token = integration.token_encrypted
            
            try:
                token_data = json.loads(raw_token)
            except (json.JSONDecodeError, TypeError):
                # Token is plaintext, can't refresh
                logger.debug(f"Token is plaintext, skipping rotation for {integration.id}")
                return False
            
            if not isinstance(token_data, dict):
                return False
            
            # Check if token needs refresh
            expires_at = token_data.get("expires_at")
            refresh_token = token_data.get("refresh_token")
            access_token = token_data.get("access_token")
            
            current_time = int(time.time())
            needs_refresh = False
            reason = None
            
            # Condition 1: Token is expired or expiring within the window
            if expires_at:
                time_until_expiry = int(expires_at) - current_time
                if time_until_expiry < self.refresh_window_seconds:
                    needs_refresh = True
                    reason = f"Expiring in {time_until_expiry}s"
                else:
                    logger.debug(
                        f"Token {integration.id} expires in {time_until_expiry}s, "
                        f"no refresh needed"
                    )
                    return False
            
            # Condition 2: No access token but we have a refresh token (stale state)
            elif refresh_token and not access_token:
                needs_refresh = True
                reason = "No access token but refresh token available"
            
            else:
                # No expiry info and we can't refresh — skip
                logger.debug(f"No expiry info for token {integration.id}, skipping")
                return False
            
            if not needs_refresh:
                return False
            
            if not refresh_token:
                logger.warning(
                    f"Token {integration.id} needs refresh but no refresh_token available"
                )
                # Mark integration as needing reconnect
                integration.status = "NEEDS_RECONNECT"
                self.db.commit()
                return False
            
            # Perform the refresh
            logger.info(f"Refreshing token {integration.id} — {reason}")
            new_token_data = _refresh_access_token(
                provider=integration.provider.value,
                refresh_token=refresh_token
            )
            
            if not new_token_data or "access_token" not in new_token_data:
                logger.error(f"Token refresh failed for {integration.id}")
                integration.status = "ERROR"
                self.db.commit()
                return False
            
            # Update token data
            token_data["access_token"] = new_token_data["access_token"]
            if "expires_in" in new_token_data:
                token_data["expires_at"] = int(time.time()) + int(new_token_data["expires_in"])
            if "refresh_token" in new_token_data:
                token_data["refresh_token"] = new_token_data["refresh_token"]
            
            # Re-encrypt and save
            integration.token_encrypted = encrypt_token(token_data)
            integration.updated_at = datetime.now(timezone.utc)
            
            # Ensure status is CONNECTED (in case it was ERROR)
            integration.status = "CONNECTED"
            
            self.db.commit()
            logger.info(f"Token {integration.id} refreshed successfully")
            return True
            
        except Exception as e:
            logger.error(f"Error checking token {integration.id}: {str(e)}", exc_info=True)
            return False


async def start_token_rotation_worker():
    """
    Background task launcher for token rotation.
    Should be called during app startup to begin the periodic refresh cycle.
    """
    import asyncio
    
    worker = TokenRotationWorker()
    
    while True:
        try:
            # Run rotation every 30 minutes
            await asyncio.sleep(30 * 60)
            await worker.run_periodic_rotation()
        except Exception as e:
            logger.error(f"Token rotation worker crashed: {str(e)}")
            await asyncio.sleep(5 * 60)  # Wait 5 minutes before retry
