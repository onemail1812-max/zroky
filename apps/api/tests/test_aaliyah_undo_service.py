import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base
from app.agents.aaliyah.core.undo_service import UndoService
from app.models.audit_log import AuditLog, AuditStatus
from app.models.triaged_email import TriagedEmail

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
async def test_undo_not_found(db_session):
    service = UndoService(db_session)
    with pytest.raises(ValueError, match="entry not found"):
        await service.undo("invalid_id", "user_1")

@pytest.mark.asyncio
async def test_undo_cross_workspace_denied(db_session):
    audit = AuditLog(
        id="a0", 
        workspace_id="ws_other", 
        action="TEST_ACTION",
        status=AuditStatus.APPLIED.value
    )
    db_session.add(audit)
    db_session.commit()
    service = UndoService(db_session)
    with pytest.raises(PermissionError, match="Cross-workspace"):
        await service.undo("a0", "user_1", workspace_id="ws_1")

@pytest.mark.asyncio
async def test_undo_already_undone(db_session):
    audit = AuditLog(
        id="a1", 
        workspace_id="ws_1", 
        action="TEST_ACTION",
        status=AuditStatus.UNDONE.value
    )
    db_session.add(audit)
    db_session.commit()
    
    service = UndoService(db_session)
    res = await service.undo("a1", "user_1")
    assert res["status"] == "already_undone"

@pytest.mark.asyncio
async def test_undo_restore_category_success(db_session):
    audit = AuditLog(
        id="a2", 
        workspace_id="ws_1", 
        action="UPDATE",
        status=AuditStatus.APPLIED.value,
        undo_payload={"type": "RESTORE_CATEGORY", "message_id": "msg_1", "to_category": "Inbox"}
    )
    email = TriagedEmail(
        id="msg_1", 
        workspace_id="ws_1", 
        provider="gmail",
        external_message_id="ext_1",
        category="Archive", 
        previous_category="Inbox"
    )
    db_session.add(audit)
    db_session.add(email)
    db_session.commit()
    
    service = UndoService(db_session)
    res = await service.undo("a2", "user_1")
    
    assert res["status"] == "undone"
    
    db_session.refresh(email)
    assert email.category == "Inbox"
    assert email.previous_category is None
    
    db_session.refresh(audit)
    assert audit.status == AuditStatus.UNDONE.value

@pytest.mark.asyncio
async def test_undo_remove_label_missing_args(db_session):
    audit = AuditLog(
        id="a3", 
        workspace_id="ws_1", 
        action="UPDATE",
        status=AuditStatus.APPLIED.value,
        undo_payload={"type": "REMOVE_LABEL"} # Missing args
    )
    db_session.add(audit)
    db_session.commit()
    
    service = UndoService(db_session)
    with pytest.raises(ValueError):
        await service.undo("a3", "user_1")
    
    db_session.refresh(audit)
    assert audit.status == AuditStatus.FAILED.value

@pytest.mark.asyncio
@patch("app.agents.aaliyah.core.undo_service.EmailConnectorFactory")
async def test_undo_remove_label_success(mock_factory_cls, db_session):
    audit = AuditLog(
        id="a4", 
        workspace_id="ws_1", 
        action="UPDATE",
        status=AuditStatus.APPLIED.value,
        undo_payload={"type": "REMOVE_LABEL", "provider": "gmail", "message_id": "msg_1", "label_name": "Label1"}
    )
    db_session.add(audit)
    db_session.commit()
    
    mock_connector = AsyncMock()
    mock_factory = MagicMock()
    mock_factory.get_connector = AsyncMock(return_value=mock_connector)
    mock_factory_cls.return_value = mock_factory
    
    service = UndoService(db_session)
    res = await service.undo("a4", "user_1", workspace_id="ws_1")
    
    assert res["status"] == "undone"
    mock_connector.remove_label.assert_called_once_with("msg_1", "Label1", label_id=None)

@pytest.mark.asyncio
async def test_undo_unsupported_operation(db_session):
    audit = AuditLog(
        id="a5", 
        workspace_id="ws_1", 
        action="UPDATE",
        status=AuditStatus.APPLIED.value,
        undo_payload={"type": "INVALID_OP"}
    )
    db_session.add(audit)
    db_session.commit()
    service = UndoService(db_session)
    with pytest.raises(ValueError, match="Unsupported undo operation"):
        await service.undo("a5", "user_1")
