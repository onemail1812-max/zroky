# Implementation Plan: Sprint 6 - Stability & Production Readiness

## 1. Goal
Ensure the system is stable, reliable, and production-ready by implementing strict validation, safe token handling, rate limiting, and comprehensive health checks.

## 2. Backend Architecture (`apps/api`)

### 2.1. Strict Environment Validation
- **Logic**: In `app/main.py` startup event, validate all CRITICAL env vars.
- **Critical Vars**: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `OPENROUTER_API_KEY`, `DATABASE_URL`.
- **Action**: If missing, `sys.exit(1)` with a loud error message.

### 2.2. Reliability & Token Refresh
- **Token Management**:
  - Implement `refresh_access_token(integration)` in `app/services/integrations/auth.py`.
  - Update `sync_all_inboxes` and `SenderService` to catch `401 Unauthorized`.
  - On 401: Attempt refresh -> Retry.
  - If refresh fails: Mark integration status as `NEEDS_RECONNECT`.

### 2.3. Rate Limiting
- **Tool**: `slowapi` (FastAPI wrapper for Limit).
- **Scope**: Per Workspace ID (header `x-workspace-id`) or IP.
- **Limits**:
  - `/api/v1/inbox/sync`: 5/minute (prevent spamming provider APIs).
  - General API: 100/minute.

### 2.4. Health Endpoints
- **Update**: `/health` (Basic ping).
- **New**: `/health/providers`.
  - Checks connectivity to Google/Microsoft APIs using stored tokens (for the current context workspace).
  - Returns: `{ "google": "ok", "microsoft": "revoked" }`.

## 3. Frontend Implementation (`apps/web`)

### 3.1. Connection Status
- **Component**: `SettingsPage` or `InboxHeader`.
- **UI**: Show "Connected" (Green) or "Reconnect Needed" (Red) badge.
- **Action**: "Reconnect" button redirects to OAuth flow.

## 4. Testing Strategy

### 4.1. Unit Tests (`tests/unit`)
- `test_safety.py`:
  - Verify "money" keyword blocks auto-send.
  - Verify "scheduling" keyword allows auto-send.
  - Verify `is_primary=False` blocks auto-send.

### 4.2. Smoke Test Script (`tests/smoke_test.py`)
- Mocked inputs -> Service calls -> Assert outputs.
- Verify entire flow without hitting external APIs (using mocks).

## 5. Execution Steps
1.  **Backend**: Add specific startup validation in `main.py`.
2.  **Backend**: Implement `refresh_token` logic and error handling in `ingest.py` & `sender.py`.
3.  **Backend**: Add `slowapi` and decorators to routes.
4.  **Backend**: create `/health/providers` endpoint.
5.  **Frontend**: Update UI to reflect integration status.
6.  **Tests**: Write and run `test_safety_logic.py`.

## 6. Deliverables
- `implementation_plan.md` (This file)
- `walkthrough_sprint6.md` (Test results)
