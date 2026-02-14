# Zroky - Aaliyah Chatworkspace

Enterprise-first executive assistant workspace with:
- Secure multi-tenant API (`apps/api`)
- Responsive Next.js UI (`apps/web`)
- Deterministic policy/risk gate before LLM actions
- Audit-first reversible execution model

## Quick Start
1. API
   - `cd apps/api`
   - Configure `.env` from `.env.example`
   - `python -m unittest discover -s tests -p 'test_*.py'`
2. Web
   - `cd apps/web`
   - `npm install`
   - `npm run dev`

## Build Validation
- API tests:
  - `cd apps/api`
  - `python -m unittest discover -s tests -p 'test_*.py'`
- Web quality:
  - `cd apps/web`
  - `npm run lint`
  - `npm run build`

## Delivery Notes
See `AALIYAH_MASTERPIECE_DELIVERY.md` for architecture decisions, security controls, CI/CD, and DoD checklist.
