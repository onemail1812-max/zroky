import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from app.agents.aaliyah.core.compose_drafting import ComposeDraftingAgent, ComposeExtraction

@pytest.mark.asyncio
async def test_compose_context_integration():
    db = MagicMock()
    workspace_id = "ws_123"
    
    # Mock Workspace settings
    mock_ws = MagicMock()
    mock_ws.settings_json = {"aaliyah": {"user_name": "Alice"}}
    db.query.return_value.filter.return_value.first.return_value = mock_ws
    
    agent = ComposeDraftingAgent(db, workspace_id)
    
    # Mock Brain
    mock_brain = AsyncMock()
    agent.brain = mock_brain
    
    # Mock Extraction
    extraction = ComposeExtraction(
        to_recipient="John",
        cc=[],
        bcc=[],
        subject="Project Update",
        body_instructions="Send the latest numbers for Orion.",
        context_keywords="Project Orion, Q3 targets",
        needs_clarification=False,
        clarification_question=""
    )
    mock_brain.think_json.return_value = extraction
    
    # Mock Memory Recall
    mock_memory = MagicMock()
    agent.memory = mock_memory
    mock_memory.recall.return_value = {
        "prompt_context": "Project Orion is a lunar mapping mission with a deadline in Dec 2026."
    }
    
    # Mock Draft Response
    mock_draft_response = MagicMock()
    mock_draft_response.content = "Hi John, following up on Project Orion (the lunar mapping mission)..."
    mock_brain.think.return_value = mock_draft_response
    
    gen = agent.handle_compose_intent("Draft an email to John about Orion", "user_456")
    results = []
    async for r in gen:
        results.append(r)
        
    # Verify memory recall was called with combined search query
    mock_memory.recall.assert_called_once()
    recall_query = mock_memory.recall.call_args[1]['query']
    assert "Project Orion, Q3 targets" in recall_query
    
    # Verify brain.think was called with the prompt context
    # It should be the second think call (the first is think_json)
    assert mock_brain.think.called
    draft_prompt = mock_brain.think.call_args[1]['prompt']
    assert "Project Orion is a lunar mapping mission" in draft_prompt
    
    # Verify final output
    compose_action = next(r for r in results if r['type'] == 'compose_action')
    assert compose_action['payload']['body'] == "Hi John, following up on Project Orion (the lunar mapping mission)..."
    
    # Check that at least some chunks contain the success message
    all_chunks = "".join([r['content'] for r in results if r['type'] == 'chunk'])
    assert "prepared the draft" in all_chunks
