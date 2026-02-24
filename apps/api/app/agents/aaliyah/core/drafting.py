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
    sources_used: list[str] = []


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
        - Incorporate user-provided examples from settings.
        - Learn from approved sent emails (draft status == "sent").
        - Progress through accuracy levels based on volume.
        """
        workspace = self.db.query(Workspace).filter(Workspace.id == self.workspace_id).first()
        aaliyah_settings = (workspace.settings_json or {}).get("aaliyah", {})
        onboarding_examples = aaliyah_settings.get("examples")

        # Find approved drafts
        approved_emails = (
            self.db.query(TriagedEmail)
            .filter(TriagedEmail.workspace_id == self.workspace_id)
            .order_by(TriagedEmail.updated_at.desc())
            .limit(100)
            .all()
        )
        
        sends = []
        for e in approved_emails:
            meta = e.metadata_json or {}
            draft = meta.get("draft")
            if draft and isinstance(draft, dict) and draft.get("status") == "sent":
                sends.append(draft)
        
        count = len(sends)
        context = ""

        if onboarding_examples:
            context += "**User-provided Style Examples:**\n"
            # Limit to 1000 chars to avoid bloating prompt too much
            context += f"{onboarding_examples[:1000]}\n\n"

        if count < 5 and not onboarding_examples:
            return "No style baseline yet. Use professional defaults."

        context += f"**Style Baseline (Based on {count} approved sends):**\n"
        
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
        
        # New: Relationship Summary from triage
        rel_summary = (email.metadata_json or {}).get("relationship_summary", "")
        if rel_summary:
            kg_context += f"\n\n**Interaction History:**\n{rel_summary}"

        # New: Vision Analysis from triage
        vision_context = ""
        vision_data = (email.metadata_json or {}).get("vision_analysis", [])
        if vision_data:
            vision_context = "**AI Vision Analysis of Attachments:**\n"
            for v in vision_data:
                vision_context += f"- File: {v.get('filename')}\n  Analysis: {json.dumps(v.get('analysis'))}\n"

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
            "You are Aaliyah, an elite Executive Assistant. "
            "Your goal is to draft a grounded, professional, and CONCISE reply that sounds like your principal. "
            "**STRICT HUMANIZATION PROTOCOL (Anti-AI Writing):**\n"
            "1. NO AI FILLER: Do not use 'delve', 'tapestry', 'testament', 'underscores', 'pivotal', 'crucial', or 'vibrant'.\n"
            "2. NO COPULA AVOIDANCE: Use simple 'is' or 'are'. Avoid 'serves as', 'represents a shift', or 'boasts'.\n"
            "3. VARY THE RHYTHM: Use a mix of short, punchy sentences and longer, thoughtful ones. Avoid same-length sentence monotony.\n"
            "4. NO AI GREETINGS: Avoid 'I hope this finds you well' or 'Best regards'. Match the principal's signature.\n"
            "5. BE OPINIONATED: Reflect the executive's decisiveness. Do not be neutrally objective.\n"
            f"Tone: {tone}.\n"
            f"\n{style_context}\n"
            "STRICT NO HALLUCINATION POLICY:\n"
            "- NEVER invent pricing, timelines, or contract terms. If missing, ASK one clarifying question.\n"
        )

        user_prompt = f"""
Analyze the latest message and draft a reply.
{followup_hint}

**Knowledge Context:**
{kg_context}

**Style Guidance:**
{style_context}

**Vision Analysis:**
{vision_context}

**Latest Message:**
From: {email.sender}
Subject: {email.subject}
Content: {latest_content}

**Task:**
1. Determine intent. 
2. Match style exactly. 
3. Propose meeting slots if applicable.
4. INCORPORATE visual facts from Vision Analysis if they are relevant to the reply.
5. Return strict JSON.
"""

        try:
            # Phase 1: Thought (DeepSeek-R1)
            response = await self.brain.think(
                prompt=user_prompt,
                system_prompt=system_prompt,
                model_override="deepseek/deepseek-r1",
                temperature_override=0.2
            )
            
            draft_data = self._parse_llm_json(response.content)
            
            # Phase 2: Critic (Fast Model)
            critic_prompt = f"""
            Critique this draft for 'AI patterns' and 'Human soul'.
            Draft: {draft_data.get('body')}
            
            RULES:
            - Is it too robotic?
            - Does it use forbidden words (delve, testament, etc.)?
            - Is it grounded in the knowledge provided?
            
            Return JSON: {{"must_refine": bool, "issues": list[str]}}
            """
            critic_resp = await self.brain.think(prompt=critic_prompt, system_prompt="You are a strict editorial critic.", temperature_override=0.0)
            critic_data = self._parse_llm_json(critic_resp.content)
            
            if critic_data.get("must_refine"):
                refine_prompt = f"Refine this draft to fix these issues: {critic_data.get('issues')}\nDraft: {draft_data.get('body')}"
                refined_resp = await self.brain.think(prompt=refine_prompt, system_prompt=system_prompt, model_override="deepseek/deepseek-r1")
                refined_data = self._parse_llm_json(refined_resp.content)
                draft_data.update(refined_data)

            if draft_data.get("action") == "ignore":
                return None
                
            draft_body = draft_data.get("body", "")
            
            if "[BOOKING_LINK]" in draft_body and is_scheduling_intent:
                bm = BookingManager(self.db, self.workspace_id)
                link = bm.create_link(slots=slots[:5] if 'slots' in locals() else [], recipient_email=email.sender, subject=f"Meeting: {email.subject}")
                public_url = f"{settings.public_app_url}/booking/{link.slug}"
                draft_body = draft_body.replace("[BOOKING_LINK]", f"You can book here: {public_url}")

            sources_used = []
            if kg_context and "No relevant context" not in kg_context:
                sources_used.append("Knowledge Graph")
            if style_context and "Style Baseline" in style_context:
                 sources_used.append("Style Profile")
            if availability_context:
                 sources_used.append("Calendar Engine")
            if vision_context:
                 sources_used.append("Visual Analysis")
            if rel_summary:
                 sources_used.append("Interaction Insights")

            return DraftResponse(
                subject=draft_data.get("subject", f"Re: {email.subject}"),
                body=draft_body,
                rationale=draft_data.get("rationale", "Reflective humanized draft."),
                intent=draft_data.get("intent", "other"),
                risk_labels=draft_data.get("risk_labels", []),
                missing_info=draft_data.get("missing_info"),
                sources_used=sources_used
            )

        except Exception as e:
            logger.error("Failed to generate draft: %s", e)
            return None

    def _parse_llm_json(self, content: str) -> dict:
        text = content.strip()
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].split("```")[0].strip()
        try:
            return json.loads(text)
        except:
            return {}

    async def save_draft(self, email_id: str, draft: DraftResponse) -> bool:
        """Persist the draft and log audit event."""
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
        
        # Audit Log
        from app.services.audit_log_service import AuditLogService, AuditAction, AuditEntityType
        
        AuditLogService.log_action(
            db=self.db,
            workspace_id=self.workspace_id,
            user_id="ai_agent", # System actor
            action=AuditAction.CREATE, 
            entity_type=AuditEntityType.ARTIFACT,
            entity_id=email_id,
            metadata={
                "provider": email.provider,
                "draft_subject": draft.subject,
                "rationale": draft.rationale,
                "sources_used": draft.sources_used
            },
            explain_one_liner=f"Drafted reply: {draft.intent}"
        )

        self.db.commit()
        return True
