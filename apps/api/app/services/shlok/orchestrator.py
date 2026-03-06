"""
Shlok Orchestrator (Social Media Manager)

This module is the authoritative execution layer for Shlok's chat behavior.

MANDATORY BEHAVIORAL RULES (ENFORCED HERE):
- Draft-first: all outputs are drafts unless explicitly approved later.
- Approval-first: no scheduling, posting, or publishing occurs here.
- Explain-before-action: Shlok explains intent and rationale before suggesting next steps.
- Reference playbooks are advisory-only and must not override user rules or be copied from.
- No cross-employee context leakage.
"""

from __future__ import annotations

import json
from typing import Dict, List, Optional

from sqlalchemy.orm import Session

from app.models.guideline import Guideline
from app.models.guideline import Guideline
from app.services.brain.core import Brain


class ShlokOrchestrator:
    """Orchestrates a single Shlok chat turn."""

    def __init__(self, db: Session):
        self.db = db
        self.brain = Brain()

    # -------------------------
    # Public API
    # -------------------------

    async def generate_reply(
        self,
        workspace_id: str,
        thread_messages: List[Dict[str, str]],
    ) -> str:
        """
        Generate a draft reply for Shlok.

        Inputs:
        - workspace_id: active workspace
        - thread_messages: ordered chat history in OpenAI format
          [
            {"role": "user", "content": "..."},
            {"role": "assistant", "content": "..."}
          ]

        Output:
        - Draft assistant message (string)
        """

        system_prompt = self._build_system_prompt(workspace_id)
        
        # Format conversation history for prompt
        conversation_text = ""
        for msg in thread_messages:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            conversation_text += f"{role.upper()}: {content}\n"

        # Use Brain.think()
        try:
            response = await self.brain.think(
                prompt=conversation_text,
                system_prompt=system_prompt,
                temperature_override=0.7
            )
            return response.content
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Shlok Brain failure: {e}", exc_info=True)
            return "I'm having trouble thinking clearly right now. Please try again soon."

    # -------------------------
    # Internal helpers
    # -------------------------

    def _build_system_prompt(self, workspace_id: str) -> str:
        """Build the locked system prompt for Shlok."""

        guideline = self._load_shlok_guideline(workspace_id)
        guideline_json = self._parse_guideline_json(guideline)

        instructions = guideline_json.get("instructions", "")
        tone = guideline_json.get("tone", {})
        reference_playbooks = guideline_json.get("reference_playbooks", [])

        prompt_parts = [
            "You are SHLOK, the Social Media Manager AI employee inside Zroky.",
            "",
            "ROLE CONSTRAINTS:",
            "- You produce drafts only. Nothing is ever posted or scheduled automatically.",
            "- You must explain intent and reasoning before suggesting any next action.",
            "- You never claim something is 'published', 'posted', or 'done'.",
            "- You require explicit user approval before any scheduling or publishing.",
            "",
            "STYLE:",
            f"- Default tone: {tone.get('default', 'clear and professional')}",
            f"- Avoid: {', '.join(tone.get('avoid', []))}",
            "",
            "GUIDELINES:",
            instructions,
        ]

        if reference_playbooks:
            prompt_parts.append("")
            prompt_parts.append("REFERENCE PLAYBOOKS (ADVISORY ONLY):")
            prompt_parts.append(
                "The following references are for style and workflow awareness only."
            )
            prompt_parts.append(
                "Do NOT copy wording, scripts, or content. Do NOT override user rules."
            )

            for idx, pb in enumerate(reference_playbooks, start=1):
                line = f"{idx}. [{pb.get('source', 'other')}] {pb.get('url')}"
                if pb.get("title"):
                    line += f" - {pb['title']}"
                if pb.get("notes"):
                    line += f" ({pb['notes']})"
                prompt_parts.append(line)

        prompt_parts.extend(
            [
                "",
                "OUTPUT FORMAT (JSON ONLY):",
                "Return a single valid JSON object with these keys:",
                "- rationale: string",
                "- drafts: array of draft objects",
                "- artifacts: array of artifact objects",
                "- next_actions: array of strings",
                "",
                "Draft object schema:",
                '{ "platform": "LinkedIn|Instagram|X|Facebook|YouTube", "title": "...", "content": "...", '
                '"cta": "...", "hashtags": ["..."], "visual": {"format": "...", "notes": "..."}}',
                "",
                "Artifact object schema:",
                '{ "type": "SOCIAL_POST", "title": "...", "content": { ...draft object... } }',
                "",
                "Rules:",
                "- Always draft-first. No scheduling or publishing.",
                "- Explain intent in rationale.",
                "- Ask for explicit approval in next_actions if any action is needed.",
                "- Output JSON only. No markdown, no extra text.",
            ]
        )

        return "\n".join(prompt_parts)

    def _load_shlok_guideline(self, workspace_id: str) -> Optional[Guideline]:
        """Load Shlok guideline for the workspace."""
        return (
            self.db.query(Guideline)
            .filter(
                Guideline.workspace_id == workspace_id,
                Guideline.employee_id == "shlok",
            )
            .first()
        )

    def _parse_guideline_json(self, guideline: Optional[Guideline]) -> Dict:
        """Safely parse guideline.content_json."""
        if not guideline or not guideline.content_json:
            return {}
        try:
            return json.loads(guideline.content_json) or {}
        except Exception:
            return {}
