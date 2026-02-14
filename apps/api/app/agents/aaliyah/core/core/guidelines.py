"""
Aaliyah Onboarding Guidelines
Manages the structured questionnaire for Aaliyah to understand user preferences.
"""

from typing import Dict, List, Any
from pydantic import BaseModel

class AaliyahGuidelineForm(BaseModel):
    communication_style: str  # Direct, Friendly, Formal
    meeting_preferences: List[str]  # "No Fridays", "15min buffers"
    priority_contacts: List[str]  # "Steve Jobs", "Mom"
    travel_preferences: Dict[str, str]  # "Aisle seat", "Delta Airlines"
    email_signature: str

class GuidelineManager:
    def __init__(self, workspace_id: str):
        self.workspace_id = workspace_id
        
    def get_template(self) -> Dict[str, Any]:
        """Return the blank form structure for the UI"""
        return {
            "sections": [
                {
                    "id": "communication",
                    "title": "Communication Style",
                    "questions": [
                        {"id": "tone", "type": "select", "options": ["Direct & Brief", "Friendly & Warm", "Professional & Formal"], "label": "How should Aaliyah sound?"},
                        {"id": "signature", "type": "text", "label": "Default Email Signature"}
                    ]
                },
                {
                    "id": "calendar",
                    "title": "Calendar Rules",
                    "questions": [
                        {"id": "buffer", "type": "number", "label": "Buffer between meetings (minutes)", "default": 15},
                        {"id": "start_time", "type": "time", "label": "Earliest meeting time", "default": "09:00"},
                        {"id": "end_time", "type": "time", "label": "Latest meeting time", "default": "17:00"}
                    ]
                }
            ]
        }
        
    async def save_guidelines(self, data: Dict[str, Any]) -> bool:
        """Save user answers to the Vector DB / Database"""
        # Save to DB
        # Embed key preferences into Aaliyah's context
        return True
