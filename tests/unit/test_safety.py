import unittest
from dataclasses import dataclass
from app.services.email.safety import evaluate_safety

# Mock Models
@dataclass
class MockDraft:
    body: str
    subject: str = "Re: Test"

@dataclass
class MockEmail:
    body_cleaned: str
    subject: str = "Test Subject"
    provider: str = "google"

class TestSafetyLogic(unittest.TestCase):
    def test_unsafe_keywords_money(self):
        draft = MockDraft(body="Please pay the invoice of $500")
        email = MockEmail(body_cleaned="Hi")
        is_safe, reason, conf = evaluate_safety(draft, email, is_primary_account=True)
        self.assertFalse(is_safe)
        self.assertIn("unsafe keywords", reason)

    def test_unsafe_keywords_legal(self):
        draft = MockDraft(body="I will sign the NDA")
        email = MockEmail(body_cleaned="Hi")
        is_safe, reason, conf = evaluate_safety(draft, email, is_primary_account=True)
        self.assertFalse(is_safe)
        self.assertIn("unsafe keywords", reason)

    def test_safe_scheduling(self):
        draft = MockDraft(body="I can meet on Tuesday at 2pm.")
        email = MockEmail(body_cleaned="Can we meet?")
        is_safe, reason, conf = evaluate_safety(draft, email, is_primary_account=True)
        self.assertTrue(is_safe)
        self.assertEqual(reason, "Safe: scheduling")

    def test_secondary_account_blocked(self):
        draft = MockDraft(body="I can meet on Tuesday.")
        email = MockEmail(body_cleaned="Can we meet?")
        is_safe, reason, conf = evaluate_safety(draft, email, is_primary_account=False)
        self.assertFalse(is_safe)
        self.assertIn("Secondary account", reason)

    def test_anger_in_original_email(self):
        draft = MockDraft(body="I understand.")
        email = MockEmail(body_cleaned="I am very angry about this!")
        is_safe, reason, conf = evaluate_safety(draft, email, is_primary_account=True)
        self.assertFalse(is_safe)
        self.assertIn("high-risk (anger", reason)

if __name__ == '__main__':
    unittest.main()
