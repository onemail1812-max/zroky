import pytest
from unittest.mock import MagicMock, AsyncMock
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base
from app.agents.aaliyah.core.conflict_agent import ConflictAgent
from app.models.calendar_event_snapshot import CalendarConflict
from app.models.workspace import Workspace

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
async def test_analyze_conflicts_empty(db_session):
    agent = ConflictAgent(db=db_session, workspace_id="ws_1")
    results = await agent.analyze_conflicts(db_session)
    assert results == []

@pytest.mark.asyncio
async def test_analyze_conflicts_with_items(db_session):
    ws = Workspace(id="ws_1", owner_id="u1", name="Test WS", slug="test-ws-slug")
    conflict = CalendarConflict(id="c1", workspace_id="ws_1", conflict_type="overlap", explain="Event A overlaps Event B")
    db_session.add(ws)
    db_session.add(conflict)
    db_session.commit()

    mock_brain = MagicMock()
    mock_brain.think = AsyncMock(return_value=MagicMock(content="Reschedule Event B"))

    agent = ConflictAgent(db=db_session, workspace_id="ws_1", brain=mock_brain)
    results = await agent.analyze_conflicts(db_session)

    assert len(results) == 1
    assert results[0]["conflict_id"] == "c1"
    assert results[0]["proposal"] == "Reschedule Event B"
    mock_brain.think.assert_called_once()
