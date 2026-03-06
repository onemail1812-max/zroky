import sys
import os
from pathlib import Path

# Add app directory to sys.path
sys.path.append(str(Path("d:/Zroky/apps/api")))

from app.agents.aaliyah.core.runtime_gate import final_action_gate

def test_gate():
    settings = {
        "aaliyah": {
            "auto_send_enabled": True
        }
    }

    # Scenario 1: Safe Compose Email (Autonomous)
    draft_safe = {
        "body": "Hello, this is a safe email about a meeting.",
        "risk_labels": []
    }
    allowed_safe = final_action_gate(
        action="SEND",
        email_row=None,
        draft=draft_safe,
        settings=settings,
        is_explicit_approval=False
    )
    print(f"Safe Autonomous Compose: {allowed_safe} (Expected: True)")

    # Scenario 2: Sensitive Compose Email (Autonomous) - Should be blocked
    draft_sensitive = {
        "body": "My bank account number is 123456789.",
        "risk_labels": []
    }
    allowed_sensitive = final_action_gate(
        action="SEND",
        email_row=None,
        draft=draft_sensitive,
        settings=settings,
        is_explicit_approval=False
    )
    print(f"Sensitive Autonomous Compose: {allowed_sensitive} (Expected: False)")

    # Scenario 3: Sensitive Compose Email (Manual Approval) - Should be allowed
    allowed_sensitive_manual = final_action_gate(
        action="SEND",
        email_row=None,
        draft=draft_sensitive,
        settings=settings,
        is_explicit_approval=True
    )
    print(f"Sensitive Manual Compose: {allowed_sensitive_manual} (Expected: True)")

    # Scenario 4: Auto-Send Disabled (Autonomous) - Should be blocked
    settings_no_auto = {"aaliyah": {"auto_send_enabled": False}}
    allowed_no_auto = final_action_gate(
        action="SEND",
        email_row=None,
        draft=draft_safe,
        settings=settings_no_auto,
        is_explicit_approval=False
    )
    print(f"Auto-Send Disabled Autonomous: {allowed_no_auto} (Expected: False)")

if __name__ == "__main__":
    test_gate()
