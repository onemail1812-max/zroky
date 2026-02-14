"""
Golden Examples (retrieval-only).

Rule:
- Only learn/store from human-approved outcomes (sent emails or minimal-edit approvals).
- Never learn from unapproved AI drafts or summaries.
"""

from __future__ import annotations

import difflib
from typing import Optional

from sqlalchemy.orm import Session


class GoldenExamplesService:
    def __init__(self, db: Optional[Session]):
        self.db = db

    def is_minimal_edit(self, before: str, after: str, threshold: float = 0.85) -> bool:
        """
        Heuristic: edits are "minimal" if text similarity stays high.
        """
        b = (before or "").strip()
        a = (after or "").strip()
        if not b or not a:
            return False
        ratio = difflib.SequenceMatcher(None, b, a).ratio()
        return ratio >= threshold

