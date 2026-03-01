"""
Verification Test for Aaliyah's Triage System (Llama 3 + DeepSeek R1)
"""

import asyncio
import logging
import sys
import os

# Add the project root to python path
current_dir = os.path.dirname(os.path.abspath(__file__))
api_root = os.path.abspath(os.path.join(current_dir, ".."))
sys.path.append(api_root)

from app.agents.aaliyah.core.core.agent import AaliyahCore

logging.basicConfig(level=logging.INFO, format='%(name)s - %(message)s')

async def main():
    print("🚀 Initializing Aaliyah...")
    agent = AaliyahCore(workspace_id="test_workspace")
    
    # Scene 1: SPAM (Should be ignored by Llama 3)
    spam_event = {
        "type": "new_email",
        "sender": "newsletter@marketing.com",
        "subject": "50% OFF TODAY ONLY",
        "content": "Buy our new shoes..."
    }
    
    print("\n📧 PROCESSING EVENT 1 (Spam)...")
    await agent.perceive(spam_event)
    
    # Scene 2: URGENT (Should trigger DeepSeek R1)
    urgent_event = {
        "type": "new_email",
        "sender": "ceo@company.com",
        "subject": "Urgent: Board Meeting",
        "content": "Can you schedule a meeting with the board for tomorrow?"
    }
    
    print("\n📧 PROCESSING EVENT 2 (Urgent)...")
    await agent.perceive(urgent_event)

if __name__ == "__main__":
    asyncio.run(main())
