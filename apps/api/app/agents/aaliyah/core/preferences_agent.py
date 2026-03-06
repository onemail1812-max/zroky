
"""Agent for interpreting natural language preference updates."""
from __future__ import annotations

import json
import logging
from typing import Any, Dict, Optional

from app.services.brain.core import Brain
from app.services.brain.schemas.models import ModelType
from app.agents.aaliyah.core.labeling_rules import ALLOWED_LABELS

logger = logging.getLogger(__name__)

class PreferencesAgent:
    def __init__(self, brain: Optional[Brain] = None):
        self.brain = brain or Brain()

    async def interpret_update(self, user_query: str, current_prefs: Dict[str, Any]) -> Dict[str, Any]:
        """
        Interprets a user's natural language request to update labeling preferences.
        Returns a dictionary of parameters suitable for LabelingRulesEngine.update_preferences.
        """
        
        system_prompt = (
            "You are Aaliyah's configuration assistant. "
            "Your goal is to translate user instructions into structured settings updates. "
            f"Allowed Labels: {', '.join(ALLOWED_LABELS)}. "
            "Understand concepts like 'VIPs', 'Internal Domains', 'Keywords', and 'Auto-Labeling'."
        )

        user_prompt = f"""
Current Settings:
- VIP Senders: {current_prefs.get('vip_senders')}
- Internal Domains: {current_prefs.get('internal_domains')}
- Keyword Rules: {json.dumps(current_prefs.get('keyword_rules'))}
- Auto-Label Enabled: {current_prefs.get('auto_label_enabled')}

User Instruction: "{user_query}"

Task: determine which settings to update.
- If the user wants to add a sender to VIPs, return "vip_senders" with the updated list.
- If the user wants to add/remove keywords for a label, return "keyword_rules" with the updated dictionary.
- If the user wants to mark a domain as internal, return "internal_domains".
- If the user wants to enable/disable auto-labeling, return "auto_label_enabled".

Return valid JSON only. Omit fields that should not change.
Example: {{"vip_senders": ["contact@company.com", "other@domain.com"]}}
"""
        try:
            response = await self.brain.think(
                prompt=user_prompt,
                system_prompt=system_prompt,
                model_override=ModelType.FAST.value,
                temperature_override=0.1
            )
            
            content = response.content.strip()
            # Robust JSON extraction
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()
            
            # Simple bracket finding fallback
            if "{" in content and "}" in content:
                 start = content.find("{")
                 end = content.rfind("}")
                 content = content[start:end+1]
                 
            updates = json.loads(content)
                 
            if not isinstance(updates, dict):
                return {}

            valid_keys = {"enabled_labels", "vip_senders", "internal_domains", "keyword_rules", "auto_label_enabled", "auto_sync_interval_seconds"}
            filtered = {k: v for k, v in updates.items() if k in valid_keys}
            


            return filtered

        except Exception as e:
            logger.error(f"Failed to interpret preference update: {e}")
            return {}
