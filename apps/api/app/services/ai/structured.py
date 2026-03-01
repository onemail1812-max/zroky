from typing import Optional, List
from pydantic import BaseModel, Field
from enum import Enum

class EmailCategory(str, Enum):
    PRIORITY = "priority"
    NEEDS_REPLY = "needs_reply"
    FYI = "fyi"
    NEWSLETTER = "newsletter"
    DRAFT = "draft"
    CLEANED = "cleaned"

class EmailTriage(BaseModel):
    """Schema for AI-based email triage and categorization."""
    category: EmailCategory = Field(..., description="The triage category for this email.")
    priority_score: int = Field(..., ge=1, le=10, description="1-10 score of how urgent this is.")
    summary: str = Field(..., description="A 1-sentence summary of the email.")
    action_items: List[str] = Field(default_factory=list, description="List of concrete action items found in the email.")
    reasoning: str = Field(..., description="Short explanation of why this category was chosen (reduces hallucination).")
    suggested_reply_intent: Optional[str] = Field(None, description="The intended tone/content of a reply if needed.")

def get_instructor_client():
    import instructor
    from openai import OpenAI
    from app.config import settings
    
    # We use OpenAI-compatible client (works with DeepSeek/OpenRouter)
    client = OpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=settings.BRAIN_API_KEY,
    )
    
    return instructor.from_openai(client)
