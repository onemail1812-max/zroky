"""
Standardized Schema Definitions for Brain
Encourages strict typing for inputs/outputs.
"""

from enum import Enum

class ModelType(str, Enum):
    REASONING = "deepseek/deepseek-r1"              # Complex multi-step tasks
    FAST = "google/gemini-2.5-flash-lite"            # Fast triage/classification
    CREATIVE = "google/gemini-2.5-flash"             # Creative drafting
    VISION = "google/gemini-2.5-flash"               # Image analysis
    BRIEFING = "google/gemini-2.5-flash-lite"        # Lightweight briefings & summaries
    CHAT = "google/gemini-2.5-flash"                 # Chat responses (fast + accurate)


