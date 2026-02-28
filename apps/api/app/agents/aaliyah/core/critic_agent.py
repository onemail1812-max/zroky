import logging
import json
from enum import Enum
from pydantic import BaseModel, Field
from typing import Optional, List

from app.services.brain.core import Brain
from app.config import settings

logger = logging.getLogger(__name__)


class CriticStatus(str, Enum):
    APPROVED = "approved"
    REJECTED = "rejected"
    MODIFIED = "modified"


class CriticResponse(BaseModel):
    status: CriticStatus = Field(..., description="approved, rejected, or modified")
    feedback: str = Field(..., description="Why the draft passed or failed the rubric")
    rewritten_body: Optional[str] = Field(None, description="The corrected draft body if status is modified or rejected")


class CriticAgent:
    """
    The 'Second Brain' responsible for reviewing auto-drafts.
    Enforces hallucination checks, tone matching, and logical safety.
    """
    
    def __init__(self):
        self.brain = Brain()

    async def review_draft(self, original_email_content: str, drafted_body: str, context: str) -> CriticResponse:
        """Review the drafted email against the context and rules."""
        
        system_prompt = (
            "You are the 'Critic Agent', a strict quality assurance reviewer for an Executive Assistant AI."
            "You must review the drafted email reply against the original email and the provided context facts.\n\n"
            "YOUR RUBRIC:\n"
            "1. NO HALLUCINATION: Ensure NO dates, prices, meeting links, names, or promises were invented. Any fact not explicitly in the Context or Original Email is a failure.\n"
            "2. NO AI FLUFF: Ensure the draft sounds like a real human. Fail the draft if it contains words like 'delve', 'tapestry', 'testament', 'underscores', or 'crucial'.\n"
            "3. LOGIC: Ensure the draft directly answers the sender's core intent.\n\n"
            "If the draft violates the rubric, you MUST rewrite it to fix the errors and set status to 'modified'.\n"
            "Output valid JSON strictly matching the schema."
        )

        user_prompt = f"""
        **Context/Facts Available to the Drafter:**
        {context}

        **Original Email Received:**
        {original_email_content}

        **Draft to Review:**
        {drafted_body}

        **Task:** Return a JSON object with 'status' (approved, rejected, or modified), 'feedback', and 'rewritten_body' (only if rewriting).
        """

        try:
            # We use the reasoning/verify model if available, otherwise fallback to the draft standard
            model = settings.AALIYAH_VERIFY_MODEL if hasattr(settings, 'AALIYAH_VERIFY_MODEL') else settings.AALIYAH_DRAFT_MODEL
            
            response = await self.brain.think_json(
                prompt=user_prompt,
                response_model=CriticResponse,
                system_prompt=system_prompt,
                model_override=model,
                temperature_override=0.1
            )
            return response
        except Exception as e:
            logger.error(f"Critic Agent failed to review draft: {e}")
            # Fail-safe open: If the critic crashes, we default to the original draft but log the warning.
            return CriticResponse(status=CriticStatus.APPROVED, feedback="Critic crashed, default approved.")
