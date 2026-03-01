"""
Verification Test for Aaliyah's Brain
This script simulates a run of the Aaliyah Core using the REAL Brain service.
"""

import asyncio
import logging
import sys
import os

# Add the project root (apps/api) to python path so imports work
current_dir = os.path.dirname(os.path.abspath(__file__))
api_root = os.path.abspath(os.path.join(current_dir, ".."))
sys.path.append(api_root)

# Import Orchestrator
from app.agents.aaliyah.core.orchestrator import AaliyahOrchestrator

# Configure logging to see the thoughts
logging.basicConfig(level=logging.INFO, format='%(name)s - %(message)s')

async def main():
    print("🚀 Initializing Aaliyah Orchestrator...")
    orchestrator = AaliyahOrchestrator(workspace_id="test_workspace")
    
    print("\n🧠 Checking Orchestrator Status...")
    status = orchestrator.get_status()
    print(f"Status: {status}")

    # Note: We can't easily Simulate 'think' and 'act' loop here as it relies on DB state 
    # and async tasks in the Orchestrator. 
    # For now, we verify we can instantiate it and it has a brain connected.
    
    print("\n✅ Orchestrator Initialized.")
    if orchestrator.brain:
         print("Brain attached.")

if __name__ == "__main__":
    asyncio.run(main())
