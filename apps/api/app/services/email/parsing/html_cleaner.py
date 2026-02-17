from bs4 import BeautifulSoup
import html
import re

def clean_html_to_text(html_content: str) -> str:
    """
    Convert HTML email to clean text.
    Handles <br>, <p>, and list items correctly.
    """
    if not html_content:
        return ""
        
    soup = BeautifulSoup(html_content, "html.parser")
    
    # Replace <br> with newlines
    for br in soup.find_all("br"):
        br.replace_with("\n")
        
    # Replace <p> with newlines after the text (block level)
    for p in soup.find_all("p"):
        p.replace_with(f"{p.get_text()}\n")
        
    # Get text with stripped whitespace
    text = soup.get_text(separator="\n", strip=True)
    
    # Remove excessive newlines
    text = re.sub(r'\n{3,}', '\n\n', text)
    
    return text.strip()
