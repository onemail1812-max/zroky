"""LangGraph Orchestration for Aaliyah's Email Processing Pipeline."""

import logging
from typing import TypedDict, Annotated, Sequence, Optional
from langgraph.graph import StateGraph, END
from app.services.ai.structured import get_instructor_client, EmailTriage
from app.agents.aaliyah.core.ingestion.email_ingestor import NormalizedEmailMessage

logger = logging.getLogger(__name__)

# 1. Define the State
class EmailAgentState(TypedDict):
    message: NormalizedEmailMessage
    triage_result: Optional[EmailTriage]
    draft: Optional[str]
    humanized_draft: Optional[str]
    error: Optional[str]

# 2. Nodes
async def triage_node(state: EmailAgentState):
    """Categorizes the email using DeepSeek-R1 and Instructor."""
    msg = state["message"]
    subject = msg.metadata.subject or "(No Subject)"
    sender = msg.metadata.sender or "Unknown"
    snippet = msg.content or ""
    
    try:
        instructor_client = get_instructor_client()
        triage = instructor_client.chat.completions.create(
            model="deepseek/deepseek-r1",
            response_model=EmailTriage,
            messages=[
                {"role": "system", "content": "You are an elite executive assistant 'Aaliyah'. Triage this email accurately. Avoid jargon. No hallucinations. Be concise."},
                {"role": "user", "content": f"Subject: {subject}\nSender: {sender}\nSnippet: {snippet[:1500]}"}
            ],
        )
        return {"triage_result": triage}
    except Exception as e:
        logger.error(f"Triage node failed: {e}")
        return {"error": str(e)}

async def ghostwrite_node(state: EmailAgentState):
    """Drafts a reply if the email needs one."""
    msg = state["message"]
    triage = state.get("triage_result")
    
    # We only ghostwrite if the category requires action
    if getattr(triage, "category", None) in ["needs_reply", "priority", "approvals", "draft"]:
        try:
            from app.services.ai.structured import get_instructor_client
            # Access underlying openai client from instructor wrapper
            client = get_instructor_client().client 
            intent = getattr(triage, "suggested_reply_intent", "Write a professional response.") or "Write a professional response."
            
            resp = client.chat.completions.create(
                model="deepseek/deepseek-r1",
                messages=[
                    {"role": "system", "content": "You are Aaliyah. Write a highly professional, concise draft reply for the business owner. DO NOT USE PLACEHOLDERS."},
                    {"role": "user", "content": f"Email:\n{msg.content}\n\nSuggested Intent:\n{intent}"}
                ]
            )
            draft = resp.choices[0].message.content
            return {"draft": draft}
        except Exception as e:
            logger.error(f"Ghostwrite node failed: {e}")
            return {"error": str(e)}
    return {"draft": None}

async def humanize_node(state: EmailAgentState):
    """Applies blader/humanizer logic to polish the draft."""
    draft = state.get("draft")
    if not draft:
        return {"humanized_draft": None}
        
    try:
        client = get_instructor_client().client
        system_prompt = (
            "You are a 'Humanizer' editor (based on blader/humanizer principles). "
            "Remove all 'bot-like' phrases, excessive politeness, fluff, and filler words. "
            "Make the email sound like a sharp, direct executive wrote it quickly. "
            "Use active voice. Be decisive. Return ONLY the edited text."
        )
        resp = client.chat.completions.create(
            model="deepseek/deepseek-r1",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Draft to humanize:\n{draft}"}
            ]
        )
        humanized = resp.choices[0].message.content
        return {"humanized_draft": humanized}
    except Exception as e:
        logger.error(f"Humanize node failed: {e}")
        return {"humanized_draft": draft} # Fallback to original draft

def should_draft(state: EmailAgentState):
    """Routing logic: Decide if we should move to ghostwriting or end."""
    if state.get("error"):
        return END
    category = getattr(state.get("triage_result"), "category", None)
    # We use string matching because Enum can sometimes be tricky with string values
    cat_val = category.value if hasattr(category, "value") else str(category)
    if cat_val in ["needs_reply", "priority", "approvals", "draft"]:
        return "ghostwrite"
    return END

# 3. Build Graph
workflow = StateGraph(EmailAgentState)
workflow.add_node("triage", triage_node)
workflow.add_node("ghostwrite", ghostwrite_node)
workflow.add_node("humanize", humanize_node)

workflow.set_entry_point("triage")
workflow.add_conditional_edges("triage", should_draft, {"ghostwrite": "ghostwrite", END: END})
workflow.add_edge("ghostwrite", "humanize")
workflow.add_edge("humanize", END)

email_orchestrator = workflow.compile()
