import asyncio
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.agents.aaliyah.core.tools.tool_dispatcher import ToolDispatcher
from app.services.brain.core import Brain

async def test_dispatch():
    db = SessionLocal()
    try:
        workspace_id = "test-workspace" # Doesn't matter for this unit-like test
        brain = Brain()
        
        print("Initializing ToolDispatcher...")
        dispatcher = ToolDispatcher(workspace_id=workspace_id, brain=brain, db=None)
        
        # Test dispatching RESEARCH
        # This will trigger research_agent.summarize_topic(db, message)
        print("Dispatching RESEARCH intent...")
        
        # We can't easily mock the result without complex mocking, but we can check if it CRASHES
        # or if the attributes are set correctly after the call.
        
        try:
             # This might fail on actual LLM call or DB query if test-workspace doesn't exist,
             # but we want to see if it even GETS to the method without 'AttributeError: db' or similar.
             await dispatcher.dispatch(db, "RESEARCH", "Explain Aaliyah's architecture", {"params": {}})
        except Exception as e:
             # If it fails with "no data" or "LLM error", that's fine, as long as it's not a DB attribute error.
             print(f"Outcome (as expected or handled): {e}")

        print("Checking session propagation...")
        if dispatcher.research_agent.db == db:
            print("SUCCESS: ResearchAgent has current session.")
        else:
            print("FAILURE: ResearchAgent session mismatch.")
            
        if dispatcher.research_agent.search_agent.db == db:
            print("SUCCESS: Internal SearchAgent has current session.")
        else:
            print("FAILURE: Internal SearchAgent session mismatch.")

    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(test_dispatch())
