import unittest
from app.agents.aaliyah.core.humanizer import HumanizerFilter

class TestHumanizerFilter(unittest.TestCase):

    def test_copula_replacement(self):
        text = "This tool serves as a foundation that boasts a range of capabilities."
        result = HumanizerFilter.apply(text)
        self.assertEqual(result, "This tool is a foundation that has a range of capabilities.")

    def test_banned_word_removal(self):
        # Test word replacement and capitalization preservation
        text = "Delve into this tapestry. It is a testament to our groundbreaking synergy."
        result = HumanizerFilter.apply(text)
        self.assertEqual(result, "Explore into this mix. It is a sign to our new combined benefit.")

    def test_complex_replacements(self):
        # Negative parallelisms
        text = "Not only is it fast but it is also reliable."
        self.assertEqual(HumanizerFilter.apply(text), "is it fast and it is reliable.")
        
        # False ranges
        text = "from inception to launch, from local to global"
        self.assertEqual(HumanizerFilter.apply(text), "inception, launch, local, and global")

        # Superficial -ing endings
        text = "The system is robust, highlighting the importance of security."
        self.assertEqual(HumanizerFilter.apply(text), "The system is strong.")

    def test_chatbot_artifact_removal(self):
        text = "Great question!\n\nThe sky is blue. I hope this helps!"
        result = HumanizerFilter.apply(text)
        self.assertEqual(result, "The sky is blue.")
        
        text = "Certainly! Here is your draft."
        self.assertEqual(HumanizerFilter.apply(text), "Here is your draft.")

    def test_style_hygiene(self):
        # Quotes
        text = "\u201cHello\u201d"
        self.assertEqual(HumanizerFilter.apply(text), '"Hello"')
        
        # Em-dash
        text = "AI coding\u2014it is fast."
        self.assertEqual(HumanizerFilter.apply(text), "AI coding, it is fast.")
        
        # Boldface
        text = "**Bold Header**"
        self.assertEqual(HumanizerFilter.apply(text), "Bold Header")

    def test_returns_empty_on_none(self):
        self.assertEqual(HumanizerFilter.apply(""), "")
        self.assertEqual(HumanizerFilter.apply(None), "")


if __name__ == '__main__':
    unittest.main()
