import re

# Simple heuristic signature regex
# Vendored and simplified from multiple open source projects for MVP.
# Matches common signature delimiters like "--", "__", "Sent from my iPhone", etc.
SIG_REGEX = re.compile(
    r"(^--\s*$)|(^__\s*$)|(^Sent from my)|(^________________)|(^-+Original Message-+)|(^On .* wrote:)|(^Von:)|(^De:)|(^Am )",
    re.MULTILINE | re.IGNORECASE
)

QUOTE_REGEX = re.compile(
    r"(^>+)|(^On .* wrote:)|(^-+Original Message-+)|(^From:\s)|(^Sent:\s)|(^To:\s)|(^Subject:\s)|(^Begin forwarded message:)|(^-----\s*Original Message\s*-----)",
    re.MULTILINE | re.IGNORECASE
)


def parse_email_body(text: str) -> str:
    """
    Simulates `mail-parser-reply` behavior using regex heuristics to strip
    signatures and quoted replies.
    
    Args:
        text: The full email body text (converted from HTML if needed).
        
    Returns:
        The cleaned "latest message" text.
    """
    if not text:
        return ""
    
    lines = text.splitlines()
    cleaned_lines = []
    
    # Simple top-down scan until we hit a signature or quote indicator
    for line in lines:
        line_stripped = line.strip()
        
        if SIG_REGEX.match(line_stripped):
            break
            
        if QUOTE_REGEX.match(line_stripped):
            break
        
        # Heuristic: "On [date], [name] wrote:" usually precedes a quote block
        # We handle this via Regex but double check
        if line_stripped.startswith("On ") and line_stripped.strip().endswith("wrote:"):
             break

        cleaned_lines.append(line)
    
    return "\n".join(cleaned_lines).strip()
