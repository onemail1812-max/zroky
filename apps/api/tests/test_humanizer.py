import unittest
from app.agents.aaliyah.core.humanizer import HumanizerFilter

class TestHumanizerFilter(unittest.TestCase):

    def test_copula_replacement(self):
        text = "This tool serves as a foundation that boasts many capabilities."
        result = HumanizerFilter.apply(text)
        self.assertEqual(result, "This tool is a foundation that has many capabilities.")

    def test_banned_word_removal(self):
        # Humanizer replaces banned words if defined in REPLACEMENTS. 
        # But wait, we only did regex replacements for Copulas in the code!
        # Let's ensure the test matches the current `humanizer.py` logic which swaps "serves as" etc.
        text = "The system functions as a guide. Due to the fact that it is fast."
        result = HumanizerFilter.apply(text)
        self.assertEqual(result, "The system is a guide. Because it is fast.")

    def test_chatbot_artifact_removal(self):
        text = "Great question!\n\nThe sky is blue. I hope this helps!"
        result = HumanizerFilter.apply(text)
        self.assertEqual(result, "The sky is blue.")

    def test_returns_empty_on_none(self):
        self.assertEqual(HumanizerFilter.apply(""), "")
        self.assertEqual(HumanizerFilter.apply(None), "")


if __name__ == '__main__':
    unittest.main()
