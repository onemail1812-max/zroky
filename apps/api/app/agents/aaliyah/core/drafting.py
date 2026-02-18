"""Autonomous Drafting Agent using Brain and Knowledge Graph."""

from __future__ import annotations

import json
import logging
import re
from typing import Optional

from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.models.triaged_email import TriagedEmail
from app.models.draft_template import DraftTemplate
from app.models.workspace import Workspace
from app.agents.aaliyah.core.labeling_rules import LabelingRulesEngine
from app.services.brain.core import Brain
from app.services.brain.knowledge_graph import KnowledgeGraphService
from app.agents.aaliyah.core.scheduling.availability_engine import AvailabilityEngine
from app.agents.aaliyah.core.scheduling.booking_manager import BookingManager
from app.config import settings
from datetime import datetime, timezone

from app.agents.aaliyah.core.ingestion.email_ingestor import EmailIngestor

logger = logging.getLogger(__name__)


class DraftResponse(BaseModel):
    subject: str
    body: str
    rationale: str
    intent: str
    risk_labels: list[str]
    missing_info: Optional[str] = None
    status: str = "drafted"


class DraftingAgent:
    def __init__(self, db: Session, workspace_id: str):
        self.db = db
        self.workspace_id = workspace_id
        self.brain = Brain()
        self.kg = KnowledgeGraphService(db, workspace_id)
        self.label_engine = LabelingRulesEngine(db, workspace_id)
        self.availability = AvailabilityEngine(db, workspace_id)
        self.ingestor = EmailIngestor(workspace_id, db)

    async def _get_style_context(self) -> str:
        """
        Implements Style Learning Trust Ladder:
        - Learn only from approved sent emails (draft status == "sent").
        - After 10: greeting + signoff + length.
        - After 30: phrasing patterns.
        - After 60: micro-style.
        """
        # Find approved drafts
        # Note: In a real DB we'd use JSON operators, here we iterate or use a simple query
        approved_emails = (
            self.db.query(TriagedEmail)
            .filter(TriagedEmail.workspace_id == self.workspace_id)
            .order_by(TriagedEmail.updated_at.desc())
            .limit(100) # Pull last 100 to scan for approved
            .all()
        )
        
        sends = []
        for e in approved_emails:
            meta = e.metadata_json or {}
            draft = meta.get("draft")
            if draft and isinstance(draft, dict) and draft.get("status") == "sent":
                sends.append(draft)
        
        count = len(sends)
        if count < 5:
            return "No style baseline yet. Use professional defaults."

        context = f"**Style Baseline (Based on {count} approved sends):**\n"
        
        # 1. Ladder Step 1: Greeting + Signoff (10+ sends)
        if count >= 10:
            last_10 = sends[:10]
            context += "- Use the user's preferred greeting and sign-off styles from these examples.\n"
            for s in last_10[:3]:
                 context += f"Example Send: {s.get('body')[:100]}...\n"
        
        # 2. Ladder Step 2: Phrasing (30+ sends)
        if count >= 30:
            context += "- Match the user's phrasing patterns (sentence structure, directness vs. verbosity).\n"

        # 3. Ladder Step 3: Micro-style (60+ sends)
        if count >= 60:
            context += "- Match precise micro-styles (capitalization, emoji usage, specific slang/vocab).\n"
            
        return context

    async def generate_draft(self, email: TriagedEmail, is_followup: bool = False) -> Optional[DraftResponse]:
        """
        Generate a reply draft using LLM and context.
        Enforces "No Hallucination" and "Style Learning".
        """
        # 0. Skip if already drafted
        if email.metadata_json and "draft" in email.metadata_json:
            # Check if it was sent
            if email.metadata_json["draft"].get("status") == "sent":
                return None
            # If it exists but not sent, we might want to re-draft? For now, skip.
            return None

        # 1. Extract Latest Reply Only
        from app.services.email.parsing.reply_parser import parse_email_body
        latest_content = parse_email_body(email.snippet or "")
        if not latest_content:
             latest_content = email.snippet or ""

        # 2. Gather Context
        history = self.label_engine.list_recent_thread_history(
            thread_id=email.thread_id,
            sender=email.sender,
            limit=5
        )
        
        thread_context = ""
        for msg in reversed(history):
            if msg.id == email.id:
                continue
            thread_context += f"From: {msg.sender}\nBody: {msg.snippet[:500]}\n---\n"

        sender_query = email.sender or ""
        kg_context = self.kg.summarize_for_prompt(query=sender_query)

        workspace = self.db.query(Workspace).filter(Workspace.id == self.workspace_id).first()
        aaliyah_settings = (workspace.settings_json or {}).get("aaliyah", {})
        tone = aaliyah_settings.get("draft_tone", "professional")
        
        style_context = await self._get_style_context()

        # 3. Handle Scheduling (Sprint 9: Deterministic Keywords first)
        availability_context = ""
        body_lower = (email.snippet or "").lower()
        meeting_keywords = {"schedule", "meet", "calendar", "zoom", "call", "availability", "slots", "meeting"}
        
        has_keywords = any(word in body_lower for word in meeting_keywords)
        is_labeled_meeting = "Meeting" in (email.category or "") or "Meeting" in ((email.metadata_json or {}).get("labels", []))
        
        is_scheduling_intent = has_keywords or is_labeled_meeting
        
        if is_scheduling_intent:
            now = datetime.now(timezone.utc)
            # Sprint 9: Propose exactly 3 slots using user's configured timezone
            slots = self.availability.propose_n_slots(search_start_dt=now, n=3, duration_minutes=30)
            user_tz_label = self.availability.user_tz_name
            
            if slots:
                availability_context = f"**Available Slots (in {user_tz_label}):**\n"
                for s in slots:
                    # Format: Monday Feb 18, 14:00
                    availability_context += f"- {s.strftime('%A %b %d, %H:%M')}\n"
                
                availability_context += f"\nNote: All times are in {user_tz_label}."
                availability_context += "\nIf the recipient's timezone is unknown, ASK exactly one question about their location or preferred timezone."

        system_prompt = (
            "You are Aaliyah, an elite Executive Chief of Staff. "
            "Your goal is to draft a grounded, professional, and CONCISE reply that sounds like your principal. "
            "STYLE RULE: Be brief. Use 1-3 sentences maximum unless a complex explanation is unavoidable. "
            f"Tone: {tone}. "
            f"\n{style_context}\n"
            "STRICT NO HALLUCINATION POLICY:\n"
            "- NEVER invent: pricing, timelines, policies, or contract terms.\n"
            "- If any required fact is missing from Knowledge Context, ASK EXACTLY ONE clarifying question or state you will check with the principal.\n"
            "- If unsure, keep the line neutral or state as a placeholder [CONFIRM WITH PRINCIPAL]."
        )

        if is_followup:
            followup_hint = "\n**Important: NO RESPONSE RECEIVED.** This is a follow-up message because we haven't heard back since our last outbound email.\n"
        else:
            followup_hint = ""

        user_prompt = f"""
Analyze the latest message and draft a reply.
{followup_hint}

**Knowledge Context (Grounding):**
{kg_context}

**Style Guidance:**
{style_context}

{availability_context}

**Latest Message to Reply To:**
From: {email.sender}
Subject: {email.subject}
Content: {latest_content}

**Task:**
1. Determine the intent: meeting request, follow-up, info request, risk-related (pricing/legal/payment), or ignore.
2. If info is missing (e.g. they asked for pricing not in context), DO NOT MAKE IT UP. Ask 1 question.
3. If they want a meeting, use the available slots and add [BOOKING_LINK].
4. Return a one-line rationale for the user in 'rationale'.

**Output JSON Structure:**
{{
  "action": "reply" | "ignore",
  "intent": "meeting request" | "follow-up" | "info request" | "risk-related" | "other",
  "subject": "Re: ...",
  "body": "The clean, concise email body...",
  "risk_labels": ["Money", "Legal", "Complaint", "Hiring"] (list any detected),
  "missing_info": "Explain what you don't know if applicable",
  "rationale": "Short explanation for the user."
}}
"""

        try:
            response = await self.brain.think(
                prompt=user_prompt,
                system_prompt=system_prompt,
                model_override="deepseek/deepseek-r1",
                temperature_override=0.2
            )
            
            content = response.content.strip()
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()
            
            data = json.loads(content)
            
            if data.get("action") == "ignore":
                return None
                
            draft_body = data.get("body", "")
            
            if "[BOOKING_LINK]" in draft_body and is_scheduling_intent:
                bm = BookingManager(self.db, self.workspace_id)
                link = bm.create_link(slots=slots[:5] if 'slots' in locals() else [], recipient_email=email.sender, subject=f"Meeting: {email.subject}")
                public_url = f"{settings.public_app_url}/booking/{link.slug}"
                draft_body = draft_body.replace("[BOOKING_LINK]", f"You can book one of these slots here: {public_url}")

            return DraftResponse(
                subject=data.get("subject", f"Re: {email.subject}"),
                body=draft_body,
                rationale=data.get("rationale", "Automated draft."),
                intent=data.get("intent", "other"),
                risk_labels=data.get("risk_labels", []),
                missing_info=data.get("missing_info"),
            )

        except Exception as e:
            logger.error("Failed to generate draft: %s", e)
            return None

    async def save_draft(self, email_id: str, draft: DraftResponse) -> bool:
        """Persist the draft to the email's metadata."""
        email = self.db.query(TriagedEmail).filter(TriagedEmail.id == email_id).first()
        if not email:
            return False
            
        meta = dict(email.metadata_json or {})
        meta["draft"] = draft.model_dump()
        email.metadata_json = meta
        
        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(email, "metadata_json")
        
        # Also update the thread record for visibility in the unified inbox
        if email.thread_id:
            from app.models.triaged_thread import TriagedThread
            thread = (
                self.db.query(TriagedThread)
                .filter(
                    TriagedThread.workspace_id == self.workspace_id,
                    TriagedThread.external_thread_id == email.thread_id
                )
                .first()
            )
            if thread:
                thread.has_draft = True
                thread.draft_json = draft.model_dump()
                flag_modified(thread, "draft_json")
        
        self.db.commit()
        return True
