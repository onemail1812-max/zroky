import asyncio
from app.agents.aaliyah.core.drafting import DraftingAgent
from app.database import SessionLocal
from app.models.triaged_email import TriagedEmail
from app.models.workspace import Workspace

async def test_humanizer_quality():
    db = SessionLocal()
    try:
        workspace = db.query(Workspace).first()
        if not workspace:
            print("No workspace found in DB.")
            return
        ws_id = workspace.id
        
        agent = DraftingAgent(db, ws_id)
        email = TriagedEmail(
            id="test-quality",
            workspace_id=ws_id,
            subject="Looking for your thoughts on the merger",
            sender="Dave <dave@partner.com>",
            snippet="Hi, I wanted to get your thoughts on the merger deal. Moreover, it is crucial that we delve into the details soon. It represents a significant shift in our strategy.",
            category="Needs Reply"
        )
        
        print(f"Drafting with Llama-3.3-70B + Blader/Humanizer Rules (Workspace: {ws_id})...")
        result = await agent.generate_draft(email)
        
        if not result:
            print("No draft generated (Action was 'ignore').")
            return

        print(f"\n--- DRAFT OUTPUT ---")
        print(f"Body: {result.body}")
        print(f"Tone Tags: {result.tone_tags}")
        print(f"Rationale: {result.rationale}")
        
        # Check for banned AI words
        banned = ["delve", "testament", "tapestry", "moreover", "crucial"]
        found = [w for w in banned if w in result.body.lower()]
        if found:
            print(f"\nWARNING: Found AI-like words: {found}")
        else:
            print("\nSUCCESS: No AI-like filler found.")
            
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(test_humanizer_quality())
