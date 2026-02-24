import json
import logging
from sqlalchemy.orm import Session
from app.services.brain.core import Brain
from app.services.brain.schemas.models import ModelType
from app.agents.aaliyah.core.llm_schemas import DraftOutput, parse_draft_output
from app.agents.aaliyah.core.ingestion.email_ingestor import EmailIngestor

logger = logging.getLogger(__name__)

class EmailHumanizer:
    def __init__(self, workspace_id: str, db: Session, brain: Brain):
        self.workspace_id = workspace_id
        self.db = db
        self.brain = brain

    async def inject_soul(self, draft_body: str, incoming_email: str, recipient_name: str) -> str:
        """
        The 'Soul Injection' pass: Takes a grounded draft and makes it sound 
        undeniably human using rhythmic variation and emotional empathy.
        Grounded in User Onboarding Preferences.
        """
        try:
            from app.models.workspace import Workspace
            workspace = self.db.query(Workspace).filter(Workspace.id == self.workspace_id).first()
            preferences = workspace.settings_json if workspace else {}
            
            tone = preferences.get("draft_tone", "Professional")
            directness = preferences.get("directness", 3)
            use_emojis = preferences.get("use_emojis", False)
            
            system_prompt = (
                "You are an expert editor specializing in 'Human Writing Patterns'. "
                "Your goal is to inject personality and 'soul' into a grounded email draft. "
                "1. VARY RHYTHM: Ensure sentences don't have the same length or pattern. "
                "2. ADAPT TO RECIPIENT: If they sound stressed, be helpful. If they are brief, be brief. "
                "3. ADD MESSY EDGES: Use occasional asides or informal closures. "
                "4. NO AI POLISH: Remove any remaining 'delve', 'moreover', or sterile tone. "
                f"STYLE: Your principal prefers a {tone} tone with a directness of {directness}/5. "
                f"{'Use subtle emojis to add warmth.' if use_emojis else 'Do NOT use emojis.'} "
                "Return the cleaned body only."
            )

            prompt = (
                f"Recipient: {recipient_name}\n"
                f"Inbound Context: {incoming_email[:500]}\n"
                f"Draft to Polish: {draft_body}\n\n"
                "Polish this into a high-soul, human response now that matches the Style DNA:"
            )

            response = await self.brain.think(
                prompt=prompt,
                system_prompt=system_prompt,
                model_override=ModelType.REASONING.value,
                temperature_override=0.4 # Higher temp for creativity/soul
            )
            
            return response.content.strip()
            
        except Exception as e:
            logger.error(f"Soul injection failed: {e}")
            return draft_body

    async def generate_humanized_draft(self, incoming_email: str, subject: str, sender: str, provider: str) -> DraftOutput:
        # Legacy support for older workers, will call logic above eventually.
        return DraftOutput(subject=f"Re: {subject}", body="Drafting failed.", tone_tags=["brief"], confidence=0.0)
