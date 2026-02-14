---
description: Deploy Aaliyah to Production (Railway & Vercel)
---

# Deploying Aaliyah

This guide covers deploying the Aaliyah Stack:
1. **Frontend (Web):** Next.js app on Vercel or Railway.
2. **Backend (API):** Python FastAPI on Railway.
3. **Database:** SQLite (Embedded) or Postgres (Recommended for Prod).

## 1. Backend Deployment (Railway)

We recommend Railway for the backend as it supports long-running Python processes natively.

### Prerequisites
- specific `apps/api` Dockerfile is ready.
- `railway` CLI installed or use web dashboard.
- `OPENROUTER_API_KEY` and other secrets ready.

### Steps
1. **Init Project:**
   - Go to [Railway Dashboard](https://railway.app/new).
   - Select "Deploy from GitHub repo".
   - Select this repository.

2. **Configure Service (API):**
   - Add a Service, select `Dockerfile` option if prompted, or point to `apps/api/Dockerfile`.
   - **Root Directory:** Set to `/` (since Dockerfile copies `requirements.txt` from context or adjust `apps/api` as root).
   - **Docker Context:** If deploying monorepo, you might need to set Root Directory to `.` and Dockerfile path to `apps/api/Dockerfile`.
     - *Note:* Our `docker-compose.yml` uses `./apps/api` context.
     - On Railway, set **Root Directory** = `apps/api` if `Dockerfile` expects to run from there.
     - *Correction:* `apps/api/Dockerfile` does `COPY requirements.txt .`. This implies it expects to be run from `apps/api` directory.
   - **Variables:**
     - `OPENROUTER_API_KEY`: ...
     - `SECRET_KEY`: Generate a strong key.
     - `OAUTH_ENCRYPTION_KEY`: 32-byte hex string.
     - `DATABASE_URL`: `sqlite:///zroky.db` (Note: SQLite overlaps ephemeral storage on Railway. Use Postgres service for persistence).
   - **Database (Postgres):**
     - Add a Postgres plugin in Railway.
     - Update `DATABASE_URL` to the Postgres connection string.
     - Update `apps/api/requirements.txt` to include `psycopg2-binary`.

3. **Public Domain:**
   - Generate a domain in Railway (e.g., `aaliyah-api-production.up.railway.app`).

## 2. Frontend Deployment (Vercel)

Vercel is optimized for Next.js.

### Steps
1. **Import Project:**
   - Go to Vercel Dashboard -> Add New.
   - Import Git Repository.

2. **Configure:**
   - **Framework Preset:** Next.js.
   - **Root Directory:** `apps/web`.
   - **Environment Variables:**
     - `API_URL`: Set to your Railway Backend URL (e.g., `https://aaliyah-api-production.up.railway.app`).
       - *Note:* Do NOT add trailing slash.
     - `NEXT_PUBLIC_API_URL`: Same as above (for client-side calls if needed, though we use rewrite).

3. **Deploy:**
   - Click Deploy.
   - Vercel will build and serve.

## 3. Database Migration (Postgres)
If using Postgres:
1. Connect to Railway shell.
2. Run `alembic upgrade head` (Configure alembic to use `DATABASE_URL` env var).

## 4. Verification
- Visit Vercel URL.
- Check "Inbox" -> "Sync Now".
- Check "Meeting Prep" cards.
