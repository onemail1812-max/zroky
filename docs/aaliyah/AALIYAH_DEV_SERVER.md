# Aaliyah Development Server Guide

## 1. Prerequisites
*   Python 3.12+ and Poetry/Pip
*   Node.js 20+ and NPM
*   OpenRouter API Key (`OPENROUTER_API_KEY`)
*   Google OAuth Client ID (`GOOGLE_CLIENT_ID`)

## 2. Running the Backend (API)
The backend runs on port **8000**.

```powershell
cd apps/api
# Ensure virtual environment is active
uvicorn app.main:app --reload --port 8000
```
*   **Swagger Docs:** `http://localhost:8000/docs`
*   **Health Check:** `http://localhost:8000/health`

## 3. Running the Frontend (Web)
The frontend proxy points to `localhost:8000`.

```powershell
cd apps/web
npm install # First time only
npm run dev
```
*   **Dashboard:** `http://localhost:3000` (or 3001 if busy)
*   **Workspace:** `http://localhost:3000/workspace`
*   **Onboarding:** `http://localhost:3000/onboarding`

## 4. Verification Check
To verify everything is working:
1.  Open the Workspace page.
2.  Send a message: "Draft a welcome email."
3.  Wait for the "Thinking..." indicator.
4.  See the draft appear.
