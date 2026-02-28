import re
import logging

logger = logging.getLogger(__name__)

class HumanizerFilter:
    """
    Applies the "Zero Fluff" rules defined by the WikiProject AI Cleanup.
    Strips common AI filler words and syntactic patterns.
    """

    # 1. Undue Emphasis & Bloat Words
    BANNED_WORDS = [
        r"\bdelve\b", r"\btapestry\b", r"\btestament\b", r"\bunderscores\b",
        r"\bshowcases\b", r"\bgroundbreaking\b", r"\bprofound\b", r"\bintricacies\b",
        r"\bcatalyst\b", r"\bpivotal\b", r"\bcrucial\b", r"\bvital\b"
    ]

    # 2. Copula Avoidance (Replacing flowery verbs with 'is' or 'are')
    REPLACEMENTS = [
        (r"\bserves as\b", "is"),
        (r"\bstands as\b", "is"),
        (r"\bfunctions as\b", "is"),
        (r"\brepresents a shift\b", "changes"),
        (r"\bboasts\b", "has"),
        (r"\bfeatures\b", "includes"),
        (r"\bIn order to\b", "To"),
        (r"\bAt this point in time\b", "Now"),
        (r"\bDue to the fact that\b", "Because")
    ]

    @staticmethod
    def apply(text: str) -> str:
        """Process the text through the Humanizer rules."""
        if not text:
            return ""

        original = text
        
        # Strip Banned Words (If they exist, we usually have to remove the sentence or replace. 
        # For a simple filter without breaking grammar, we can just replace them with neutral words 
        # or rely on the Critic to have flagged them. But for safety, we swap them).
        
        # Let's apply direct string replacements first
        for pattern, replacement in HumanizerFilter.REPLACEMENTS:
            text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)

        # Remove "Great question!" or chatbot artifacts
        text = re.sub(r"^(Great question!|I hope this helps!|Let me know if.*?)\n*\s*", "", text, flags=re.IGNORECASE)
        text = re.sub(r"(I hope this helps!|Let me know if.*?)$", "", text, flags=re.IGNORECASE)

        # Standardize quotes
        text = text.replace("“", '"').replace("”", '"').replace("‘", "'").replace("’", "'")

        logger.debug(f"Humanizer applied to text. Original Len={len(original)}, New Len={len(text)}")
        return text.strip()
