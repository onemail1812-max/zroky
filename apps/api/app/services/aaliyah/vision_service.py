import base64
import logging
from typing import Any, Dict, Optional

from app.services.brain.core import Brain
from app.integrations.gmail_client import GmailClient
from app.models.integration import IntegrationProvider
from app.database import SessionLocal
from app.services.integrations.token_store import get_valid_token

logger = logging.getLogger(__name__)

class VisionService:
    """Service for Analyzing email attachments (Images, PDFs, Excel) using VLMs."""

    def __init__(self, workspace_id: str):
        self.workspace_id = workspace_id
        self.brain = Brain()

    async def analyze_attachment(
        self, 
        message_id: str, 
        attachment_id: str, 
        filename: str, 
        mime_type: str
    ) -> Dict[str, Any]:
        """Fetch and analyze an attachment using Vision capabilities."""
        db = SessionLocal()
        try:
            # 1. Get Gmail Client
            token = get_valid_token(db, self.workspace_id, IntegrationProvider.GOOGLE_GMAIL.value)
            if not token:
                logger.warning(f"No Gmail token found for workspace {self.workspace_id}")
                return {"error": "Authentication failed"}

            client = GmailClient(token)

            # 2. Fetch raw attachment data
            logger.info(f"Fetching attachment {attachment_id} for message {message_id}")
            attachment_resp = await client.get_attachment_data(message_id, attachment_id)
            
            raw_data = attachment_resp.get("data")
            if not raw_data:
                logger.error(f"No data returned for attachment {attachment_id}")
                return {"error": "No attachment data"}

            # 3. Analyze with Brain (VLM)
            # Note: We pass the base64 data directly. Gmail API returns url-safe base64.
            # Brain expects standard base64 or a full data URI.
            
            prompt = f"""
            Analyze the following attachment from an email.
            Filename: {filename}
            Mime Type: {mime_type}

            Please provide:
            1. A concise summary of the content.
            2. Any critical dates, amounts, or action items found.
            3. Key entities (people, companies) mentioned.
            
            Format your response as valid JSON with keys: 'summary', 'actions', 'entities', 'metadata'.
            """

            # Handle different mime types
            # For now, we only support images for direct VLM analysis in this example
            # In a full implementation, we'd handle PDF-to-Image or PDF-Text extraction too
            
            images = [raw_data] # Brain.think handles prefixing if missing
            
            # Use a vision-capable model
            # Prefer gemini-flash or gemini-pro-vision if available via OpenRouter
            model_override = "google/gemini-flash-1.5"

            response = await self.brain.think(
                prompt=prompt,
                system_prompt="You are a meticulous visual document analyst. Extract precise facts from attachments.",
                images=images,
                model_override=model_override
            )

            # 4. Parse response
            # (Basic parsing for now, in production we'd use safe_json_excerpt)
            import json
            try:
                # Strip markdown blocks if present
                content = response.content.strip()
                if content.startswith("```json"):
                    content = content[7:-3].strip()
                result = json.loads(content)
            except Exception:
                result = {"raw": response.content}

            return result

        except Exception as e:
            logger.error(f"Vision analysis failed: {e}")
            return {"error": str(e)}
        finally:
            db.close()
