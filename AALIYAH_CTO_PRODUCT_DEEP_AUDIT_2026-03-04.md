# Aaliyah CTO + Product Deep Audit
Date: 2026-03-04  
Auditor role: CTO + Head of Product perspective  
Repo: `D:\Zroky`

## 1) Executive Verdict
Current state is **not production-ready**.

High-level verdict:
- Backend core workflow is partially functional.
- Auto-chat (the new automatic conversation layer) is **not connected and not runnable**.
- Frontend builds, but quality gates are failing (lint + test pipeline mismatch).
- Multi-worker and cloud deployment architecture has critical consistency risks.
- GCP readiness cannot be considered complete from current repository evidence.

Readiness score (10 = production ready):
- Core backend API: 6/10
- Auto-chat feature: 1/10
- Frontend reliability: 4/10
- CI/CD quality gates: 4/10
- Cloud/GCP production readiness: 3/10
- Overall: **3.8/10**

## 2) Scope And Method
Repository coverage:
- Git-tracked files inspected at repo level: **787**
- Top code areas reviewed deeply: `apps/api`, `apps/web`, `packages/connectors`, CI workflow, Docker/deployment files.

Validation commands executed:
- Backend tests:
  - `python -m pytest -q tests` -> **116 passed, 1 failed, 1 error, 2 skipped**
  - `python -m pytest -q` -> **115 passed, 4 failed, 1 error, 2 skipped** (extra non-test scripts are collected as tests)
- Frontend:
  - `npm run lint` -> **388 problems (94 errors, 294 warnings)**
  - `npm run test` -> **7 failed suites, 2 passed suites, 11 tests passed**
  - `npm run build` -> **build succeeds**
- Security scan:
  - `python scripts/secret_scan.py` -> **failed** due detected `sk-or-` key in local `.env`

## 3) Current Workflow (As-Is)
### 3.1 Onboarding + Health
- Frontend checks onboarding and health, then unlocks workspace chat.
- Backend onboarding endpoints exist and persist workspace settings.

### 3.2 Sync + Triage + Draft Pipeline
- Main runtime path (working path) is:
  1. `/aaliyah/sync/*` -> queue job
  2. `local_sync.process_sync_provider` ingests emails
  3. `process_ai_triage` classifies
  4. `process_drafting` generates draft
  5. events emitted to live stream

### 3.3 Chat
- Primary chat endpoint in use: `/assist/chat` (SSE).
- Frontend hook `useAaliyahChat` streams chunks and appends messages.

### 3.4 Live Updates
- Frontend subscribes to `/aaliyah/live/stream`.
- Backend event bus is in-memory per process.

### 3.5 Draft Send
- Endpoint exists as `/aaliyah/drafts/send`, but route implementation conflict exists (duplicate registrations with one broken handler).

## 4) Target Workflow (Should-Be)
For enterprise-grade autonomous assistant, expected flow should be:
1. Unified event ingestion (webhooks/scheduler/manual) -> queue.
2. Deterministic policy + risk gate first.
3. Triage + draft + explainability artifact.
4. Auto-chat triggers from the same normalized event model.
5. Single source of truth for frontend inbox/chat state.
6. Durable pub/sub (Redis) for multi-instance SSE.
7. Action execution with explicit approval policy and reliable idempotency.
8. Cloud-native deployment with separate API, worker, scheduler roles.

## 5) Critical Findings (P0/P1)
## P0-1: Auto-chat is not wired into running app
Evidence:
- `apps/api/app/main.py` includes many routers but **not** `auto_chat` router (`app.include_router(...)` at lines 178-188).
- Runtime route check confirms: `HAS_AUTO_CHAT False`.

Impact:
- Automatic chat APIs are unreachable in production runtime.

## P0-2: Auto-chat modules are not importable
Evidence:
- `apps/api/app/routers/auto_chat.py:13` imports missing module `app.core.rate_limiter`.
- `apps/api/app/agents/aaliyah/core/auto_chat_service.py:25` imports `TriageService`, but `triage_service.py` has only `TriageResult` + `SmartTriageClassifier`.

Observed import failures:
- `app.routers.auto_chat` -> `ModuleNotFoundError: app.core.rate_limiter`
- `auto_chat_service` / `auto_chat_worker` -> `ImportError: cannot import name 'TriageService'`

Impact:
- Feature cannot be deployed even if router is added.

## P0-3: Auto-chat logic uses nonexistent model fields
Evidence:
- `auto_chat_service.py` uses `email.body`, `TriagedEmail.status`, `event.summary`, `event.attendees`.
- `auto_chat_worker.py` uses `CalendarEventSnapshot.start_time/end_time`.
- Actual models:
  - `triaged_email.py` has no `body` and no `status` field.
  - `calendar_event_snapshot.py` has `start_at/end_at`, not `start_time/end_time`.

Impact:
- Runtime errors guaranteed if these code paths execute.

## P0-4: Duplicate API routes for same endpoint, first one is broken
Evidence:
- `routes.py` has two `POST /drafts/send` handlers (`line 829` and `line 1749`).
- App route listing shows both are registered; first is `send_draft_action`.
- In first handler:
  - `await get_valid_token(...)` at `line 887`, but `get_valid_token` is sync (`token_store.py:16`).
  - `await orchestrator.get_stats(db)` at `line 915`, but `get_stats` is sync.

Impact:
- `/aaliyah/drafts/send` can fail with type errors and may never reach the safer second handler.

## P0-5: Queue API passes wrong job type object
Evidence:
- `routes.py` lines `1235, 1315, 1395, 1416` call:
  - `queue.enqueue(JobType.SYNC_PROVIDER, ...)`
- Queue expects string `job_type` (`queue.py:38`) and worker handlers map by `.value` strings.

Impact:
- Jobs can be enqueued with wrong type representation and skipped by worker handlers.
- Sync reliability risk is high.

## P0-6: Default DB path breaks non-container runs and tests
Evidence:
- `config.py:36` default `DATABASE_URL = sqlite:////app/zroky.db`.
- Multiple test failures show `sqlite3.OperationalError: unable to open database file` at `D:\app\zroky.db`.

Impact:
- Local/dev/test runs fail unless env override is provided.
- Contributes directly to failing tests.

## P1-1: In-memory event/state architecture is not safe for multi-worker/cloud
Evidence:
- Orchestrator uses process-local `_state` dictionary (`orchestrator.py:58`).
- Live bus is process-local in-memory (`live_feed.py`).
- API runs with `gunicorn --workers 4` (`entrypoint.sh:27`).
- Lifespan starts worker loop + scheduler inside app process (`main.py:73-74`).

Impact:
- Different workers have different state and event streams.
- SSE subscribers connected to one worker miss events generated in another worker.
- In cloud horizontal scaling, this becomes worse.

## P1-2: Webhooks code does not match Integration model
Evidence:
- `app/api/webhooks.py` uses `Integration.username` and `Integration.metadata_json.contains(...)`.
- `models/integration.py` has neither `username` nor `metadata_json`.

Impact:
- Webhook-driven sync is broken or partial at runtime.

## P1-3: Frontend quality gates are failing at large scale
Evidence:
- `npm run lint`: 94 errors, 294 warnings.
- Many `any` types, hook dependency issues, JSX issues, unescaped entities.
- `npm run test` fails because Playwright specs are being collected by Vitest (no include/exclude in `vitest.config.ts`).

Impact:
- Delivery confidence is low.
- Regression risk is high.

## P1-4: Production frontend suppresses all console logs/errors
Evidence:
- `apps/web/src/app/layout.tsx:34-36` overrides `console.log/warn/error` to no-op in production.

Impact:
- Incident debugging in production becomes harder.

## 6) Important Secondary Findings
### 6.1 CI configuration mismatch
Evidence:
- CI runs `unittest` (`.github/workflows/aaliyah-ci.yml:33`) while project uses pytest in reality.
- CI env uses `OAUTH_ENCRYPTION_KEY` length 32 hex chars (`line 20`) while runtime validator expects at least 64 chars (`config.py:148`).

Impact:
- CI may pass/fail for wrong reasons and not reflect production behavior.

### 6.2 Frontend has dual data paths
Evidence:
- Modern path uses `aaliyahApi` and `/aaliyah/*`.
- Legacy `inboxService` uses `/api/v1/inbox/*`, separate typing and auth logic.
- `store.ts` uses `getThreads` from `/aaliyah/threads`; many UI components still use `inboxService`.

Impact:
- Inconsistent behavior, duplicate bugs, harder debugging.

### 6.3 Dead/unsupported client methods
Evidence:
- `inbox.service.ts` defines `getSummary()` hitting `/api/v1/inbox/{id}/summary`.
- No corresponding summary route in `app/api/routes/inbox.py`.

Impact:
- Feature appears available in client but is not backed by API.

### 6.4 Security/observability smells
Evidence:
- `security.py` contains raw `print(...)` debug traces for Clerk token verification.
- `database.py` has risky monkey patch for PG numeric OID behavior.
- Secret scan catches local active OpenRouter key.

Impact:
- Operational hygiene and debuggability concerns.

## 7) Backend Connectivity Verdict
Question: "automatic chat + automatic work backend perfectly connected?"

Answer:
- Existing triage/draft automation pipeline: **partially connected**.
- New auto-chat feature: **not connected, not runnable**.
- Draft send endpoint path: **conflicted and currently risky** due duplicate handlers and await misuse.

## 8) Frontend Connectivity Verdict
Question: "frontend sab kuch perfectly kaam kar raha hai?"

Answer:
- UI and production build compile, and core chat UI works in principle.
- Not perfect:
  - Lint state is far from clean.
  - Test command setup is broken (Vitest collecting Playwright specs).
  - Dual API service strategy introduces inconsistency.

## 9) GCP/Cloud Readiness Verdict
Question: "GCP mein code push hai? sab GCP according perfect?"

What is verifiable from repo:
- Git remote points to GitHub only.
- No Cloud Build config (`cloudbuild.yaml`), no Terraform/IaC, no Cloud Run deploy manifests in tracked repo.
- Docker configs exist, but cloud-native deployment split (api/worker/scheduler) is not implemented cleanly.
- In-memory event bus and process-local state make horizontal scaling unsafe.

Verdict:
- **Cannot confirm GCP deployment status from repository artifacts.**
- **Current codebase is not cloud-production-safe yet for multi-instance assistant workflows.**

## 10) What Is Good Right Now
- Strong conceptual architecture around policy/risk gate (`runtime_gate.py`, `policy_engine.py`).
- Rich functionality surface (sync, triage, drafting, approvals, live stream).
- Large backend test base with high pass count (116 passed in `tests/` run).
- Frontend build succeeds with modern Next.js + Clerk + query architecture.

## 11) 14-Day Recovery Plan (Pragmatic)
## Day 0-2 (Stop the bleeding)
1. Remove duplicate `/aaliyah/drafts/send` and keep one implementation.
2. Fix all `await` on sync functions in route handlers.
3. Change queue calls to `.value` job types.
4. Set sane local default DB URL (e.g. `sqlite:///./zroky.db`).
5. Exclude Playwright specs from Vitest config.
6. Update CI to pytest and environment keys compatible with validator.

## Day 3-6 (Auto-chat stabilization)
1. Fix auto-chat imports and model contracts (`TriageService` usage, field mappings).
2. Align TriagedEmail and CalendarEventSnapshot access patterns.
3. Register auto-chat router only after import/runtime tests pass.
4. Add contract tests for every auto-chat trigger and worker check.

## Day 7-10 (Cloud reliability)
1. Replace in-memory event bus with Redis pub/sub.
2. Move scheduler to dedicated worker process (not API lifespan).
3. Keep API stateless; use durable state stores only.
4. Add idempotency and dead-letter metrics dashboards.

## Day 11-14 (Product hardening)
1. Unify frontend data layer (deprecate one of `inboxService` or `aaliyahApi` paths).
2. Eliminate high-risk lint/type errors in core user journeys.
3. Add end-to-end smoke suite for onboarding -> sync -> triage -> draft -> send.
4. Add release gate requiring:
   - backend tests green
   - frontend lint clean enough threshold
   - e2e smoke pass
   - secret scan pass

## 12) Direct Answers (Short)
- Workflow kaisa hona chahiye: event-driven, policy-first, unified auto-chat triggers, durable pub/sub, stateless API.
- Abhi kaisa hai: mixed state, partially working automation, broken auto-chat path, duplicate endpoints.
- Kya galat hai: route duplication, wrong async usage, schema mismatches, job type mismatch, test/lint pipeline gaps.
- Backend perfectly connected? **No**
- Frontend perfectly working? **No**
- GCP perfectly ready? **No**

---
If needed, next step can be a concrete patch set (P0 fixes only) so the system reaches a reliable baseline before feature expansion.
