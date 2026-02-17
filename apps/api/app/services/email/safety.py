from datetime import datetime
from typing import Dict, Any, Tuple
from app.models.draft import Draft
from app.models.email import EmailMessage
import re

# Categories that are inherently unsafe
UNSAFE_KEYWORDS = {
    "money": ["$", "USD", "EUR", "invoice", "payment", "bank", "account", "transfer", "cost", "price", "discount", "fee"],
    "legal": ["contract", "agreement", "term", "condition", "nda", "sign", "lawyer", "legal", "compliance", "sue", "court"],
    "hiring": ["hire", "offer", "salary", "job", "candidate", "interview", "resume", "cv", "application", "recruit"],
    "anger": ["angry", "upset", "disappointed", "complaint", "issue", "problem", "fail", "bad service", "sucks", "hate", "wtf"],
    "uncertain": ["unsure", "check with", "don't know", "maybe", "confused", "clarify", "missing", "detail"]
}

# Categories strictly allowed for auto-send
SAFE_INTENTS = {
    "scheduling": ["meet", "call", "schedule", "availability", "time", "calendar", "zoom"],
    "acknowledgement": ["received", "noted", "thank you", "thanks", "got it", "will review", "look into"],
    "confirmation": ["confirm", "sounds good", "works for me", "okay", "agreed", "yes"]
}

def evaluate_safety(draft: Draft, email: EmailMessage, is_primary_account: bool) -> Tuple[bool, str, float]:
    """
    Returns (is_safe, reason, confidence_score)
    """
    if not is_primary_account:
        return False, "Secondary account auto-send disabled by policy", 0.0

    # 1. Check Draft Content for Unsafe Keywords
    body_lower = (draft.body or "").lower()
    subject_lower = (draft.subject or "").lower()
    content = f"{subject_lower} {body_lower}"
    
    for category, keywords in UNSAFE_KEYWORDS.items():
        if any(k in content for k in keywords):
            return False, f"Contains unsafe keywords ({category})", 0.0
            
    # 2. Check Original Email for High-Risk Context (escalations)
    orig_content = (email.body_cleaned or "").lower()
    for k in UNSAFE_KEYWORDS["anger"]:
        if k in orig_content:
             return False, "Original email detected as high-risk (anger/complaint)", 0.0
             
    # 3. Check for Safe Intent
    # Draft must be clearly one of the safe categories
    matched_intent = None
    for intent, keywords in SAFE_INTENTS.items():
        if any(k in body_lower for k in keywords):
            matched_intent = intent
            break
            
    if not matched_intent:
        return False, "Draft intent not recognized as explicitly safe", 0.5
        
    # 4. Success
    return True, f"Safe: {matched_intent}", 0.95
