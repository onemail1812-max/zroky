from datetime import datetime
from typing import List, Optional, Dict
from app.models.email import EmailMessage
from app.services.llm.openrouter_client import OpenRouterClient
from app.config import settings

class LLMService:
    """
    Clean LLM service layer distinguishing between drafting and reasoning.
    """
    
    def __init__(self, client: OpenRouterClient):
        self.client = client
        
    async def draft_reply(self, email: EmailMessage, reasoning_context: str = "") -> str:
        """
        Drafts a reply using a fast, capable model (Gemini).
        """
        model = settings.aaliyah_draft_model
        
        system_prompt = """You are an executive assistant for a busy professional.
Draft a concise, polite reply. 
- Keep it under 3 sentences unless complex.
- Do not use aggressive formatting (no bold/italics unnecessarily).
- Match the sender's tone (professional but approachable).
- If unsure, stay neutral.
"""
        
        user_prompt = f"""
        Email to reply to:
        Sender: {email.sender.get('name', 'Unknown')} <{email.sender.get('email')}>
        Subject: {email.subject}
        Content:
        {email.body_cleaned}
        
        {reasoning_context}
        
        Only output the reply body. No subject line.
        """
        
        try:
            return await self.client.generate(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                model=model,
                temperature=0.7
            )
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Drafting failed: {e}")
            return "I received your email and will get back to you shortly." # Safe fallback

    async def summarize_thread(self, email: EmailMessage) -> List[str]:
        """
        Summarizes the thread using a reasoning-capable model (DeepSeek R1).
        Returns 3 bullet points: Context, Key Ask, Next Step.
        """
        model = settings.aaliyah_reasoning_model
        
        prompt = f"""
        Analyze this email thread and extract exactly 3 bullet points:
        1. Context: What is this about?
        2. Key Ask: What do they want?
        3. Next Step: What should I do?
        
        Email:
        {email.body_cleaned}
        
        Output format: json list of strings.
        Example: ["Context: Project update", "Ask: Review attached deck", "Next: Reply with feedback by Friday"]
        """
        
        try:
            response = await self.client.generate(
                messages=[{"role": "user", "content": prompt}],
                model=model,
                temperature=0.3, # Low temp for factual extraction
                response_format={"type": "json_object"}
            )
            
            # DeepSeek might return JSON or text. Let's try to parse.
            # If JSON mode requested but model is simple, it often just outputs JSON text.
            import json
            try:
                # Naive JSON extraction if embedded in markdown
                clean_resp = response.replace("```json", "").replace("```", "").strip()
                data = json.loads(clean_resp)
                if isinstance(data, list): return data
                if isinstance(data, dict): return list(data.values())
            except:
                # Fallback: Split by lines
                lines = [l.strip("- ").strip() for l in response.strip().split("\n") if l.strip()]
                return lines[:3]
                
            return []
            
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Summarization failed: {e}")
            # Fallback to Gemini if Reasoning model fails (e.g. rate limit on free tier)
            logger.info("Falling back to draft model for summary...")
            try:
                return await self._summarize_fallback(email)
            except:
                return ["Could not generate summary."]

    async def _summarize_fallback(self, email: EmailMessage) -> List[str]:
        """Fallback to Gemini for summary"""
        response = await self.client.generate(
            messages=[{"role": "user", "content": f"Summarize in 3 bullet points: {email.body_cleaned}"}],
            model=settings.aaliyah_draft_model
        )
        return [l.strip("- ").strip() for l in response.strip().split("\n") if l.strip()][:3]

# Singleton
from app.services.llm.openrouter_client import openrouter_client
llm_service = LLMService(openrouter_client)
