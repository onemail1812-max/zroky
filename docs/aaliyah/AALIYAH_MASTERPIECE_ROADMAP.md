# Aaliyah: The "Masterpiece" Roadmap
> **Objective:** Elevate Aaliyah from "Verified Prototype" to "World-Class Production System".
> **Principal Engineer:** Antigravity
> **Status:** ✅ COMPLETED

This document consolidates all remaining engineering tasks required to achieve a production-grade, highly resilient, and "magical" experience. We will tackle these sequentially.

---

## 1. 🧠 Intelligence Depth (The "Magic")
*Currently, Aaliyah is smart but can be deeper.*

### 1.1 Deep Meeting Prep (Prioritized)
**Gap:** The `MeetingPrepAgent` currently only looks at the calendar event description.
**Masterpiece Requirement:** It must search **email history** for the participants to find context (e.g., "Last email from Steve mentioned the Q3 budget").
**Tasks:**
- [x] Upgrade `MeetingPrepAgent` to query `TriagedEmail` by participant email.
- [x] Inject recent email context into the Brain prompt for the briefing.
- [x] Add "relevant_links" extraction to the briefing output.

### 1.2 Knowledge Graph Caching
**Gap:** The Knowledge Graph (KG) is re-querying the DB/Brain too often, or not being used efficiently.
**Masterpiece Requirement:** Instant recall of user preferences without latency.
**Tasks:**
- [x] Implement Redis caching for `KG.get_profile()` and `LabelingRules`.
- [x] Add a "warm-up" script to load active workspace rules into Redis on boot.

---

## 2. 🛡️ Security & Hardening (The "Fortress")
*Currently, we have dev bypasses enabled.*

### 2.1 Strict Authentication Enforcement
**Gap:** `get_current_user` allows a "demo" bypass if `DEBUG=True`.
**Masterpiece Requirement:** Production must NEVER allow bypass, even if misconfigured.
**Tasks:**
- [x] Refactor `security.py` to strictly demand `CLERK_JWKS_URL` in production.
- [x] Add a startup check that fails if `SECRET_KEY` is weak or default.

### 2.2 Secret Management
**Gap:** `OAUTH_ENCRYPTION_KEY` is passed as an env var.
**Masterpiece Requirement:** Ensure we have a rotation strategy or at least a verification that existing encrypted tokens can be decrypted before startup proceeds.
**Tasks:**
- [x] Add a `check_encryption_keys` startup routine.

---

## 3. ⚡ performance & Scale (The "Speed")
*Currently, we rely on SQLite for local dev, but Postgres logic needs verification.*

### 3.1 Async Database Optimization
**Gap:** Some DB calls in the Orchestrator loop might still be synchronous or blocking.
**Masterpiece Requirement:** Non-blocking event loop.
**Tasks:**
- [x] Audit `orchestrator.py` for any blocking I/O calls inside `async def`.
- [x] Ensure `ActionExecutor` sends emails safely in the background.

---

## 4. 🚀 Infrastructure (The "Launchpad")
*Currently, we run on localhost.*

### 4.1 Production Docker Config
**Gap:** `Dockerfile` is minimal.
**Masterpiece Requirement:** Multi-stage build for smaller image size, Gunicorn production server instead of Uvicorn (or Uvicorn workers managed by Gunicorn).
**Tasks:**
- [x] Optimize `Dockerfile` for production size.
- [x] Add `gunicorn` for worker management.

---

## Execution Plan
I propose we execute in this order (High Impact -> High Stability):
1.  **Deep Meeting Prep** (Immediate "Wow" factor).
2.  **Redis Caching** (Performance).
3.  **Strict Auth** (Security).
4.  **Docker Optimization** (Deployment).
