import pytest
from app.services.ai.structured import EmailTriage, get_instructor_client
from app.config import settings

@pytest.mark.asyncio
async def test_instructor_triage_real():
    if not settings.BRAIN_API_KEY:
        pytest.skip("No API key available for testing.")

    client = get_instructor_client()
    
    # Send a fast request using a cheaper model for testing extraction formatting
    response = client.chat.completions.create(
        model="google/gemma-7b-it", # using a fast openrouter model for test
        response_model=EmailTriage,
        messages=[
            {"role": "system", "content": "You are an elite assistant classifying this email."},
            {"role": "user", "content": "Subject: Urgent: Server is down!\nSender: devops@company.com\nSnippet: We are seeing 500 errors across all services."}
        ],
    )
    
    assert isinstance(response, EmailTriage)
    assert response.category.value == "priority"
    assert response.priority_score > 5
    assert len(response.summary) > 5
