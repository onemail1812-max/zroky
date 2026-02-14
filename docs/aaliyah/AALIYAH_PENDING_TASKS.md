# Aaliyah Architecture Gap Analysis & Pending Tasks
> **Status:** UI is "Masterpiece" Ready. Backend Core is "Alive" & Verified.
> **Priority:** Action & Autonomy Complete. Moving to Production Readiness.

---

## ✅ Completed & Verified

### 1. Dual-State Memory (Sprint 1)
*   Hot/Cold State, Knowledge Graph, Unified Facade.

### 2. The All-Seeing Eye (Sprint 2a)
*   Universal Inbox, Calendar Watcher, Smart Labeling, Transparency.

### 3. Drafting Agent (Sprint 2a)
*   **Drafting Service:** Autonomously generates drafts.
*   **Safety:** Verification via `qa_trigger_draft.py`.

### 4. Interactive Actions (Sprint 2b)
*   **Sending:** `EmailConnector` & `ActionExecutor` support sending.
*   **Frontend:** `Send`, `Edit`, `Discard` buttons implemented.
*   **Briefings:** `MeetingPrepAgent` analyzes conflicts and generates briefings.
*   **UI:** Conflict cards show "Aaliyah Recommendation".
*   **Verification:** `qa_trigger_conflict_briefing.py` passed.

---

## ⏩ Sprint 3: Production Hardening (Next)
The core autonomous loop is complete. Now we must make it robust.

### 1. Robustness & Error Handling
*   [x] **Rate Limiting:** Implemented `SafeRequester` with exponential backoff on 429s.
*   [x] **Retries:** Added automatic retries for token refresh and Gmail/Outlook ops.
*   [x] **Token Refresh:** Hardened `IntegrationTokenManager` with retry logic.

### 2. User Controls
*   [x] **Preferences (Backend):** Added `settings_json` to Workspace and "Auto-Send" logic.
*   [x] **Preferences (API/UI):** API to update workspace settings.
*   [x] **Auto-Send Toggle:** Added `GeneralSettings` UI for controlling autonomy.
*   [x] **Templates:** Added `DraftTemplate` model, API, and `TemplateSettings` UI. Integrated into Drafting Agent.

### 3. Observability
*   [x] **Action Log:** Dashboard (timeline) to review autonomous emails & labels.
*   [x] **Audit Trail:** Implemented via `list_autonomous_actions` API.

---

## ⏩ Sprint 4: Testing & Optimization (Current)

### 1. Robustness Testing
*   [x] **SafeRequester:** Unit tests for retries, backoff, and timeouts.
*   [x] **Drafting Agent:** Verify template injection and prompt construction (`tests/test_scheduling_draft.py` passed).
*   [x] **Orchestrator:** Test full auto-send flow with mocks (`qa_full_autonomy_loop.py` passed).
*   [x] **Brain Facade:** Verified Orchestrator and Brain startup (`tests/verify_aaliyah_brain.py` passed).

### 2. Performance & Scale
*   [x] **Database Indexing:** Optimize `TriagedEmail` and `AuditLog` queries (Indices added).
*   [x] **Parallelism:** Ensure async `gather` for multi-provider syncs (Implemented in `aaliyah_v2.py`).
*   [ ] **Caching:** Cache heavy labeling rules or knowledge graph lookups.

---

## 📅 Sprint 5: The "Time Lord" (COMPLETED)
**Goal:** Aaliyah governs time. She negotiates meetings and briefs you proactively.

### 1. Smart Scheduling System
*   [x] **Availability Logic:** `find_free_slots(start, end)` tool for the Brain (Implemented `AvailabilityEngine`).
*   [x] **Negotiation Skill:** `DraftingAgent` can inject "I'm free at X, Y, Z" into emails dynamically (`test_scheduling_draft.py` passed).
*   [x] **Booking Links:** Generate ephemeral booking pages (Frontend & Backend Done).

### 2. Proactivity
*   [x] **Morning Briefing:** A proactive 7:00 AM digest ("3 urgent emails, 2 conflicts") (Implemented `MorningBriefingService`).
*   [x] **Meeting Prep:** 15-min pre-meeting cheat sheets (`Implemented list_upcoming_meetings` and frontend overview).

---

## 📅 Sprint 6: The "Voice" (On Hold)
**Goal:** Talk to Aaliyah naturally. (Skipped for now)

## 📅 Sprint 7: "Production Launch"
**Goal:** Deploy Aaliyah v1.0 to the public.

### 1. Infrastructure
*   [x] **Dockerize:** Create `Dockerfile` for API and Web (API and Web done. Added `docker-compose.yml`).
*   [x] **Railway/Vercel:** Deploy to production (Guide created: `.agent/workflows/deploy_aaliyah.md`).
*   [ ] **Domain:** Setup `aaliyah.zroky.com`.

### 2. Security & Access
*   [ ] **Clerk Auth:** Enforce strict auth on all endpoints (On Hold).
*   [ ] **Encryption:** Ensure OAuth tokens are encrypted at rest (Verified).

### 3. Polish
*   [x] **Onboarding Flow:** "Welcome to Aaliyah" wizard (Added Persona settings).
*   [x] **Landing Page:** Marketing page for the product (Implemented at `/`).
