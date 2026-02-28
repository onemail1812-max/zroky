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
from app.agents.aaliyah.core.ingestion.sanitizer import sanitize_email_body, extract_latest_reply
from app.agents.aaliyah.core.critic_agent import CriticAgent, CriticStatus
from app.agents.aaliyah.core.humanizer import HumanizerFilter

logger = logging.getLogger(__name__)


class DraftResponse(BaseModel):
    subject: str
    body: str
    rationale: str
    intent: str
    risk_labels: list[str]
    missing_info: Optional[str] = None
    tone_tags: list[str] = []
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

        # 1. Extract and Sanitize Latest Reply Only
        clean_full_body = sanitize_email_body(email.snippet or "")
        latest_content = extract_latest_reply(clean_full_body)
        if not latest_content:
             latest_content = clean_full_body or ""

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

        from app.models.user import User
        workspace = self.db.query(Workspace).filter(Workspace.id == self.workspace_id).first()
        owner = self.db.query(User).filter(User.id == workspace.owner_id).first() if workspace else None
        
        aaliyah_settings = (workspace.settings_json or {}).get("aaliyah", {})
        tone = aaliyah_settings.get("draft_tone", "professional")
        
        user_domain = ""
        if owner and owner.email and "@" in owner.email:
            user_domain = owner.email.split("@")[-1].lower()
            
        sender_domain = ""
        if email.sender and "@" in email.sender:
            import re
            match = re.search(r"@([\w.-]+)", email.sender)
            if match:
                sender_domain = match.group(1).lower().strip('>')
                
        # Smart Tone Switching
        if user_domain and sender_domain:
            if user_domain == sender_domain:
                tone = "Internal (direct, highly concise, action-oriented, professional)"
            else:
                tone = "External (warm, welcoming, detailed but professional)"

        user_name = aaliyah_settings.get("user_name") or aaliyah_settings.get("first_name") or "there"
        
        # New: Retrieve language from triage
        sender_language = (email.metadata_json or {}).get("language", "English")
        
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

        followup_hint = "\nNote: This is a proactive follow-up because they didn't reply." if is_followup else ""

        system_prompt = (
            f"You are Aaliyah, an elite Executive Assistant for {user_name}. "
            f"Your goal is to draft a grounded, professional, and CONCISE reply that sounds like your principal, {user_name}. "
            "**STRICT HUMANIZATION PROTOCOL (Blader/Humanizer Principles):**\n"
            "1. NO AI FILLER: Do not use 'delve', 'tapestry', 'testament', 'underscores', 'pivotal', 'crucial', or 'vibrant'.\n"
            "2. NO COPULA AVOIDANCE: Use simple 'is' or 'are'. Avoid 'serves as', 'represents a shift', or 'boasts'.\n"
            "3. VARY THE RHYTHM: Use a mix of short, punchy sentences and longer, thoughtful ones. Avoid same-length sentence monotony.\n"
            "4. NO AI GREETINGS/SIGNATURES: Avoid 'I hope this finds you well' or 'Best regards'. Match the principal's signature precisely.\n"
            "5. NO AI POLISH: Remove 'moreover', 'nonetheless', or sterile tone. Use active voice and be decisive.\n"
            "6. ADD MESSY EDGES: Use occasional asides or informal closures where appropriate for the relationship.\n"
            "7. ADAPT TO RECIPIENT: If they are brief, you be brief. If they are stressed, be helpful and empathetic.\n"
            f"Tone: {tone}.\n"
            f"\n{style_context}\n"
            "STRICT NO HALLUCINATION POLICY:\n"
            "- NEVER invent pricing, timelines, or contract terms. If missing, ASK one clarifying question.\n"
            "\n"
            "LANGUAGE ENFORCEMENT:\n"
            f"The sender's language was detected as {sender_language}.\n"
            "- If the sender language is an INTERNATIONAL business language (e.g., Spanish, French, German), you MUST draft the reply in that exact language.\n"
            "- If the sender language is a REGIONAL language (e.g., Hindi, Bengali, Tamil) or you are unsure, you MUST draft the final professional reply in ENGLISH.\n"
            "- Regardless of language, match the established tone and style.\n"
            "\n"
            "Each draft MUST follow this strict JSON schema:\n"
            "{\n"
            '  "action": "reply | ignore",\n'
            '  "subject": "Email subject",\n'
            '  "body": "The reply body (Clean text, no placeholders)",\n'
            '  "rationale": "Why this specific response?",\n'
            '  "intent": "What the email achieves",\n'
            '  "risk_labels": ["security", "financial", "legal"],\n'
            '  "tone_tags": ["professional", "punchy", "brief", "warm"],\n'
            '  "missing_info": "Optional string if AI needs more data"\n'
            "}\n"
        )

        clarity_instruction = (email.metadata_json or {}).get("clarity_instruction", "")
        clarity_prompt = f"\n**CRITICAL USER INSTRUCTION**: The user provided explicit instructions for this draft: \"{clarity_instruction}\". You MUST follow these instructions when drafting the reply." if clarity_instruction else ""

        user_prompt = f"""
Analyze the latest message and draft a reply.
{followup_hint}

**Knowledge Context:**
{kg_context}

**Style Guidance:**
{style_context}

**Vision Analysis:**
{vision_context}
{clarity_prompt}

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
            # Consolidate into a single high-quality pass (Llama-3.3-70B)
            # This handles both content generation and stylistic humanization
            response = await self.brain.think(
                prompt=user_prompt,
                system_prompt=system_prompt,
                model_override=settings.AALIYAH_DRAFT_MODEL,
                temperature_override=0.4 # Higher temp for "soul" and variety
            )
            
            draft_data = self._parse_llm_json(response.content)
            
            if draft_data.get("action") == "ignore":
                return None
                
            draft_body = draft_data.get("body", "")

            # ---------------------------------------------------------
            # THE DOUBLE LLM CHECK (CRITIC AGENT)
            # ---------------------------------------------------------
            critic = CriticAgent()
            critic_response = await critic.review_draft(
                original_email_content=latest_content,
                drafted_body=draft_body,
                context=kg_context + "\n" + vision_context
            )
            
            if critic_response.status in [CriticStatus.MODIFIED, CriticStatus.REJECTED] and critic_response.rewritten_body:
                logger.info(f"Critic intervened. Feedback: {critic_response.feedback}")
                draft_body = critic_response.rewritten_body
                if "Critic Review" not in draft_data.get("sources_used", []):
                    # We will append logic below
                    pass

            # ---------------------------------------------------------
            # THE ZERO FLUFF FILTER (HUMANIZER)
            # ---------------------------------------------------------
            draft_body = HumanizerFilter.apply(draft_body)
            
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
            if 'critic_response' in locals() and critic_response.status != CriticStatus.APPROVED:
                 sources_used.append("Critic Intervention")
            sources_used.append("Zero Fluff Humanizer")

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
