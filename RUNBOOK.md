# ZROKY AALIYAH V1 Development Runbook

## 1. Prerequisites
- **Python 3.10+** (Backend)
- **Node.js 18+** / **npm 9+** (Frontend)
- **Git**
- **Google Chrome** (for testing UI)

## 2. Environment Setup

### 2.1 Backend (Python / FastAPI)
1.  **Navigate**: `cd apps/api`
2.  **Env**: Create `.env` from `.env.example`:
    ```bash
    cp .env.example .env
    ```
    **Critical Keys**:
    - `OPENROUTER_API_KEY`: Required for Aaliyah's brain.
    - `OAUTH_ENCRYPTION_KEY`: Must be a 32-byte hex string (e.g. `00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff`).
    - `SECRET_KEY`: Random string for JWT signing.
    - `GOOGLE_...`, `MICROSOFT_...`: OAuth credentials (can be mocked for local unit tests).

3.  **Install**:
    ```bash
    python -m venv .venv
    .\.venv\Scripts\Activate  # Windows
    # source .venv/bin/activate  # Mac/Linux
    pip install -r requirements.txt
    ```

### 2.2 Frontend (Next.js)
1.  **Navigate**: `cd apps/web`
2.  **Env**: Create `.env` from `.env.example`:
    ```bash
    cp .env.example .env
    ```
    **Defaults**:
    - `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000`

3.  **Install**:
    ```bash
    npm install
    ```

## 3. Running Locally

### 3.1 Backend
```bash
# In apps/api
.\.venv\Scripts\Activate
# Ensure python path includes current directory
$env:PYTHONPATH="."
python -m app.main
```
Server runs at: `http://localhost:8000`
Docs at: `http://localhost:8000/docs`

### 3.2 Frontend
```bash
# In apps/web
npm run dev
```
App runs at: `http://localhost:3000`
(Or `3001`/`3002` if port conflicted—check terminal output)

## 4. Testing

### 4.1 Backend Tests
We use `pytest`.
```bash
# In apps/api
.\.venv\Scripts\Activate
pytest
```

### 4.2 Manual Health Check
1.  Frontend: Visit `http://localhost:3000`
2.  Backend Health: `curl http://localhost:8000/health` -> `{"status": "ok"}`

## 5. Troubleshooting
- **OAuth fails**: Ensure `REDIRECT_URI` in `.env` matches what you registered in Google/Microsoft console EXACTLY.
- **OpenRouter 401**: Check `OPENROUTER_API_KEY`.
- **Database Locked**: If using SQLite, ensure no other process (like a DB browser) has the file open in write mode.

