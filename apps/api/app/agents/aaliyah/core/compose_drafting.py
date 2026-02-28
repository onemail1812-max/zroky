"""Agent to handle conversational Compose from Scratch requests."""

from __future__ import annotations

import json
import logging
from typing import Any, AsyncGenerator, Optional
from pydantic import BaseModel, Field

from sqlalchemy.orm import Session
from app.services.brain.core import Brain
from app.services.brain.schemas.models import ModelType
from app.services.brain.memory import DualStateMemory
from app.models.workspace import Workspace

logger = logging.getLogger(__name__)

class ComposeExtraction(BaseModel):
    to_recipient: str = Field(description="The exact email address or name of the person to contact. If not mentioned, return empty string.")
    cc: list[str] = Field(default_factory=list, description="List of email addresses or names for CC.")
    bcc: list[str] = Field(default_factory=list, description="List of email addresses or names for BCC.")
    subject: str = Field(description="A concise generated subject for the email.")
    body_instructions: str = Field(description="The user's instructions for what the body of the email should say.")
    context_keywords: str = Field(description="A comma-separated string of keywords related to the project/topic/recipients mentioned, used for retrieving long-term context.")
    needs_clarification: bool = Field(description="True ONLY if the user completely omitted both the recipient and the topic, OR if the recipient is highly ambiguous and cannot be guessed.")
    clarification_question: str = Field(description="A conversational question asking the user for the missing information.")

class ComposeDraftingAgent:
    def __init__(self, db: Session, workspace_id: str):
        self.db = db
        self.workspace_id = workspace_id
        self.brain = Brain()
        self.memory = DualStateMemory(db, workspace_id)

    async def handle_compose_intent(self, message: str, user_id: str) -> AsyncGenerator[dict[str, Any], None]:
        """
        Processes a 'COMPOSE_NEW' intent from the chat stream.
        Extracts recipient and instructions.
        If clear, generates a draft and emits 'compose_action'.
        If ambiguous, asks a conversational question.
        """
        # 1. Provide early feedback
        yield {"type": "status", "content": "Preparing to compose email..."}

        # 2. Add style context (optional, can be expanded to match DraftingAgent)
        workspace = self.db.query(Workspace).filter(Workspace.id == self.workspace_id).first()
        aaliyah_settings = (workspace.settings_json or {}).get("aaliyah", {})
        tone = aaliyah_settings.get("draft_tone", "professional")
        user_name = aaliyah_settings.get("user_name") or aaliyah_settings.get("first_name") or "there"

        # 3. Extract parameters using Brain
        system_prompt = (
            f"You are Aaliyah, an elite Executive Assistant for {user_name}. The user wants you to draft a brand new email. "
            "Your task is to extract the recipient (To, CC, BCC), subject, and body instructions. "
            "The user might speak in English, Hindi, or Hinglish (e.g., 'John ko mail likh quarter update ke liye'). "
            "If the user didn't provide a direct recipient, or the recipient is extremely vague ('email that guy'), set needs_clarification=True. "
            "Do NOT set needs_clarification=True if they provided a name like 'Rahul' or 'Sarah'—"
            "we can use that, and the user will fix the exact email address in the GUI later. "
            "Only ask for clarification if you genuinely have no idea who to send it to, or no idea what to write. "
            "Be fast, decisive, and bias towards action."
        )

        try:
            extraction = await self.brain.think_json(
                prompt=message,
                system_prompt=system_prompt,
                response_model=ComposeExtraction,
                model_override=ModelType.FAST.value,
                temperature_override=0.1
            )
        except Exception as e:
            logger.error(f"Compose extraction failed: {e}")
            yield {"type": "chunk", "content": "I couldn't quite understand who or what you want to email. Can you clarify?"}
            return

        # 4. Recall Long-Term Context (Feature: Context-Aware New Draft)
        yield {"type": "status", "content": "Scanning your workspace for relevant context..."}
        search_query = f"{extraction.context_keywords} {extraction.to_recipient} {extraction.body_instructions}".strip()
        memory_result = self.memory.recall(query=search_query)
        prompt_context = memory_result.get("prompt_context", "")

        # 5. Handle Ambiguity
        if extraction.needs_clarification:
            for word in extraction.clarification_question.split(" "):
                yield {"type": "chunk", "content": word + " "}
            
            # Save interaction so next turn has context
            try:
                self.memory.save_interaction(
                    source_type="chat_stream",
                    source_id=f"chat-compose-ask",
                    content_text=message,
                    metadata={"intent": "COMPOSE_NEW_CLARIFY", "reply": extraction.clarification_question}
                )
            except Exception: pass
            return

        # 6. Generate the Draft directly
        yield {"type": "status", "content": f"Drafting email for {extraction.to_recipient}..."}
        
        draft_system = (
            f"You are Aaliyah, drafting a new email for {user_name}. "
            f"Tone: {tone}. Be concise, professional, and natural. "
            "**WORKSPACE CONTEXT**: Use the provided context (projects, historical facts) to ensure the draft is accurate and grounded. "
            "If the context mentions a specific project or relationship relevant to the instructions, incorporate it naturally. "
            "DO NOT include placeholders like [Your Name] because it will be automatically signed. "
            "Write ONLY the exact body of the email."
        )
        
        draft_prompt = (
            f"Recipient: {extraction.to_recipient}\n"
            f"Subject Context: {extraction.subject}\n"
            f"Instructions: {extraction.body_instructions}\n"
            f"\n--- LONG-TERM CONTEXT ---\n{prompt_context}\n------------------------\n\n"
            "Write the email body:"
        )

        try:
            draft_response = await self.brain.think(
                prompt=draft_prompt,
                system_prompt=draft_system,
                model_override=ModelType.FAST.value,
                temperature_override=0.5
            )
            draft_body = draft_response.content.strip()
        except Exception as e:
            logger.error(f"Compose draft generation failed: {e}")
            yield {"type": "error", "content": "I had trouble writing the draft."}
            return

        # 6. Emit the Compose Artifact
        payload = {
            "to": extraction.to_recipient,
            "cc": ", ".join(extraction.cc) if extraction.cc else "",
            "bcc": ", ".join(extraction.bcc) if extraction.bcc else "",
            "subject": extraction.subject,
            "body": draft_body,
            "intent": "COMPOSE_NEW"
        }

        # Yield the special email_action payload that the frontend understands
        yield {
            "type": "compose_action",
            "payload": payload
        }
        
        response_msg = "I've prepared the draft for you. You can review and edit it below before sending."
        for word in response_msg.split(" "):
             yield {"type": "chunk", "content": word + " "}

        # Save to memory
        try:
            self.memory.save_interaction(
                source_type="chat_stream",
                source_id=f"chat-compose-success",
                content_text=message,
                metadata={"intent": "COMPOSE_NEW", "draft_generated": True, "to": extraction.to_recipient}
            )
        except Exception: pass
