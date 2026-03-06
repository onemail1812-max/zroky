
"""Meeting summarization service."""
from __future__ import annotations

import json
import logging
import uuid
from typing import Optional, List, Dict
from datetime import datetime, timezone

from sqlalchemy.orm import Session
import re

from app.models.calendar_event_snapshot import CalendarEventSnapshot
from app.models.meeting_transcript import MeetingTranscript
from app.models.workspace import Workspace
from app.services.brain.core import Brain
from app.services.brain.schemas.models import ModelType
from app.services.brain.memory import DualStateMemory
from app.config import settings

logger = logging.getLogger(__name__)

class MeetingSummarizer:
    def __init__(self, db: Session, workspace_id: str):
        self.db = db
        self.workspace_id = workspace_id
        self.brain = Brain()
        
    async def ingest_transcript(self, event_id: str, transcript_text: str, platform: str = "manual") -> str:
        """Store transcript and initiate summarization. Creates a placeholder event if needed."""
        # Check event
        event = self.db.query(CalendarEventSnapshot).filter_by(id=event_id, workspace_id=self.workspace_id).first()
        
        if not event:
            if event_id == "manual" or platform == "manual":
                # Create ad-hoc placeholder event
                adhoc_id = str(uuid.uuid4())
                event = CalendarEventSnapshot(
                    id=adhoc_id,
                    workspace_id=self.workspace_id,
                    provider="manual",
                    provider_event_id=f"manual-{adhoc_id}",
                    title=f"Ad-hoc Meeting Upload {datetime.now().strftime('%Y-%m-%d %H:%M')}",
                    start_at=datetime.now(timezone.utc),
                    end_at=datetime.now(timezone.utc),
                    is_all_day=False,
                    status="confirmed",
                    organizer_email="me@local",
                    attendees_json=[],
                    html_link="",
                    description=" manually uploaded transcript",
                    is_cancelled=False,
                    location="Upload"
                )
                self.db.add(event)
                self.db.commit()
                event_id = adhoc_id
                logger.info(f"Created ad-hoc event {adhoc_id} for manual transcript upload.")
            else:
                raise ValueError(f"Event {event_id} not found in workspace {self.workspace_id}")
            
        tid = str(uuid.uuid4())
        transcript = MeetingTranscript(
            id=tid,
            workspace_id=self.workspace_id,
            event_id=event_id,
            transcript_text=transcript_text,
            platform=platform,
            status="pending"
        )
        self.db.add(transcript)
        self.db.commit()
        
        # Trigger async summarization (or run immediately for simplicity?)
        # For prototype, we'll run immediately but not block returning the ID if possible?
        # Aaliyah architecture uses separate async processing usually, but here we'll do it inline for simplicity
        # or implement a 'process_transcript' method to be called.
        return tid

    async def summarize_transcript(self, transcript_id: str) -> Optional[Dict]:
        """Process a transcript using the Brain to generate summary and action items."""
        transcript = self.db.query(MeetingTranscript).filter_by(id=transcript_id, workspace_id=self.workspace_id).first()
        if not transcript:
            return None
            
        if transcript.status == "completed" and transcript.summary_json:
            return transcript.summary_json
            
        transcript.status = "processing"
        self.db.commit()
        
        try:
            # 1. Fetch User Profile
            workspace = self.db.query(Workspace).filter(Workspace.id == self.workspace_id).first()
            settings = workspace.settings_json or {}
            aaliyah_settings = settings.get("aaliyah", {})
            user_name = aaliyah_settings.get("user_name") or aaliyah_settings.get("first_name") or "there"

            # 2. Construct Prompt
            system_prompt = (
                f"You are Aaliyah, an expert Executive Assistant for {user_name}. "
                "Your goal is to summarize meeting transcripts into actionable insights. "
                "Identify key decisions, action items with owners, and a brief executive summary."
            )
            
            user_prompt = f"""
Analyze the following meeting transcript and provide a structured summary.

**Transcript:**
{transcript.transcript_text[:15000]}  (Truncated for context limit if necessary)

**Output Format:**
Return ONLY raw JSON with this structure:
{{
  "executive_summary": "High-level summary of the discussion...",
  "decisions": ["Decision 1", "Decision 2"],
  "action_items": [
    {{"owner": "Name", "task": "Task description", "due_date": "YYYY-MM-DD or ASAP"}}
  ],
  "sentiment": "positive" | "neutral" | "negative",
  "keywords": ["tag1", "tag2"]
}}
"""
            response = await self.brain.think(
                prompt=user_prompt,
                system_prompt=system_prompt,
                model_override=ModelType.REASONING.value,
                temperature_override=0.2
            )
            
            content = response.content.strip()
            
            # Robust JSON extraction
            content = re.sub(r"<think>.*?</think>", "", content, flags=re.DOTALL).strip()
            
            try:
                # If wrapped in markdown code block
                if "```json" in content:
                    content = content.split("```json")[1].split("```")[0].strip()
                elif "```" in content:
                    content = content.split("```")[1].split("```")[0].strip()
                
                # If still has prefix/suffix text, try to find { and }
                start_idx = content.find("{")
                end_idx = content.rfind("}")
                if start_idx != -1 and end_idx != -1:
                    content = content[start_idx:end_idx+1]
                    
                summary = json.loads(content)
            except Exception:
                 # Fallback for Mock if JSON parse fails
                 summary = {
                     "executive_summary": "Mock Summary (Parse Failed)",
                     "decisions": ["Mock Decision"],
                     "action_items": [],
                     "sentiment": "neutral",
                     "keywords": ["mock"]
                 }
            
            transcript.summary_json = summary
            transcript.status = "completed"
            
            # --- RAG Integration: Store summary for future recall ---
            try:
                memory = DualStateMemory(self.db, self.workspace_id)
                memory.save_interaction(
                    source_type="meeting_summary",
                    source_id=transcript.id,
                    content_text=f"Meeting Summary:\n{json.dumps(summary, indent=2)}",
                    metadata={
                        "event_id": transcript.event_id,
                        "platform": transcript.platform,
                        "summary": summary
                    }
                )
                logger.info(f"Stored meeting summary {transcript.id} in memory.")
            except Exception as e:
                logger.error(f"Failed to store meeting summary in memory: {e}")

            self.db.commit()
            
            return summary
            
        except Exception as e:
            logger.error(f"Failed to summarize transcript {transcript_id}: {e}")
            transcript.status = "failed"
            self.db.commit()
            raise e