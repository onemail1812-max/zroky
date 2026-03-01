import re
import logging

logger = logging.getLogger(__name__)

class HumanizerFilter:
    """
    Applies the "Zero Fluff" rules defined by the WikiProject AI Cleanup.
    Strips common AI filler words and syntactic patterns.
    """

    # 1. Banned AI Vocabulary & Promotional Words
    BANNED_WORDS = {
        # High-frequency AI words
        r"\bdelve(?:s|d)?\b": "explore",
        r"\btapestry\b": "mix",
        r"\btestament\b": "sign",
        r"\bunderscore[sd]?\b": "show",
        r"\bshowcase[sd]?\b": "show",
        r"\bgroundbreaking\b": "new",
        r"\bprofound(?:ly)?\b": "significant",
        r"\bintricacies\b": "details",
        r"\bcatalyst\b": "driver",
        r"\bpivotal\b": "important",
        r"\bcrucial(?:ly)?\b": "important",
        r"\bvital(?:ly)?\b": "important",
        r"\bseamless(?:ly)?\b": "smooth",
        r"\bleverage[sd]?\b": "use",
        r"\bcommence[sd]?\b": "start",
        r"\butilize[sd]?\b": "use",
        r"\bfacilitate[sd]?\b": "help",
        r"\bembark(?:s|ed)?\b": "start",
        r"\blandscape\b": "field",
        r"\bparadigm\b": "model",
        r"\bholistic(?:ally)?\b": "complete",
        r"\brobust\b": "strong",
        r"\binnovative\b": "new",
        r"\bcutting[- ]edge\b": "modern",
        r"\bgame[- ]chang(?:er|ing)\b": "important",
        r"\bsynerg(?:y|ies|istic)\b": "combined benefit",
        r"\badditionally\b": "also",
        r"\balign with\b": "match",
        r"\benhance[sd]?\b": "improve",
        r"\bfoster(?:ing|ed|s)?\b": "build",
        r"\bgarner[sd]?\b": "get",
        r"\binterplay\b": "connection",
        r"\bintricate\b": "detailed",
        r"\bvaluable\b": "useful",
        r"\bvibrant\b": "active",
        r"\bboasts? a\b": "has a",
        r"\brich cultural heritage\b": "history",
        r"\bstunning\b": "great",
        r"\bnestled\b": "located",
        r"\bin the heart of\b": "in",
    }

    # 2. Complex Replacements, Copula Avoidance, and Filler removal
    REPLACEMENTS = [
        # Copula Avoidance
        (r"\bserves as\b", "is"),
        (r"\bstands as\b", "is"),
        (r"\bfunctions as\b", "is"),
        (r"\brepresents a shift\b", "changes"),
        (r"\bIn order to\b", "To"),
        (r"\bAt this point in time\b", "Now"),
        (r"\bDue to the fact that\b", "Because"),
        (r"\bIt is worth noting that\b", "Note:"),
        (r"\bIt's important to note that\b", "Note:"),
        (r"\bplays a (?:crucial|vital|pivotal|key) role\b", "matters"),
        
        # Negative parallelisms (standardize then simplify)
        (r"\bbut\s+(.*?)\s+also\b", r"but \1"),
        (r"\bnot\s+only\s+(.*?)\s+but\s+(.*?)\b", r"\1 and \2"),
        
        # False ranges
        (r"\bfrom (.*?) to (.*?),? from (.*?) to (.*?)\b", r"\1, \2, \3, and \4"),

        # Superficial -ing endings (tacked on results)
        (r",\s+(?:highlighting|underscoring|emphasizing|ensuring|reflecting|symbolizing|contributing to|cultivating|fostering|encompassing|showcasing)\s+.*?\.", "."),
        
        # Filler
        (r"\bThe system has the ability to\b", "The system can"),
        (r"\bIt is important to note that the data shows\b", "The data shows"),
    ]

    @staticmethod
    def apply(text: str) -> str:
        """Process the text through the Humanizer rules."""
        if not text:
            return ""

        original = text

        # Helper to preserve case for sentence starts
        def replace_preserve_case(match, repl):
            m_text = match.group(0)
            if m_text.istitle():
                return repl.capitalize()
            return repl

        # 1. Replace banned AI buzzwords
        for pattern, replacement in HumanizerFilter.BANNED_WORDS.items():
            text = re.sub(pattern, lambda m, r=replacement: replace_preserve_case(m, r), text, flags=re.IGNORECASE)

        # 2. Apply complex replacements
        for pattern, replacement in HumanizerFilter.REPLACEMENTS:
            text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)


        # 3. Remove chatbot artifacts
        text = re.sub(r"^(Great question!|Certainly!|Of course!|I hope this helps!|Let me know if.*?)\n*\s*", "", text, flags=re.IGNORECASE)
        text = re.sub(r"(I hope this helps!|Let me know if.*?)$", "", text, flags=re.IGNORECASE)

        # 4. Style hygiene
        # Standardize smart quotes
        text = text.replace("\u201c", '"').replace("\u201d", '"').replace("\u2018", "'").replace("\u2019", "'")
        # em-dash to comma or dash
        text = text.replace("\u2014", ", ")
        # Remove boldface for headers (often AI artifact)
        text = re.sub(r"\*\*(.*?)\*\*", r"\1", text)
        # Collapse double spaces
        text = re.sub(r"  +", " ", text)

        logger.debug(f"Humanizer applied to text. Original Len={len(original)}, New Len={len(text)}")
        return text.strip()

