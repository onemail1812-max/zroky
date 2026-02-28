"""Enterprise Email Sanitizer: PII Redaction, Signature Stripping, Context-Aware Cleaning."""

import re
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# ── PII Patterns (Enterprise Data Privacy) ─────────────────────────────
_PII_PATTERNS = {
    # Credit/Debit Card Numbers (Visa, MasterCard, Amex, etc.)
    "credit_card": re.compile(
        r"\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|"
        r"6(?:011|5[0-9]{2})[0-9]{12}|(?:2131|1800|35\d{3})\d{11})\b"
    ),
    # US Social Security Numbers
    "ssn": re.compile(r"\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b"),
    # Phone numbers (international and local)
    "phone": re.compile(
        r"(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}\b"
    ),
    # API Keys / Secrets (high-entropy alphanumeric strings like abc_123, api-key-xxx)
    "api_key": re.compile(
        r"\b(?:sk|pk|api|key|token|secret|password)[-_][a-zA-Z0-9_-]{16,}\b",
        re.IGNORECASE,
    ),
    # Passwords in plain text (e.g., "password: abc123" or "pwd=xyz")
    "password_inline": re.compile(
        r"(?:password|pwd|passwd|passcode)\s*[:=]\s*\S+",
        re.IGNORECASE,
    ),
    # Bank Account / Routing Numbers (generic pattern)
    "bank_account": re.compile(
        r"\b(?:account|acct|routing)\s*(?:no|number|#)?\s*[:=]?\s*\d{8,17}\b",
        re.IGNORECASE,
    ),
    # Aadhaar Numbers (India, 12 digits with optional spaces)
    "aadhaar": re.compile(r"\b\d{4}\s?\d{4}\s?\d{4}\b"),
    # PAN Card (India)
    "pan_card": re.compile(r"\b[A-Z]{5}\d{4}[A-Z]\b"),
}

# Redaction labels per category
_REDACTION_LABELS = {
    "credit_card": "[CARD_REDACTED]",
    "ssn": "[SSN_REDACTED]",
    "phone": "[PHONE_REDACTED]",
    "api_key": "[KEY_REDACTED]",
    "password_inline": "[PWD_REDACTED]",
    "bank_account": "[ACCT_REDACTED]",
    "aadhaar": "[ID_REDACTED]",
    "pan_card": "[ID_REDACTED]",
}

# ── Signature & Disclaimer Markers ─────────────────────────────────────
SIGNATURE_MARKERS = [
    r"--\s*$",
    r"Best regards,",
    r"Kind regards,",
    r"Warm regards,",
    r"Thanks,",
    r"Thank you,",
    r"Sincerely,",
    r"Cheers,",
    r"Regards,",
    r"With appreciation,",
    r"Sent from my iPhone",
    r"Sent from my Android",
    r"Sent from my iPad",
    r"Sent from Mail for Windows",
    r"Get Outlook for",
]

DISCLAIMER_KEYWORDS = [
    "confidentiality notice",
    "disclaimer",
    "intended recipient",
    "strictly prohibited",
    "privileged information",
    "please notify the sender",
    "save a tree",
    "do not print",
    "this email and any attachments",
    "unauthorized use",
]


# ── Core Functions ─────────────────────────────────────────────────────

def redact_pii(text: str, context_type: str = "business") -> str:
    """
    Enterprise PII Redaction Engine.
    Scans text for sensitive data patterns and replaces them with safe labels.
    
    Args:
        text: Raw email content.
        context_type: 'business' (strict) or 'personal' (lenient on phone numbers).
    
    Returns:
        Redacted text safe for LLM consumption.
    """
    if not text:
        return ""

    redacted = text
    redaction_count = 0

    # Apply each PII pattern
    for pii_type, pattern in _PII_PATTERNS.items():
        # Personal context: skip phone number redaction (users might want to see their own)
        if context_type == "personal" and pii_type == "phone":
            continue

        label = _REDACTION_LABELS[pii_type]
        matches = pattern.findall(redacted)
        if matches:
            redacted = pattern.sub(label, redacted)
            redaction_count += len(matches)

    if redaction_count > 0:
        logger.info(f"PII Redaction: {redaction_count} item(s) redacted (context={context_type})")

    return redacted


def sanitize_email_body(body: str, context_type: str = "business") -> str:
    """
    Enterprise Email Sanitizer.
    1. Strips signatures, disclaimers, and deep quote chains.
    2. Redacts PII before LLM consumption.
    
    Args:
        body: Raw email body.
        context_type: 'business' or 'personal'.
    """
    if not body:
        return ""

    lines = body.splitlines()
    clean_lines = []

    in_signature = False
    in_disclaimer = False

    for line in lines:
        stripped = line.strip()
        if not stripped:
            if not in_signature:
                clean_lines.append(line)
            continue

        # 1. Detect Signature Start
        if any(re.search(marker, stripped, re.IGNORECASE) for marker in SIGNATURE_MARKERS):
            in_signature = True

        # 2. Detect Disclaimer Start
        if any(word in stripped.lower() for word in DISCLAIMER_KEYWORDS):
            in_disclaimer = True

        # 3. Deep Quote Chains (keep first level, strip nested)
        if stripped.startswith(">"):
            if stripped.startswith("> >") or stripped.startswith(">>"):
                continue

        # 4. Filter if in zone
        if in_signature:
            continue

        if in_disclaimer:
            continue

        clean_lines.append(line)

    cleaned = "\n".join(clean_lines).strip()

    # 5. PII Redaction (Enterprise Privacy Layer)
    cleaned = redact_pii(cleaned, context_type=context_type)

    return cleaned


def extract_latest_reply(body: str) -> str:
    """
    Extracts only the latest reply from a thread chain.
    """
    markers = [
        r"On\s+.*wrote:",
        r"-+\s*Original Message\s*-+",
        r"From:\s+.*",
        r"Sent:\s+.*",
        r"To:\s+.*",
        r"Subject:\s+.*",
    ]

    lines = body.splitlines()
    latest_reply = []

    for line in lines:
        if any(re.search(marker, line, re.IGNORECASE) for marker in markers):
            break
        latest_reply.append(line)

    return "\n".join(latest_reply).strip()


def detect_context_type(sender: Optional[str] = None, workspace_settings: Optional[dict] = None) -> str:
    """
    Determines if an email interaction is 'business' or 'personal'
    based on sender domain and workspace configuration.
    
    Business signals: Corporate domains, internal domains, VIP senders.
    Personal signals: Gmail, Yahoo, Outlook consumer domains.
    """
    personal_domains = {
        "gmail.com", "yahoo.com", "hotmail.com", "outlook.com",
        "live.com", "icloud.com", "aol.com", "protonmail.com",
        "yandex.com", "mail.com", "zoho.com", "rediffmail.com",
    }

    if not sender:
        return "business"  # Default to stricter mode

    # Extract domain from "Name <email@domain.com>" format
    email_part = sender
    if "<" in sender and ">" in sender:
        email_part = sender.split("<")[1].split(">")[0]

    domain = email_part.split("@")[1].lower() if "@" in email_part else ""

    # Check workspace-configured internal domains
    if workspace_settings:
        internal_domains = workspace_settings.get("aaliyah", {}).get("internal_domains", [])
        if domain in [d.lower() for d in internal_domains]:
            return "business"

    # Personal domain check
    if domain in personal_domains:
        return "personal"

    # Default: treat unknown domains as business (stricter)
    return "business"
