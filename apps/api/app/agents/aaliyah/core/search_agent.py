from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional
from datetime import datetime, timedelta

from sqlalchemy import or_, desc, case
from sqlalchemy.orm import Session

from app.models.triaged_email import TriagedEmail
from app.models.calendar_event_snapshot import CalendarEventSnapshot
from app.models.search_index import EmailIndex, CalendarIndex
from app.models.audit_log import AuditLog, AuditStatus
from app.agents.aaliyah.core.ingestion.email_ingestor import EmailIngestor
from app.agents.aaliyah.core.ingestion.calendar_sync import CalendarSync
from app.agents.aaliyah.core.query_parser import QueryParser
from app.services.brain.core import Brain
from app.services.brain.schemas.models import ModelType

logger = logging.getLogger(__name__)

class SearchAgent:
    """Agentic search engine for Aaliyah."""

    # Sprint 7: Enterprise Caching & Limits
    _SEARCH_CACHE: Dict[tuple, Any] = {}
    _CONTENT_CACHE: Dict[tuple, Any] = {}
    _CACHE_TTL_SEARCH = 60 # 60 seconds
    _CACHE_TTL_CONTENT = 3600 # 1 hour for content

    def __init__(self, db: Session, workspace_id: str, brain: Brain, actor_user_id: Optional[str] = None):
        self.db = db
        self.workspace_id = workspace_id
        self.brain = brain
        self.actor_user_id = actor_user_id
        self.ingestor = EmailIngestor(workspace_id, db)
        self.calendar_sync = CalendarSync(workspace_id, db)
        self.parser = QueryParser(brain)

    def _log_audit(self, action: str, target_type: Optional[str] = None, target_id: Optional[str] = None, meta: Optional[Dict] = None):
        """Create an audit log entry for Sprint 8."""
        import uuid
        import json
        try:
            log = AuditLog(
                id=str(uuid.uuid4()),
                workspace_id=self.workspace_id,
                actor_user_id=self.actor_user_id,
                action=action,
                target_type=target_type,
                target_id=target_id,
                meta=json.dumps(meta) if meta else None,
                status=AuditStatus.APPLIED.value
            )
            self.db.add(log)
            self.db.commit()
        except Exception as e:
            logger.error(f"Failed to create audit log: {e}")

    async def execute_search(self, user_query: str) -> Dict[str, Any]:
        """
        Execute smart search across Email and Calendar with Caching and Limits.
        """
        # 0. Audit Log: Question Asked
        self._log_audit(action="asked_question", meta={"query": user_query})

        # 0.5 Check Search Cache
        cache_key = (self.workspace_id, user_query)
        if cache_key in self._SEARCH_CACHE:
            data, ts = self._SEARCH_CACHE[cache_key]
            if datetime.utcnow() - ts < timedelta(seconds=self._CACHE_TTL_SEARCH):
                logger.debug(f"Search Cache HIT for query='{user_query}'")
                return data

        # 1. Parse intent using QueryParser
        params = await self.parser.parse(user_query)
        # Safe Logging: Log params, not full bodies
        logger.info(f"Search intent parsed for workspace {self.workspace_id}")
        
        scope = params.get("scope", "all")
        keywords = params.get("keywords")
        sender = params.get("sender")
        time_range = params.get("time_range")
        # Extract intent to handle specific logic if needed
        intent = params.get("intent", "email_search")
        
        results = {
            "emails": [],
            "calendar": [],
            "remote_emails": []
        }

        # 2. Stage A: Fast Search (using Index) - SPRINT 7: INTERNAL INDEX ONLY
        if scope in ("all", "email"):
            # Limit results to 20 for enterprise load performance
            results["emails"] = self._search_local_emails(keywords, sender, time_range, limit=20)
            
            # SPRINT 7: Remote search is disabled for the Answer Engine to honor 
            # 'search uses internal index only' rule. Real-time remote search is expensive.

        if scope in ("all", "calendar"):
             results["calendar"] = self._search_calendar(keywords, time_range, limit=20)

        # 3. Clarification Logic
        count_total = len(results["emails"]) + len(results["remote_emails"]) + len(results["calendar"])
        clarification = self.parser.get_clarification_question(user_query, count_total, params)
        if clarification:
            return {
                "status": "clarify",
                "answer_text": clarification,
                "evidence": [],
                "reply": clarification,
                "data": {"params": params}
            }

        # 4. Stage B: Deep Read (Top 5 Candidates MAX)
        full_content_map = {}
        email_candidates = results["emails"] + results["remote_emails"]
        cal_candidates = results["calendar"]
        
        # Sort candidates to find best ones
        def get_date(x):
            if hasattr(x, "last_message_at"): return x.last_message_at or datetime.min
            if hasattr(x, "created_at"): return x.created_at or datetime.min
            if hasattr(x, "start_at"): return x.start_at or datetime.min
            return datetime.min

        email_candidates.sort(key=get_date, reverse=True)
        cal_candidates.sort(key=get_date, reverse=True)
        
        # Sprint 7: Hard cap deep read at 5 items total
        # Priority: up to 4 emails, then fill with calendar up to 5
        targets = email_candidates[:4] + cal_candidates[:(5 - len(email_candidates[:4]))]
        
        for cand in targets:
            # Handle Pydantic models (remote emails) vs SQLAlchemy models (Index)
            if hasattr(cand, "metadata") and hasattr(cand.metadata, "thread_id"):
                ext_id = cand.metadata.thread_id
            else:
                ext_id = getattr(cand, "thread_id", None) or getattr(cand, "event_id", None) or getattr(cand, "id", None)
            
            provider = getattr(cand, "provider", "auto")
            if not ext_id: continue
            
            # Sprint 7: Check Content Cache first
            content_key = (self.workspace_id, ext_id)
            if content_key in self._CONTENT_CACHE:
                cached_text, ts = self._CONTENT_CACHE[content_key]
                if datetime.now() - ts < timedelta(seconds=self._CACHE_TTL_CONTENT):
                    full_content_map[ext_id] = cached_text
                    continue

            # Determine if it's an email for audit logging
            is_email = (hasattr(cand, "thread_id") and cand.thread_id) or \
                       (hasattr(cand, "metadata") and hasattr(cand.metadata, "thread_id") and cand.metadata.thread_id) or \
                       (getattr(cand, "provider", "") in ("gmail", "outlook", "google", "microsoft"))

            # Sprint 8 Audit: Thread/Event access
            self._log_audit(
                action="accessed_content",
                target_type="thread" if is_email else "event",
                target_id=ext_id
            )

            try:
                # Sprint 7: Hit DB first (check EmailMessage for threads)
                is_email = hasattr(cand, "thread_id") or (hasattr(cand, "provider") and cand.provider in ("gmail", "outlook"))
                
                if is_email:
                    # Workspace Isolation: Verify ownership
                    from app.models.email import EmailMessage
                    db_messages = self.db.query(EmailMessage).filter(
                        EmailMessage.workspace_id == self.workspace_id,
                        EmailMessage.thread_id == ext_id
                    ).order_by(EmailMessage.received_at.asc()).all()
                    
                    if db_messages:
                        full_text = "\n".join([f"[{m.received_at}] {m.sender.get('name') or m.sender.get('email')}: {m.body_cleaned or m.snippet}" for m in db_messages])
                        full_content_map[ext_id] = full_text
                        self._CONTENT_CACHE[content_key] = (full_text, datetime.now())
                        continue

                    # Fallback to Provider API ONLY if DB is empty
                    thread = await self.ingestor.fetch_thread(ext_id, provider)
                    if thread and thread.get("messages"):
                        full_text = "\n".join([f"[{m.get('received_at')}] {m.get('sender')}: {m.get('body') or m.get('snippet')}" for m in thread["messages"]])
                        full_content_map[ext_id] = full_text
                        self._CONTENT_CACHE[content_key] = (full_text, datetime.now())
                else:
                    # For calendar, check CalendarIndex description first
                    if hasattr(cand, "searchable_text") and len(getattr(cand, "searchable_text", "")) > 100:
                         # Workspace Isolation check
                         if cand.workspace_id != self.workspace_id:
                             logger.warning(f"Isolation Breach Attempt: {self.workspace_id} tried accessing {cand.workspace_id}")
                             continue
                         full_text = f"Title: {cand.title}\nDetails: {cand.searchable_text}"
                         full_content_map[ext_id] = full_text
                         continue

                    event = await self.calendar_sync.fetch_event(ext_id, provider)
                    if event:
                        full_text = f"Title: {event.get('title')}\nDesc: {event.get('description')}\nAttendees: {event.get('attendees')}"
                        full_content_map[ext_id] = full_text
                        self._CONTENT_CACHE[content_key] = (full_text, datetime.now())
            except Exception as e:
                logger.warning(f"Content access failed for {ext_id}")

        if count_total == 0:
            found_msg = "I searched Gmail + Outlook (and calendar). I couldn't find it."
            if keywords:
                found_msg = f"I couldn't find an email that mentions {keywords}."
            elif scope == "calendar":
                found_msg = "No calendar event matches that name/date."

            return {
                "status": "not_found",
                "answer_text": found_msg,
                "evidence": [],
                "data": {"params": params}
            }

        # 6. Synthesize
        synthesis = await self._synthesize_answer(user_query, results, full_content_map)
        
        # 7. Prepare Evidence
        evidence = []
        relevant_ids = set(synthesis.get("relevant_ids", []))
        
        # Combine all result objects to find metadata for relevant IDs
        all_objs = results["emails"] + results["remote_emails"] + results["calendar"]
        
        for obj in all_objs:
            obj_id = getattr(obj, "thread_id", None) or getattr(obj, "event_id", None) or getattr(obj, "id", None)
            if obj_id in relevant_ids:
                is_email = hasattr(obj, "thread_id") or (hasattr(obj, "provider") and obj.provider in ("gmail", "outlook"))
                ts = getattr(obj, "last_message_at", None) or getattr(obj, "created_at", None) or getattr(obj, "start_at", None)
                
                evidence.append({
                    "type": "thread" if is_email else "event",
                    "id": obj_id,
                    "provider": getattr(obj, "provider", "unknown"),
                    "timestamp": ts.isoformat() if ts else None
                })
        
        status = synthesis.get("status", "found")
        final_response = {
            "status": status,
            "answer_text": synthesis.get("answer", "I couldn't find an answer."),
            "evidence": evidence,
            "data": {
                "params": params,
                "raw_results_count": count_total
            }
        }
        
        # Save to Search Cache
        self._SEARCH_CACHE[cache_key] = (final_response, datetime.utcnow())
        return final_response

    async def _synthesize_answer(self, user_query: str, results: Dict[str, Any], full_content_map: Dict[str, str]) -> Dict[str, Any]:
        """Generate smart answer with Stage B context, returning JSON."""
        context_lines = []
        
        # Build context from all available results
        for ev in results["calendar"]:
            id_val = getattr(ev, "id", None) or getattr(ev, "event_id", None)
            context_lines.append(f"[CALENDAR ID: {id_val}] {ev.title} at {ev.start_at} ({ev.provider})")
            if id_val in full_content_map:
                context_lines.append(f"Details: {full_content_map[id_val]}")
        
        for em in results["emails"]:
            id_val = em.thread_id
            context_lines.append(f"[EMAIL ID: {id_val}] From: {em.sender} | Subject: {em.subject} | Date: {em.last_message_at}")
            if id_val in full_content_map:
                context_lines.append(f"Content: {full_content_map[id_val]}")
            else:
                context_lines.append(f"Snippet: {em.snippet}")

        for em in results["remote_emails"]:
            id_val = em.id
            context_lines.append(f"[EMAIL ID: {id_val}] From: {em.metadata.sender} | Subject: {em.metadata.subject} | Date: {em.created_at}")
            if id_val in full_content_map:
                context_lines.append(f"Content: {full_content_map[id_val]}")
            else:
                 context_lines.append(f"Snippet: {em.metadata.snippet or em.content}")

        context_str = "\n".join(context_lines)
        
        system = (
            "You are the Answer Engine for Aaliyah, a personalized assistant. "
            "Your goal is to provide STRICTLY GROUNDED answers based on search results. "
            "Return JSON with: status (found/not_found/multiple_found), answer (str), relevant_ids (list of IDs cited).\n\n"
            "Rules:\n"
            "1. If the answer is in the context, status=found. Be specific (yes/no, dates, names).\n"
            "2. If NOT in the context, status=not_found. Answer EXACTLY: 'I searched Gmail + Outlook (and calendar). I couldn't find it.'\n"
            "3. NO FABRICATION. If you see a potential commitment, only extract it if the words exist.\n"
            "4. relevant_ids must match the IDs provided in [ID: ...] brackets.\n"
            "5. If status=found, append EXACTLY ONE citation line at the end: 'I found this in: {subject} • {date} • {provider}'.\n"
            "6. If multiple threads look almost identical or equally relevant (ambiguity), set status=multiple_found and ask the user to pick (e.g., 'I found 3 similar emails—pick one.')."
        )
        
        prompt = f"User Question: {user_query}\n\nSearch Results:\n{context_str}\n\nJSON Response:"
        
        try:
            resp = await self.brain.think(
                prompt=prompt,
                system_prompt=system,
                model_override=ModelType.CHAT.value,
                temperature_override=0.0
            )
            import json
            text = resp.content
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0]
            elif "{" not in text:
                return {"status": "not_found", "answer": "I couldn't find it.", "relevant_ids": []}
            
            data = json.loads(text.strip())
            return data
        except Exception as e:
            logger.error(f"Synthesis failed: {e}")
            return {"status": "not_found", "answer": "I'm having trouble processing the search results.", "relevant_ids": []}

    def _search_local_emails(self, keywords: Optional[str], sender: Optional[str], time_range: Optional[str], limit: int = 20) -> List[Any]:
        query = self.db.query(EmailIndex).filter(EmailIndex.workspace_id == self.workspace_id)
        
        if sender:
            query = query.filter(EmailIndex.sender.ilike(f"%{sender}%"))
        
        if keywords:
            query = query.filter(EmailIndex.searchable_text.ilike(f"%{keywords}%"))
            
        now = datetime.utcnow()
        if time_range == "today":
            start = now.replace(hour=0, minute=0, second=0)
            query = query.filter(EmailIndex.last_message_at >= start)
        elif time_range == "last week":
            start = now - timedelta(days=7)
            query = query.filter(EmailIndex.last_message_at >= start)
        elif time_range == "last month":
            start = now - timedelta(days=30)
            query = query.filter(EmailIndex.last_message_at >= start)
            
        # Sprint 2 Ranking: recency boost + subject match boost
        query = query.order_by(
            desc(case((EmailIndex.subject.ilike(f"%{keywords}%"), 1), else_=0)) if keywords else desc(EmailIndex.last_message_at),
            desc(EmailIndex.last_message_at)
        )
            
        return query.limit(limit).all()

    def _search_calendar(self, keywords: Optional[str], time_range: Optional[str], limit: int = 20) -> List[Any]:
        query = self.db.query(CalendarIndex).filter(CalendarIndex.workspace_id == self.workspace_id)
        
        if keywords:
            query = query.filter(CalendarIndex.searchable_text.ilike(f"%{keywords}%"))
            
        now = datetime.utcnow()
        if time_range == "today":
             start = now.replace(hour=0, minute=0, second=0)
             end = start + timedelta(days=1)
             query = query.filter(CalendarIndex.start_at >= start, CalendarIndex.start_at < end)
        elif time_range == "last month":
             start = now - timedelta(days=30)
             query = query.filter(CalendarIndex.start_at >= start)
        
        query = query.order_by(
            desc(case((CalendarIndex.title.ilike(f"%{keywords}%"), 1), else_=0)) if keywords else CalendarIndex.start_at.asc(),
            CalendarIndex.start_at.asc()
        )
        
        return query.limit(limit).all()

    def _build_remote_query(self, keywords: str, sender: str, time_range: str) -> str:
        parts = []
        if sender:
            parts.append(f"from:{sender}")
        if keywords:
            parts.append(keywords)
        # time_range logic omitted for simplicity
        return " ".join(parts)

