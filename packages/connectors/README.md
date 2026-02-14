# Aaliyah Unified Connector Platform

Enterprise-grade unified Email + Calendar connector for AI SaaS applications.

## Overview

This package provides a single, unified API for connecting to Gmail/Google Calendar and Microsoft Outlook/Calendar. It handles OAuth authentication, token management, incremental sync, webhooks, and action approval workflows.

## Features

### Core Capabilities
- **Unified API** - Single interface for Google and Microsoft providers
- **Email Operations** - Threads, messages, drafts, labels/folders, search, send
- **Calendar Operations** - Events, calendars, availability, RSVP, conference links
- **Incremental Sync** - Gmail history API, Microsoft Graph delta queries
- **Webhooks** - Real-time notifications with idempotent processing

### Enterprise Requirements
- **Multi-tenancy** - Strict tenant isolation on every request
- **OAuth Security** - Tokens never reach browser, encrypted at rest
- **Approval Gates** - Mandatory approval for destructive actions
- **Audit Logging** - Append-only logs with PII redaction
- **Encryption** - Envelope encryption with tenant-scoped DEKs
- **Observability** - Structured logging, correlation IDs, metrics

## Quick Start

### 1. Install Dependencies

```bash
cd packages/connectors
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your credentials
```

### 3. Generate Prisma Client

```bash
npm run db:generate
```

### 4. Run Database Migrations

```bash
npm run db:migrate
```

### 5. Start Development Server

```bash
npm run dev
```

## API Endpoints

### OAuth
- `POST /api/v1/connectors/connect/google` - Start Google OAuth flow
- `POST /api/v1/connectors/connect/microsoft` - Start Microsoft OAuth flow
- `GET /oauth/callback/google` - Google OAuth callback
- `GET /oauth/callback/microsoft` - Microsoft OAuth callback

### Accounts
- `GET /api/v1/connectors/accounts` - List connected accounts
- `POST /api/v1/connectors/accounts/:id/revoke` - Revoke account

### Email
- `GET /api/v1/connectors/accounts/:id/email/threads` - List threads
- `GET /api/v1/connectors/accounts/:id/email/threads/:threadId` - Get thread
- `POST /api/v1/connectors/accounts/:id/email/drafts` - Create draft
- `POST /api/v1/connectors/accounts/:id/email/drafts/:id/send` - Send (requires approval)

### Calendar
- `GET /api/v1/connectors/accounts/:id/calendar/events` - List events
- `POST /api/v1/connectors/accounts/:id/calendar/events` - Create event
- `DELETE /api/v1/connectors/accounts/:id/calendar/events/:id` - Delete (requires approval)

### Approvals
- `GET /api/v1/connectors/approvals` - List pending approvals
- `POST /api/v1/connectors/approvals/:id/approve` - Approve action
- `POST /api/v1/connectors/approvals/:id/reject` - Reject action

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        API Gateway                               │
│  (tenant context, correlation IDs, rate limiting, auth)          │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Unified API Layer                           │
│   /email/threads, /email/drafts, /calendar/events, etc.          │
└─────────────────────────────────────────────────────────────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        ▼                        ▼                        ▼
┌──────────────┐        ┌──────────────┐        ┌──────────────┐
│   Approval   │        │    Token     │        │    Audit     │
│   Service    │        │   Service    │        │   Service    │
└──────────────┘        └──────────────┘        └──────────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        ▼                        ▼                        ▼
┌──────────────┐        ┌──────────────┐        ┌──────────────┐
│    Gmail     │        │   Google     │        │  Microsoft   │
│   Adapter    │        │  Calendar    │        │    Graph     │
│              │        │   Adapter    │        │   Adapters   │
└──────────────┘        └──────────────┘        └──────────────┘
        │                        │                        │
        ▼                        ▼                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Provider APIs                                │
│       Gmail API    |    Calendar API    |    Microsoft Graph     │
└─────────────────────────────────────────────────────────────────┘
```

## Security Model

### Token Security
- OAuth tokens encrypted at rest using AES-256-GCM
- Envelope encryption with tenant-scoped DEKs
- Master KEK stored in environment variable
- Tokens never exposed to browser

### Tenant Isolation
- Every request requires `x-tenant-id` and `x-user-id` headers
- Database queries always scoped by tenant
- Audit logs include tenant context

### Approval Workflow
High-risk actions require explicit approval:
- `SEND_EMAIL` - HIGH risk
- `DELETE_EMAIL` - CRITICAL risk
- `BULK_ARCHIVE` - HIGH risk
- `DELETE_EVENT` - HIGH risk

### PII Redaction
- Email addresses redacted in logs: `j***n@e***.com`
- Email bodies truncated: `[2048 chars]`
- Sensitive fields: `[REDACTED]`

## Development

### Project Structure

```
packages/connectors/
├── prisma/
│   └── schema.prisma         # Database schema
├── src/
│   ├── adapters/             # Provider implementations
│   │   ├── google/
│   │   │   ├── gmail.adapter.ts
│   │   │   └── calendar.adapter.ts
│   │   └── microsoft/
│   │       ├── graph-mail.adapter.ts
│   │       └── graph-calendar.adapter.ts
│   ├── interfaces/           # Provider contracts
│   │   ├── email-provider.ts
│   │   ├── calendar-provider.ts
│   │   └── webhook-provider.ts
│   ├── models/               # Unified data models
│   ├── services/             # Core services
│   │   ├── token.service.ts
│   │   ├── encryption.service.ts
│   │   ├── approval.service.ts
│   │   └── audit.service.ts
│   ├── routes/               # API endpoints
│   ├── workers/              # Background jobs
│   ├── utils/                # Utilities
│   └── server.ts             # Entry point
├── tests/
└── package.json
```

### Running Tests

```bash
npm test                # Run all tests
npm run test:coverage   # With coverage
```

### Database Management

```bash
npm run db:generate     # Generate Prisma client
npm run db:migrate      # Run migrations
npm run db:push         # Push schema (dev only)
npm run db:studio       # Open Prisma Studio
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `CONNECTORS_DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `CONNECTOR_PORT` | Server port (default: 3001) |
| `CONNECTOR_MASTER_KEY` | Master encryption key (base64) |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `MICROSOFT_CLIENT_ID` | Microsoft OAuth client ID |
| `MICROSOFT_CLIENT_SECRET` | Microsoft OAuth client secret |

## License

PROPRIETARY - All rights reserved
