import pytest
from unittest.mock import patch, MagicMock

@pytest.mark.asyncio
async def test_web_research_search_success():
    from app.agents.aaliyah.core.tools.web_research import WebResearchTool
    tool = WebResearchTool(brain=MagicMock())
    
    # Patch the actual source
    with patch("ddgs.DDGS") as MockDDGS:
        mock_instance = MagicMock()
        MockDDGS.return_value = mock_instance
        mock_instance.text.return_value = [
            {"title": "Result 1", "body": "Snippet 1", "href": "http://example.com/1"},
        ]
        
        res = await tool.search("test query")
        assert "Title: Result 1" in res

@pytest.mark.asyncio
async def test_web_research_search_no_results():
    from app.agents.aaliyah.core.tools.web_research import WebResearchTool
    tool = WebResearchTool(brain=MagicMock())
    
    with patch("ddgs.DDGS") as MockDDGS:
        mock_instance = MagicMock()
        MockDDGS.return_value = mock_instance
        mock_instance.text.return_value = []
        
        res = await tool.search("empty query")
        assert res == "No results found."

@pytest.mark.asyncio
async def test_web_research_search_failure():
    from app.agents.aaliyah.core.tools.web_research import WebResearchTool
    tool = WebResearchTool(brain=MagicMock())
    
    with patch("ddgs.DDGS") as MockDDGS:
        MockDDGS.side_effect = Exception("API Link Down")
        res = await tool.search("broken query")
        assert "Search failed: API Link Down" in res
