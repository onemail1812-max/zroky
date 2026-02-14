# Aaliyah Connectors - Setup Guide

## Quick Start

### 1. OAuth Redirect URIs Setup

Before the OAuth flow works, you need to add redirect URIs to your OAuth configurations:

#### Google Cloud Console
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Credentials**
3. Click on your OAuth 2.0 Client ID
4. Under **Authorized redirect URIs**, add:
   - `http://localhost:3000/oauth/callback` (development)
   - `http://localhost:3001/api/v1/connectors/oauth/google/callback` (connector API)

#### Azure Portal
1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to **Azure Active Directory** → **App registrations** → **ZROKY AI**
3. Click **Authentication** in the sidebar
4. Under **Redirect URIs**, add:
   - `http://localhost:3000/oauth/callback` (development)
   - `http://localhost:3001/api/v1/connectors/oauth/microsoft/callback` (connector API)
5. Click **Save**

### 2. Infrastructure Setup

Since Docker is not available, use cloud services:

#### PostgreSQL (Supabase - Free)
1. Go to [Supabase](https://supabase.com/) and create a free project
2. Go to **Project Settings** → **Database**
3. Copy the **Connection string (URI)**
4. Update `.env`:
   ```
   DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"
   ```

#### Redis (Upstash - Free)
1. Go to [Upstash](https://upstash.com/) and create a free Redis database
2. Copy the **Redis URL** from the database details
3. Update `.env`:
   ```
   REDIS_URL="rediss://default:[YOUR-PASSWORD]@[YOUR-ENDPOINT].upstash.io:6379"
   ```

### 3. Run Migrations

```bash
cd packages/connectors
npm run db:migrate
```

### 4. Start the Server

```bash
npm run dev
```

### 5. Test the Health Endpoint

```bash
curl http://localhost:3001/health
```

## OAuth Credentials Summary

### Google
- **Client ID**: `592661553992-ski8fv40824emc43hudmvkj4g93jt1dv.apps.googleusercontent.com`
- **Scopes**: Gmail API, Google Calendar API

### Microsoft Azure
- **Tenant ID**: `4f255767-608c-42a0-a64d-ed35943339c2`
- **Client ID**: `3332b7be-5c58-4802-80f5-94562473818e`
- **Scopes**: Mail.Read, Mail.ReadWrite, Mail.Send, Calendars.Read, Calendars.ReadWrite

## Troubleshooting

### OAuth Error: "redirect_uri_mismatch"
The redirect URI in your request doesn't match the ones configured in Google/Azure. Make sure to add the exact URIs listed above.

### Database Connection Failed
Check that your PostgreSQL connection string is correct and the database is accessible from your network.

### Redis Connection Error
Ensure Redis is running or your Upstash credentials are correct.
