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

    async def generate_draft(self, email: TriagedEmail) -> Optional[DraftResponse]:
        """
        Generate a reply draft using LLM and context.
        Returns None if no draft is appropriate (e.g. newsletter).
        """
        # 0. Skip if already drafted
        if email.metadata_json and "draft" in email.metadata_json:
            logger.info("Draft already exists for email %s", email.id)
            return None

        # 1. Gather Thread Context
        history = self.label_engine.list_recent_thread_history(
            thread_id=email.thread_id,
            sender=email.sender,
            limit=5
        )
        
        # Format history string
        thread_context = ""
        for msg in reversed(history):
            if msg.id == email.id:
                continue # Skip current message to avoid duplication if it's in history
            thread_context += f"From: {msg.sender}\nDate: {msg.received_at}\nSubject: {msg.subject}\nBody: {msg.snippet}\n---\n"

        # 2. Gather Knowledge Graph Context
        # Extract email address for lookup
        sender_query = email.sender or ""
        if "<" in sender_query:
            try:
                sender_query = sender_query.split("<")[1].strip(">")
            except Exception:
                pass
        
        kg_context = self.kg.summarize_for_prompt(query=sender_query)

        # 2a. Fetch Workspace Settings & Templates
        workspace = self.db.query(Workspace).filter(Workspace.id == self.workspace_id).first()
        settings_json = getattr(workspace, "settings_json", {}) or {}
        aaliyah_settings = settings_json.get("aaliyah", {})
        
        signature = aaliyah_settings.get("signature")
        tone = aaliyah_settings.get("draft_tone", "professional")
        
        templates = self.db.query(DraftTemplate).filter(DraftTemplate.workspace_id == self.workspace_id).all()
        template_context = ""
        if templates:
            template_context = "**Available Templates (Use if relevant):**\n"
            for t in templates:
                template_context += f"- Name: {t.name}\n  Body: {t.body}\n"

        # 2b. Fetch Recent Sent Emails (Style Learning)
        # We use the ingestor to fetch sent items on demand.
        sent_messages = await self.ingestor.fetch_sent(max_results=3)
        style_context = ""
        if sent_messages:
            style_context = "**My Recent Sent Emails (ADOPT THIS STYLE):**\n"
            for m in sent_messages:
                content = m.get("snippet") or "(No preview)"
                style_context += f"To: {m.get('recipient') or 'Unknown'}\nSubject: {m.get('subject')}\nBody (Snippet): {content}\n---\n"

        # 3. Time Lord Intelligence
        # Heuristic check for scheduling intent before expensive LLM call? 
        # For now, let's always check availability if "Meeting" or "Awaiting Reply" is in category/label.
        availability_context = ""
        is_scheduling_intent = "Meeting" in (email.category or "") or "meeting" in ((email.metadata_json or {}).get("labels", []))
        
        if is_scheduling_intent:
            now = datetime.now(timezone.utc)
            slots = self.availability.find_slots(search_start_dt=now, days_ahead=5)
            if slots:
                availability_context = "**My Available Slots (Use these for scheduling):**\n"
                for i, s in enumerate(slots[:5]):
                    availability_context += f"- {s.start.strftime('%A %b %d, %H:%M')} to {s.end.strftime('%H:%M')} UTC\n"

        system_prompt = (
            "You are Aaliyah, an elite Executive Chief of Staff. "
            "Your goal is to draft a perfect email reply that sounds like your principal wrote it. "
            f"Adopt a {tone} tone. "
            "If recent sent emails are provided, mirror their vocabulary, greeting style, and sign-off. "
            "Never use placeholders like '[Insert Name]'. Infer it or use a generic greeting. "
            "Keep replies focused and move the conversation forward."
        )

        if signature:
            sig_instruction = f"Append this signature:\\n{signature}"
        else:
            sig_instruction = "Sign off with 'Best,'."

        user_prompt = f"""
Analyze the following email and draft a reply if necessary.

**Knowledge Context:**
{kg_context}

{template_context}

{style_context}

{availability_context}

**Conversation History:**
{thread_context}

**Current Message:**
From: {email.sender}
Subject: {email.subject}
Content: {email.snippet}
Category: {email.category}
Priority: {email.priority}

**Task:**
1. Determine if a reply is needed. If this is a notification, newsletter, or noise, return valid JSON with {{"action": "ignore"}}.
2. If a reply is needed, draft a response that moves the conversation forward.
3. If the user asks for a meeting or availability:
   a. Propose 2-3 specific times from the **My Available Slots** list above.
   b. Explicitly mention these time slots in the email body.
   c. Add a placeholder "[BOOKING_LINK]" right after the proposed times. I will replace it with a real link.
4. If a template is relevant, adapt it to the context.
5. {sig_instruction}

**Output Format:**
Return ONLY raw JSON (no markdown branding) with this structure:
{{
  "action": "reply" | "ignore",
  "subject": "Re: ...",
  "body": "The email body (including signature)...",
  "rationale": "Why you drafted this..."
}}
"""



        # 4. Invoke Brain
        try:
            response = await self.brain.think(
                prompt=user_prompt,
                system_prompt=system_prompt,
                model_override="deepseek/deepseek-r1", # Use high-reasoning model
                temperature_override=0.3
            )
            
            content = response.content.strip()
            # Clean possible markdown code blocks
            if content.startswith("```json"):
                content = content[7:]
            if content.endswith("```"):
                content = content[:-3]
            
            data = json.loads(content.strip())
            
            if data.get("action") == "ignore":
                logger.info("Drafting agent decided to ignore email %s", email.id)
                return None
                
            draft_body = data.get("body", "")

            # 5. Inject Booking Link if Placeholder Found
            if "[BOOKING_LINK]" in draft_body and is_scheduling_intent and slots:
                # Generate link for ALL available slots (or better: extract mentioned slots?)
                # For Sprint 5 velocity: Include top 5 slots in the link.
                bm = BookingManager(self.db, self.workspace_id)
                link = bm.create_link(
                    slots=slots[:5], 
                    recipient_email=email.sender, 
                    subject=f"Meeting: {email.subject}"
                )
                public_url = f"{settings.public_app_url}/booking/{link.slug}"
                # Replace placeholder
                draft_body = draft_body.replace("[BOOKING_LINK]", f"You can book one of these slots here: {public_url}")
                
            draft = DraftResponse(
                subject=data.get("subject", f"Re: {email.subject}"),
                body=draft_body,
                rationale=data.get("rationale", "Automated draft."),
            )
            
            return draft

        except Exception as e:
            logger.error("Failed to generate draft for %s: %s", email.id, e)
            return None

    async def save_draft(self, email_id: str, draft: DraftResponse) -> bool:
        """Persist the draft to the email's metadata."""
        email = self.db.query(TriagedEmail).filter(TriagedEmail.id == email_id).first()
        if not email:
            return False
            
        meta = dict(email.metadata_json or {})
        meta["draft"] = draft.dict()
        
        # SQLAlchemy JSON tracking workaround
        email.metadata_json = meta
        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(email, "metadata_json")
        
        self.db.commit()
        return True
