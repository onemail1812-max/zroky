
import sys
import os

# Add api to path
sys.path.append(os.path.join(os.path.dirname(__file__), "../apps/api"))

from app.services.email.safety import evaluate_safety

class MockDraft:
    def __init__(self, body, subject="Re: Test"):
        self.body = body
        self.subject = subject

class MockEmail:
    def __init__(self, body_cleaned, subject="Test"):
        self.body_cleaned = body_cleaned
        self.subject = subject
        self.provider = "google"

def run_tests():
    print("Running Smoke Tests for Safe Auto-Send...")
    
    # 1. Primary Safe
    draft1 = MockDraft("Sure, let's meet on Tuesday at 2pm.")
    email1 = MockEmail("Can we meet?")
    safe, reason, score = evaluate_safety(draft1, email1, is_primary_account=True)
    if safe and "scheduling" in reason:
        print("✅ PASS: Safe scheduling detected.")
    else:
        print(f"❌ FAIL: Expected safe, got {reason}")

    # 2. Money Block
    draft2 = MockDraft("Please pay the $500 invoice.")
    email2 = MockEmail("How much?")
    safe, reason, score = evaluate_safety(draft2, email2, is_primary_account=True)
    if not safe and "unsafe keywords" in reason:
        print("✅ PASS: Money keywords blocked.")
    else:
        print(f"❌ FAIL: Expected block, got {reason}")

    # 3. Secondary Account Block
    safe, reason, score = evaluate_safety(draft1, email1, is_primary_account=False)
    if not safe and "Secondary account" in reason:
        print("✅ PASS: Secondary account blocked.")
    else:
        print(f"❌ FAIL: Expected secondary block, got {reason}")

    print("Smoke Tests Complete.")

if __name__ == "__main__":
    run_tests()
