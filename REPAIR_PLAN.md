# Aaliyah System Repair Plan - "End to End" Analysis

## 1. Executive Summary & Status
We have performed a comprehensive end-to-end analysis of the `Zroky` workspace (Aaliyah Project).
**Current Status**: 🔴 **CRITICAL FAILURE**
The user's frustration is fully justified. The system is in a state of "illusionary functionality"—the UI looks premium, but the wiring underneath is disconnected or broken in fundamental ways.

### Top 3 Critical Blockers:
1.  **The "Invisible" Settings**: The "Settings" button exists in the `SettingsForm` component but is **nowhere to be found** in the main workspace UI (`WorkspaceShell` or `LeftPanel`). The user physically cannot click a button that isn't rendered.
2.  **The "One-Hour" Sync**: The backend email fetcher (`fetchers.py`) has **NO token refresh logic**. It assumes the access token is always valid. Since Google/Microsoft tokens expire in 1 hour, the sync permanently fails after the first hour of usage.
3.  **The "Brain" Disconnect**: The system is hardcoded to look for an `OPENROUTER_API_KEY` or `BRAIN_API_KEY` in the server environment. It does not appear to use any external "Brain AI" integration the user mentions, likely falling back to a "Mock" mode or a default OpenRouter model that isn't what the user expects.

---

## 2. Detailed Findings

### A. Syncing & Integration (The "Not Fetching Mails" Issue)
*   **Root Cause**: In `apps/api/app/services/email/fetchers.py`, the code takes an `access_token` and tries to call Gmail/Outlook.
    *   *The Bug*: If the token is expired (401 Unauthorized), it just returns `[]` (empty list) and prints an error. It never asks for a new token using the `refresh_token`.
*   **Result**: Users see "Not syncing" or "Not fetching" indefinitely after the first successful login expires.

### B. The "Brain" / LLM Issues
*   **Configuration**: `apps/api/app/services/brain/core.py` initializes the Brain.
    *   It checks `settings.brain_api_key`. If missing, it checks `settings.openrouter_api_key`.
    *   If both are missing (or look like placeholders), it enters **MOCK MODE**, returning pre-canned "Good morning" messages.
*   **User Perception**: The user says "Already we have integration connection in Brain AI".
    *   *Analysis*: The code has no adapter for a custom "Brain AI" platform other than OpenRouter. If the user expects it to connect to a different URL/Service, that configuration is missing from `config.py`.
    *   *The "Hallucination"*: If running in Mock mode or using a small model (`gemini-2.5-flash-lite`), the quality will be low, leading to the "always wrongs things" complaint.

### C. Frontend/UI Broken Links
*   **Settings Unreachable**: The `WorkspaceShell.tsx` renders `LeftPanel`, `NotificationStream`, and `IntelligencePanel`.
    *   *The Bug*: **None of these components render a "Settings" or "Configuration" button.** The `SettingsForm` component is imported in `WorkspaceShell` (maybe?) but never used.
*   **Integration Page**: `apps/web/src/app/brain/page.tsx` exists and has an `IntegrationGrid`. This is the *only* place to connect Gmail/Outlook. If the user cannot navigate here easily (or if this page is disconnected from the main nav), they cannot reconnect their expired accounts.

### D. Code Quality & Clutter
*   **Duplicates**: The `apps/api` folder is littered with script files:
    *   `check_emails.py`, `check_tables.py`, `check_workspace.py`
    *   `fix_indentation.py`, `fix_indentation_global.py`
    *   `debug_fk.py`, `debug_inbox.py`
*   These should be moved to a `scripts/` folder or deleted to reduce noise.

---

## 3. Immediate Repair Plan

### Phase 1: Fix the UI (Enable Settings)
1.  **Update `LeftPanel.tsx`**: Add a "Settings" / "Configuration" button at the bottom of the sidebar.
2.  **Update `WorkspaceShell.tsx`**: Add state `isSettingsOpen` and render the `<SettingsForm />` modal when the button is clicked.

### Phase 2: Fix the Sync (Token Refresh)
1.  **Implement `refresh_access_token`**: In `apps/api/app/services/oauth.py` (or a particular auth service), implement the logic to swap a valid `refresh_token` for a new `access_token`.
2.  **Update `fetchers.py`**: Wrap the API calls in a retry loop. If `401` is received, call `refresh_access_token` and retry.

### Phase 3: Fix the Brain (Configuration)
1.  **Expose Config in UI**: Add a "Brain Configuration" section in the Settings UI where the user can input their API Key (if they are self-hosting) or verify the connection status.
2.  **Verify Env Vars**: We must ask the user to explicitly check their `.env` file in `apps/api/.env` to ensure `OPENROUTER_API_KEY` is present and valid.

### Phase 4: Cleanup
1.  **Move Scripts**: Move all `check_*.py` and `fix_*.py` files into `apps/api/scripts/legacy/`.

---

## 4. Next Actions for User
1.  **Approve this plan.**
2.  **Provide context on "Brain AI"**: Is this a specific external service URL? Or just a name for the internal AI?
3.  **Check `.env`**: Confirm if `d:\Zroky\apps\api\.env` contains a valid `OPENROUTER_API_KEY`.
