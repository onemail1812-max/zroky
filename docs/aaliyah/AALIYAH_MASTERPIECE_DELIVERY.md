# Aaliyah Chatworkspace - Sprint 1.1 Delivery

## Assumptions
- Scope implemented as a production-grade Sprint 1.1 vertical slice: Brain infrastructure + ingestion + orchestrator + secure API + live stream + responsive workspace integration.
- OAuth providers are optional at runtime and controlled by feature flags in `apps/api/app/config.py`.
- Authentication is token-based (`Authorization: Bearer ...`) with workspace membership enforcement.

## Architecture Decisions (ADR)
1. Unified Brain gateway with strict contracts:
   - `apps/api/app/services/brain/core.py`
   - Guardrails, retry policy, redacted telemetry, typed failure paths.
2. Provider isolation:
   - `apps/api/app/services/brain/providers/openrouter.py`
   - Adapter pattern with explicit timeout/max token controls and safe provider error handling.
3. Deterministic governance before LLM:
   - `apps/api/app/services/aaliyah/runtime_gate.py`
   - Risk + policy + autonomy ladder are evaluated before generation.
4. Multi-tenant default-deny routing:
   - `apps/api/app/routers/aaliyah_v2.py`
   - Workspace mismatch blocked, rate limiting + idempotency enforced.
5. Immutable action traceability:
   - `apps/api/app/services/aaliyah/action_executor.py`
   - `apps/api/app/services/aaliyah/undo_service.py`
   - Audit-first write pattern with undo payloads.
6. Hot/cold memory starter:
   - `apps/api/app/services/brain/vector_store.py`
   - `apps/api/app/models/memory_entry.py`
   - Workspace-scoped persisted memory with similarity search.
7. Live execution transparency:
   - `apps/api/app/services/aaliyah/live_feed.py`
   - SSE event stream (`/aaliyah/live`) for real-time activity feed.

## File Structure (Key Additions)
- API:
  - `apps/api/app/services/brain/errors.py`
  - `apps/api/app/services/brain/guardrails.py`
  - `apps/api/app/services/brain/vector_store.py`
  - `apps/api/app/services/aaliyah/orchestrator.py`
  - `apps/api/app/services/aaliyah/live_feed.py`
  - `apps/api/app/services/aaliyah/request_controls.py`
  - `apps/api/app/services/aaliyah/action_executor.py`
  - `apps/api/app/services/aaliyah/undo_service.py`
  - `apps/api/app/models/aaliyah_settings_v2.py`
  - `apps/api/app/models/memory_entry.py`
  - `apps/api/app/routers/aaliyah_v2.py`
  - `apps/api/app/main.py` (global safe error model)
- Web:
  - `apps/web/src/lib/aaliyah/api.ts`
  - `apps/web/src/lib/aaliyah/store.ts`
  - `apps/web/src/components/aaliyah/workspace/NotificationStream.tsx`
  - `apps/web/src/components/aaliyah/workspace/OperationalSidebar.tsx`
  - `apps/web/src/components/shell/GlobalRail.tsx`
- CI:
  - `.github/workflows/aaliyah-ci.yml`

## API Design and Error Model
- Transport:
  - JSON for request/response, SSE for live updates.
- Standard error envelope:
  - `{ "error": { "code": "<machine_code>", "message": "<safe_message>", ... } }`
- Key endpoints:
  - `GET /aaliyah/status`
  - `GET /aaliyah/stats`
  - `GET /aaliyah/live/token`
  - `POST /aaliyah/ask`
  - `POST /aaliyah/webhook`
  - `GET /aaliyah/live?stream_token=<jwt>` (SSE)
- Controls:
  - Rate limiting: chat/webhook endpoint buckets.
  - Idempotency: `Idempotency-Key` request header support.
  - Tenant isolation: workspace validation on every route.

## Security Notes
- No secrets are embedded in source code.
- Logging redaction:
  - Tokens, auth headers, secrets, and emails are redacted before persistence.
  - Implemented in `apps/api/app/logging.py` and guardrail helpers.
- OWASP-oriented protections:
  - API1/API5: object-level authorization and function-level checks.
  - API4: request throttling and bounded retries.
  - API8: strict input models + validation.
  - API10: safe error handling with no stack trace leakage to clients.
- Governance:
  - Shadow/review-first paths preserved by policy + runtime gate.
  - Audit trail for applied/undo actions.

## CI/CD and Environments
- CI workflow:
  - API dependency install, secret scan, backend unit tests.
  - Web lint + production build.
- Environment model:
  - Dev: local SQLite, debug tooling.
  - Staging: production-like config with real auth + connector sandbox credentials.
  - Prod: managed DB, strict secrets manager, least-privilege keys, monitoring alerts.

## Tests Added
- `apps/api/tests/test_brain_core.py`
- `apps/api/tests/test_email_ingestor.py`
- `apps/api/tests/test_request_controls.py`
- `apps/api/tests/test_orchestrator.py`
- Existing suites retained and passing.

## PR Definition of Done
- [ ] All unit tests pass (`python -m unittest discover -s tests -p 'test_*.py'`).
- [ ] Web lint/build pass (`npm run lint`, `npm run build` in `apps/web`).
- [ ] No secrets in code, logs, screenshots, or commit messages.
- [ ] Error responses use safe public messages and structured error codes.
- [ ] Tenant/workspace checks enforced for all mutable routes.
- [ ] Rate limiting and idempotency active on mutation endpoints.
- [ ] Audit events recorded for autonomous and reversible actions.
- [ ] Accessibility: keyboard navigation verified for workspace chat/send flows.
- [ ] Docs updated for architecture, env setup, and operational runbook.
