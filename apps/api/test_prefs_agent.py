
import asyncio
from app.agents.aaliyah.core.preferences_agent import PreferencesAgent
from app.services.brain.core import Brain

async def test():
    brain = Brain() # mock
    agent = PreferencesAgent(brain)
    
    query = "Please add boss@mycompany.com to my VIP senders list."
    current = {"vip_senders": []}
    
    print(f"Query: {query}")
    updates = await agent.interpret_update(query, current)
    print(f"Updates: {updates}")

if __name__ == "__main__":
    asyncio.run(test())
