# Production Ready Inbox - Verification Guide

## 1. Overview
The Aaliyah Inbox has been upgraded to a **Stability-First, High-Performance 3-Panel Workspace**.
It features strict environment validation, resilient token refreshing, and a streamlined "Work Queue" UI.

## 2. New Architecture
-   **Panel A (Left)**: Live Navigation with real-time badges (polled every 10s).
-   **Panel B (Middle)**: Work Queue (hidden in "Today" view) with "Auto-Select" logic for rapid triage.
-   **Panel C (Main)**: Workspace with "Today Dashboard" and "Chat-style" thread views.

## 3. Stability Features
-   **Strict Startup**: The server strictly validates `GOOGLE_CLIENT_ID`, `OPENROUTER_API_KEY`, etc. on boot.
-   **Token Resurrection**: If an API call fails with 401, the system automatically attempts to refresh the token and retry the request transparently.
-   **Connection Health**: The UI displays a prominent "Connection Issue" alert if any provider token is revoked permanently.

## 4. Verification Steps

### 4.1. Smoke Tests (Backend Logic)
Run the automated smoke test to verify safety rules and auto-send logic:
```bash
python tests/smoke_test.py
```
**Expected Output:**
```
Running Smoke Tests for Safe Auto-Send...
✅ PASS: Safe scheduling detected.
✅ PASS: Money keywords blocked.
✅ PASS: Secondary account blocked.
Smoke Tests Complete.
```

### 4.2. UI Verification
1.  **Open Inbox**: Go to `http://localhost:3000/inbox`.
2.  **Check Today View**: You should see the "Good Morning, Chief" dashboard with urgent counts.
3.  **Check Auto-Select**: Click "Priority" in the left sidebar.
    -   *Result*: The middle panel loads urgent emails, and the **first email is automatically selected** and displayed in the main panel.
4.  **Check Live Updates**: Send an email to yourself. Wait ~10-30s.
    -   *Result*: The badge count in the sidebar should increment automatically without refreshing.

### 4.3. Health Check
Visit the new health endpoint to see provider status:
`http://localhost:8000/health/providers`
*(Requires Authentication Header)*

## 5. Deployment Note
Ensure all critical environment variables are set in your deployment platform (Vercel/Railway). The app will now **fail to start** if they are missing, preventing silent failures.
