"""Deep Verification of ALL Aaliyah Enterprise Features."""
import sys
sys.path.insert(0, '.')

PASS = "PASS"
FAIL = "FAIL"
issues = []

# ===== TEST 1: PII Redaction =====
from app.agents.aaliyah.core.ingestion.sanitizer import redact_pii, detect_context_type, sanitize_email_body

print("=== TEST 1: PII REDACTION ===")

t1 = redact_pii("Please pay with card: 4111111111111111")
r = PASS if "[CARD_REDACTED]" in t1 else FAIL
if r == FAIL: issues.append("Credit card not redacted")
print(f"  Credit Card: {r}")

t2 = redact_pii("My SSN is 123-45-6789")
r = PASS if "[SSN_REDACTED]" in t2 else FAIL
if r == FAIL: issues.append("SSN not redacted")
print(f"  SSN: {r}")

t3 = redact_pii("Use this: [STRIPE_KEY_SAMPLE]")
r = PASS if "[KEY_REDACTED]" in t3 else FAIL
if r == FAIL: issues.append("API key not redacted")
print(f"  API Key: {r}")

t4 = redact_pii("The password: mySecretPass123")
r = PASS if "[PWD_REDACTED]" in t4 else FAIL
if r == FAIL: issues.append("Password not redacted")
print(f"  Password: {r}")

t5 = redact_pii("My PAN is ABCDE1234F")
r = PASS if "[ID_REDACTED]" in t5 else FAIL
if r == FAIL: issues.append("PAN not redacted")
print(f"  PAN Card: {r}")

# FALSE POSITIVE: Normal text
t6 = redact_pii("Hello team, please review the Q4 report.")
r = PASS if "REDACTED" not in t6 else FAIL
if r == FAIL: issues.append(f"False positive in normal text: {t6}")
print(f"  No False Positive (normal): {r}")

# FALSE POSITIVE: Dates
t6b = redact_pii("The deadline is 2026-02-27")
has_false = "SSN_REDACTED" in t6b
r = FAIL if has_false else PASS
if r == FAIL: issues.append(f"BUG: Date falsely detected as SSN: {t6b}")
print(f"  Date false positive: {r} -> {t6b}")

# FALSE POSITIVE: Short numbers (order IDs)
t6c = redact_pii("Order #12345 is confirmed")
print(f"  Order ID check: {t6c}")

# Phone (Business = redacted)
t7 = redact_pii("Call me at +91 9876543210", context_type="business")
r = PASS if "[PHONE_REDACTED]" in t7 else FAIL
if r == FAIL: issues.append("Phone not redacted in business")
print(f"  Phone (business): {r}")

# Phone (Personal = NOT redacted)
t8 = redact_pii("Call me at +91 9876543210", context_type="personal")
r = PASS if "[PHONE_REDACTED]" not in t8 else FAIL
if r == FAIL: issues.append("Phone wrongly redacted in personal")
print(f"  Phone (personal): {r}")

print()

# ===== TEST 2: Context Detection =====
print("=== TEST 2: CONTEXT DETECTION ===")
tests = [
    ("John <john@gmail.com>", "personal"),
    ("CEO <boss@acmecorp.com>", "business"),
    ("Info <info@yahoo.com>", "personal"),
    ("Support <help@hotmail.com>", "personal"),
    (None, "business"),
    ("noreply@example.com", "business"),
    ("user@icloud.com", "personal"),
]
for sender, expected in tests:
    result = detect_context_type(sender)
    r = PASS if result == expected else FAIL
    if r == FAIL: issues.append(f"Context wrong: {sender} -> {result} (expected {expected})")
    label = sender or "None"
    print(f"  {label:35s} -> {result:10s} {r}")

print()

# ===== TEST 3: Full Sanitize =====
print("=== TEST 3: FULL SANITIZE ===")
body = "Hi Team,\n\nPlease process card 4111111111111111.\nThe password: secret123\n\nBest regards,\nJohn Doe\nVP of Engineering\n\nConfidentiality notice: This email is intended only for the recipient."

cleaned = sanitize_email_body(body, context_type="business")
checks = {
    "Card redacted": "[CARD_REDACTED]" in cleaned,
    "Password redacted": "[PWD_REDACTED]" in cleaned,
    "Signature stripped": "VP of Engineering" not in cleaned,
    "Disclaimer stripped": "Confidentiality" not in cleaned,
    "Content preserved": "Hi Team" in cleaned,
}
for label, passed in checks.items():
    r = PASS if passed else FAIL
    if r == FAIL: issues.append(f"Sanitize: {label}")
    print(f"  {label}: {r}")

print(f"\n  Output:")
for line in cleaned.split("\n"):
    print(f"    | {line}")

print()

# ===== TEST 4: Triage Schema =====
print("=== TEST 4: TRIAGE RESULT SCHEMA ===")
from app.agents.aaliyah.core.triage_service import TriageResult
import json

tr = TriageResult(
    category="Priority", priority="High", is_noise=False, confidence=0.95,
    reasoning="Urgent", needs_clarity=True, can_draft=False,
    clarification_questions=["Approve budget?", "Timeline?"],
    context_type="business"
)
r = PASS if len(tr.clarification_questions) == 2 else FAIL
if r == FAIL: issues.append("Questions not stored")
print(f"  With questions: {r}")

tr2 = TriageResult(category="Newsletter", priority="Low", is_noise=True, confidence=0.99, reasoning="Marketing")
r = PASS if tr2.clarification_questions == [] and tr2.context_type == "business" else FAIL
if r == FAIL: issues.append("Defaults wrong")
print(f"  Defaults: {r}")

# JSON round-trip
data = json.loads(json.dumps({"category":"Approvals","priority":"High","is_noise":False,"confidence":0.88,"reasoning":"Expense","needs_clarity":True,"can_draft":False,"clarification_questions":["Approve $5k?","CC finance?"],"context_type":"business"}))
parsed = TriageResult(**data)
r = PASS if len(parsed.clarification_questions) == 2 else FAIL
if r == FAIL: issues.append("JSON round-trip failed")
print(f"  JSON round-trip: {r}")

print()

# ===== FINAL REPORT =====
print("=" * 50)
if issues:
    print(f"ISSUES FOUND: {len(issues)}")
    for i, issue in enumerate(issues, 1):
        print(f"  {i}. {issue}")
else:
    print("ALL TESTS PASSED - NO ISSUES FOUND")
print("=" * 50)
