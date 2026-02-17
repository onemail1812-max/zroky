from __future__ import annotations
import os
import yaml
import logging

class AaliyahPolicy:
    """Wrapper around Aaliyah's safety policy YAML."""

    def __init__(self, policy_path: str = "app/agents/aaliyah/policies/aaliyah_policy.yaml"):
        self.policy_path = policy_path
        self._config = {}
        self._load()

    def _load(self):
        try:
            if not os.path.exists(self.policy_path):
                # Fallback default if missing
                self._config = {
                    "safe_categories": ["scheduling", "fyi", "thanks"],
                    "risky_categories": ["legal", "money", "hiring", "complaint"],
                    "confidence_threshold": 0.9,
                    "auto_send_primary": True,
                    "auto_send_secondary": False,
                }
                logging.warning(f"Policy file {self.policy_path} not found. Using defaults.")
                return

            with open(self.policy_path, "r", encoding="utf-8") as f:
                self._config = yaml.safe_load(f)
        except Exception as e:
            logging.error(f"Failed to load policy: {e}")
            self._config = {}

    @property
    def safe_categories(self) -> list[str]:
        return self._config.get("safe_categories", [])

    @property
    def risky_categories(self) -> list[str]:
        return self._config.get("risky_categories", [])

    @property
    def confidence_threshold(self) -> float:
        return self._config.get("confidence_threshold", 0.9)

    def is_safe(self, category: str, confidence: float) -> bool:
        """Determines if an action is safe based on policy."""
        if category in self.risky_categories:
            return False
        if category not in self.safe_categories:
            return False  # Uncategorized is risky
        return confidence >= self.confidence_threshold

# Global policy instance
policy = AaliyahPolicy()
