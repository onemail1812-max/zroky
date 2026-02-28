import asyncio
import os
import json
from datetime import datetime, timezone

from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.workspace import Workspace
from app.models.user import User

from app.agents.aaliyah.core.triage_service import SmartTriageClassifier
from app.agents.aaliyah.core.ingestion.email_ingestor import NormalizedEmailMessage, EmailMetadata
from app.agents.aaliyah.core.labeling_rules import LabelingRulesEngine
from app.agents.aaliyah.core.drafting import DraftingAgent
from app.services.brain.core import Brain

async def run_enterprise_test():
    db = SessionLocal()
    try:
        # Create or find test workspace
        workspace = db.query(Workspace).first()
        if not workspace:
            workspace = Workspace(id="test-workspace", expected_users=1, company_name="Test Corp")
            db.add(workspace)
            user = User(id="test-user", email="test@zroky.com", full_name="Test User", workspace_id="test-workspace")
            db.add(user)
            db.commit()
            print("Created test workspace.")
        
        ws_id = workspace.id

        print("\n--- Phase 1: Triage Classifier Test ---")
        brain = Brain()
        classifier = SmartTriageClassifier(brain)
        
        test_email = NormalizedEmailMessage(
            id="test-msg-123",
            workspace_id=ws_id,
            provider="google",
            source="inbox",
            content="Can you please send me the Q3 financial reports? I need them for the board meeting tomorrow morning.",
            is_read=False,
            created_at=datetime.now(timezone.utc),
            metadata=EmailMetadata(
                sender="CEO <ceo@zroky.com>",
                subject="URGENT: Q3 Financial Reports",
                thread_id="thread-xyz",
                attachments=[]
            )
        )
        
        triage_result = await classifier.classify(test_email)
        print(f"Subject: {test_email.metadata.subject}")
        print(f"Category Generated: {triage_result.category}")
        print(f"Priority Generated: {triage_result.priority}")
        print(f"Analyzed Confidence: {triage_result.confidence}")
        print(f"Reasoning: {triage_result.reasoning}")

        print("\n--- Phase 2: Labeling Rules Engine Test ---")
        label_engine = LabelingRulesEngine(db, ws_id)
        decision = label_engine.decide_labels(
            message=test_email,
            triage=triage_result,
            history=[],
            upcoming_events=[],
            workspace_settings={}
        )
        print(f"Auto-Labels Applied: {decision.labels}")
        print(f"Requires Approval: {decision.requires_approval} (Reason: {decision.approval_reason})")

        if decision.requires_approval or "Needs Reply" in triage_result.category or triage_result.priority == "High":
             print("\n--- Phase 3: Drafting & Humanizer Test ---")
             draft_agent = DraftingAgent(db, ws_id)
             # Write mock to DB to satisfy DraftingAgent query
             from app.models.triaged_email import TriagedEmail
             import uuid
             mock_id = str(uuid.uuid4())
             triaged_mock = TriagedEmail(
                 id=mock_id,
                 workspace_id=ws_id,
                 provider="google",
                 external_message_id=test_email.id,
                 subject=test_email.metadata.subject,
                 sender=test_email.metadata.sender,
                 snippet=test_email.content,
                 category=triage_result.category,
                 is_noise=False,
                 requires_approval=decision.requires_approval,
                 approval_reason=decision.approval_reason
             )
             db.add(triaged_mock)
             db.commit()
             draft_response = await draft_agent.generate_draft(
                 email=triaged_mock
             )
             print(f"Generated Draft Subject: {draft_response.subject}")
             print(f"Generated Draft Body: {draft_response.body}")
             print(f"Humanized Output applied? Check tone tags: {draft_response.tone_tags}")
    except Exception as e:
        print(f"TEST FAILED: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(run_enterprise_test())
