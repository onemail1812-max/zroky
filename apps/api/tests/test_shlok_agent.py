import pytest
import json
from unittest.mock import patch, MagicMock, AsyncMock
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base
from app.services.shlok.orchestrator import ShlokOrchestrator
from app.services.shlok.memory import load_thread_context, load_shlok_guideline
from app.services.shlok.prompting import build_base_rules, build_output_contract
from app.models.guideline import Guideline
from app.models.message import Message, AuthorType

engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, expire_on_commit=False)

@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)

@pytest.mark.asyncio
async def test_shlok_orchestrator_generate_reply(db_session):
    # Setup Guideline
    content = {
        "instructions": "Be very social.",
        "tone": {"default": "exciting", "avoid": ["boring"]},
        "reference_playbooks": [{"url": "http://x.com", "title": "X Playbook"}]
    }
    g = Guideline(
        id="g1", 
        workspace_id="ws_1", 
        employee_id="shlok", 
        content_json=json.dumps(content)
    )
    db_session.add(g)
    db_session.commit()

    orch = ShlokOrchestrator(db_session)
    # Mock Brain
    orch.brain.think = AsyncMock(return_value=MagicMock(content='{"rationale": "ok", "drafts": []}'))

    messages = [{"role": "user", "content": "Hello Shlok"}]
    reply = await orch.generate_reply("ws_1", messages)
    
    assert '{"rationale": "ok", "drafts": []}' in reply
    orch.brain.think.assert_called_once()

def test_load_thread_context(db_session):
    m1 = Message(
        id="m1", 
        workspace_id="ws_1", 
        thread_id="t1", 
        employee_id="shlok", 
        author_type=AuthorType.USER, 
        content_text="Hi"
    )
    m2 = Message(
        id="m2", 
        workspace_id="ws_1", 
        thread_id="t1", 
        employee_id="shlok", 
        author_type=AuthorType.AI, 
        content_text="Hello"
    )
    db_session.add_all([m1, m2])
    db_session.commit()

    context = load_thread_context(db_session, "ws_1", "t1")
    assert len(context) == 2
    assert context[0]["role"] == "user"
    assert context[1]["role"] == "assistant"

def test_load_shlok_guideline(db_session):
    g = Guideline(
        id="g2", 
        workspace_id="ws_1", 
        employee_id="shlok", 
        content_json='{"test": true}'
    )
    db_session.add(g)
    db_session.commit()

    res = load_shlok_guideline(db_session, "ws_1")
    assert res == {"test": True}

def test_shlok_prompting_statics():
    base = build_base_rules()
    contract = build_output_contract()
    assert "SHLOK" in base
    assert "DRAFTS" in base.upper()
    assert "OUTPUT CONTRACT" in contract
