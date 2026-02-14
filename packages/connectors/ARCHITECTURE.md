# Aaliyah Unified Connector Platform - Architecture Document

## Executive Summary

A Nylas-equivalent unified Email + Calendar connector platform providing a single API abstraction over Gmail, Google Calendar, Microsoft Outlook Mail, and Microsoft Calendar (Graph API). Built with enterprise-grade security, multi-tenancy, and approval workflows.

---

## A) SYSTEM DESIGN

### Architecture Diagram (Text)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              AALIYAH PLATFORM                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌──────────────┐     ┌──────────────────────────────────────────────────────┐  │
│  │   Next.js    │     │              CONNECTOR SERVICE (Node.js)             │  │
│  │   Frontend   │────▶│  ┌─────────────────────────────────────────────────┐ │  │
│  │              │     │  │                  API GATEWAY                     │ │  │
│  └──────────────┘     │  │  - Auth Middleware (JWT + Tenant Context)       │ │  │
│                       │  │  - Rate Limiting (per tenant/user)              │ │  │
│                       │  │  - Correlation ID Injection                     │ │  │
│                       │  │  - Request Validation (Zod)                     │ │  │
│                       │  └─────────────────────────────────────────────────┘ │  │
│                       │                          │                            │  │
│                       │  ┌───────────────────────┴───────────────────────┐   │  │
│                       │  │                                               │   │  │
│                       │  ▼                                               ▼   │  │
│                       │  ┌─────────────────┐     ┌─────────────────────┐    │  │
│                       │  │  OAuth Service  │     │   Unified API       │    │  │
│                       │  │  - Connect Flow │     │   - /email/*        │    │  │
│                       │  │  - Token Mgmt   │     │   - /calendar/*     │    │  │
│                       │  │  - Scope Escal. │     │   - /accounts/*     │    │  │
│                       │  └────────┬────────┘     └──────────┬──────────┘    │  │
│                       │           │                         │               │  │
│                       │           ▼                         ▼               │  │
│                       │  ┌─────────────────────────────────────────────┐   │  │
│                       │  │           PROVIDER ABSTRACTION LAYER        │   │  │
│                       │  │  ┌─────────────┐  ┌─────────────────────┐   │   │  │
│                       │  │  │ EmailProvider│  │ CalendarProvider    │   │   │  │
│                       │  │  │ Interface    │  │ Interface           │   │   │  │
│                       │  │  └──────┬───────┘  └──────────┬──────────┘   │   │  │
│                       │  │         │                     │              │   │  │
│                       │  │    ┌────┴────┬────────────────┴────┐        │   │  │
│                       │  │    ▼         ▼                     ▼        │   │  │
│                       │  │ ┌────────┐ ┌────────────┐ ┌──────────────┐  │   │  │
│                       │  │ │ Google │ │ Microsoft  │ │ Future       │  │   │  │
│                       │  │ │Adapters│ │ Graph      │ │ Providers    │  │   │  │
│                       │  │ │        │ │ Adapters   │ │              │  │   │  │
│                       │  │ └────────┘ └────────────┘ └──────────────┘  │   │  │
│                       │  └─────────────────────────────────────────────┘   │  │
│                       │                          │                          │  │
│                       │  ┌───────────────────────┴───────────────────────┐  │  │
│                       │  │              APPROVAL ENGINE                   │  │  │
│                       │  │  - Pending Queue                              │  │  │
│                       │  │  - Policy Evaluation                          │  │  │
│                       │  │  - Expiry Management                          │  │  │
│                       │  └───────────────────────────────────────────────┘  │  │
│                       └──────────────────────────────────────────────────────┘  │
│                                              │                                   │
│  ┌───────────────────────────────────────────┼───────────────────────────────┐  │
│  │                          DATA LAYER       │                                │  │
│  │  ┌────────────────┐  ┌────────────────┐  │  ┌────────────────────────┐   │  │
│  │  │   PostgreSQL   │  │     Redis      │◀─┘  │   Encryption Service   │   │  │
│  │  │  - Accounts    │  │  - BullMQ Jobs │     │   (Envelope Encrypt)   │   │  │
│  │  │  - Tokens      │  │  - Rate Limits │     │   - Token Encryption   │   │  │
│  │  │  - Sync State  │  │  - Cache       │     │   - Key Rotation       │   │  │
│  │  │  - Approvals   │  │                │     └────────────────────────┘   │  │
│  │  │  - Audit Log   │  └────────────────┘                                  │  │
│  │  └────────────────┘                                                       │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │                         SYNC ENGINE (Workers)                              │  │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐   │  │
│  │  │ Webhook Handler │  │  Delta Sync     │  │  Polling Fallback       │   │  │
│  │  │ - /webhooks/*   │  │  Worker         │  │  Worker (cron)          │   │  │
│  │  │ - Validation    │──▶│  - Gmail History│  │  - For failed webhooks  │   │  │
│  │  │ - Idempotency   │  │  - Graph Delta  │  │  - Stale account check  │   │  │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────────────┘   │  │
│  │           │                    │                      │                   │  │
│  │           └────────────────────┼──────────────────────┘                   │  │
│  │                                ▼                                          │  │
│  │                    ┌─────────────────────┐                               │  │
│  │                    │    Event Emitter    │                               │  │
│  │                    │  - email.received   │                               │  │
│  │                    │  - calendar.updated │                               │  │
│  │                    └─────────────────────┘                               │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘


                    EXTERNAL SERVICES
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                  │
│   ┌────────────────────────┐          ┌────────────────────────────────────┐   │
│   │      Google APIs       │          │         Microsoft Graph API         │   │
│   │  - Gmail API           │          │  - Outlook Mail API                 │   │
│   │  - Calendar API        │          │  - Calendar API                     │   │
│   │  - Pub/Sub (Webhooks)  │          │  - Subscriptions (Webhooks)         │   │
│   └────────────────────────┘          └────────────────────────────────────┘   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Threat Model: Top 10 Risks + Mitigations

| # | Risk | Impact | Likelihood | Mitigation |
|---|------|--------|------------|------------|
| 1 | **Cross-Tenant Data Access** | Critical | Medium | Row-level security on all queries. Tenant context injected at middleware level, not passable from client. Every query includes `tenant_id` in WHERE clause. |
| 2 | **OAuth Token Theft** | Critical | Medium | Tokens never sent to browser. Encrypted at rest with envelope encryption. Separate key per tenant. HSM-ready key management. |
| 3 | **Unauthorized Email Send** | Critical | Low | Approval workflow mandatory. Send requires `approval_id` that maps to approved request. Approval expires in 15 min. |
| 4 | **Webhook Spoofing** | High | Medium | Validate signatures (Google Pub/Sub JWT, Microsoft clientState). Reject unsigned/invalid webhooks. |
| 5 | **Replay Attacks on Webhooks** | Medium | Medium | Idempotency keys stored in `processed_events`. Dedupe by `message_id + notification_id`. |
| 6 | **Over-Privileged Scopes** | High | Medium | Request minimal scopes initially. Scope escalation only when user enables feature. Store enabled scopes per account. |
| 7 | **Audit Log Tampering** | High | Low | Append-only table. No UPDATE/DELETE permissions. Separate DB user for writes. |
| 8 | **PII Leakage in Logs** | High | High | Redaction helper strips emails, subjects, bodies from logs. Structured logging with allow-list of fields. |
| 9 | **Token Refresh Race Conditions** | Medium | Medium | Distributed lock (Redis) during refresh. Retry on conflict. Store token with version. |
| 10 | **Rate Limit Bypass** | Medium | Medium | Per-tenant + per-user limits. Sliding window in Redis. Separate limits for auth vs API routes. |

### Data Flows

#### OAuth Connect Flow
```
1. User clicks "Connect Gmail" in frontend
2. Frontend calls POST /connect/google with return_url
3. Backend generates:
   - PKCE code_verifier + code_challenge
   - state = encrypt({tenant_id, user_id, return_url, nonce})
   - Stores state in Redis (5 min TTL)
4. Backend returns redirect URL to Google OAuth
5. User authorizes in Google
6. Google redirects to GET /oauth/callback?code=...&state=...
7. Backend:
   - Validates state from Redis
   - Exchanges code for tokens (server-side)
   - Encrypts refresh_token with envelope encryption
   - Stores in connected_accounts + oauth_tokens
   - Creates initial sync_state
   - Enqueues initial sync job
   - Redirects user to return_url with success
```

#### Sync Flow (Gmail Watch + History)
```
1. On account connect, call Gmail watch() to create Pub/Sub subscription
2. Store historyId in sync_state
3. When email arrives:
   - Google publishes to Pub/Sub
   - Pub/Sub calls POST /webhooks/google
4. Webhook handler:
   - Validates JWT signature
   - Extracts historyId from message
   - Checks idempotency key (message_id)
   - If new, enqueues sync job
5. Sync worker:
   - Fetches history.list(startHistoryId)
   - For each change, stores in local cache/emits event
   - Updates sync_state.historyId
   - Emits internal events (email.received, email.modified)
```

#### Action Execution with Approval
```
1. AI/User requests: "Send this email"
2. API receives POST /email/drafts/:id/send
3. ApprovalEngine checks policy:
   - Is send_email action in approval_required list? YES
   - Check if approval_id provided: NO
   - Return 403 with approval_required: true, create pending approval
4. Frontend shows approval UI to user
5. User clicks "Approve"
6. Frontend calls POST /approvals/:id/approve
7. Backend:
   - Validates approval not expired (15 min)
   - Marks approval as APPROVED
   - Returns approval_id
8. Frontend retries POST /email/drafts/:id/send with approval_id
9. Backend:
   - Validates approval_id matches action + not expired
   - Executes send via provider
   - Logs to audit_log
   - Returns success
```

---

## B) DATA MODEL (Prisma Schema)

```prisma
// See: packages/connectors/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================
// CONNECTED ACCOUNTS
// ============================================
model ConnectedAccount {
  id                String   @id @default(uuid())
  tenantId          String   @map("tenant_id")
  userId            String   @map("user_id")
  provider          Provider
  providerAccountId String   @map("provider_account_id")
  email             String
  displayName       String?  @map("display_name")
  status            AccountStatus @default(ACTIVE)
  enabledScopes     String[] @map("enabled_scopes") // Actual granted scopes
  requestedScopes   String[] @map("requested_scopes") // Scopes we want
  
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")
  lastSyncAt        DateTime? @map("last_sync_at")
  
  // Relations
  oauthToken        OAuthToken?
  syncState         SyncState?
  
  @@unique([tenantId, userId, provider, providerAccountId])
  @@index([tenantId])
  @@index([tenantId, userId])
  @@index([status])
  @@map("connected_accounts")
}

enum Provider {
  GOOGLE
  MICROSOFT
}

enum AccountStatus {
  ACTIVE
  DISCONNECTED
  TOKEN_EXPIRED
  REVOKED
}

// ============================================
// OAUTH TOKENS (Encrypted)
// ============================================
model OAuthToken {
  id                  String   @id @default(uuid())
  accountId           String   @unique @map("account_id")
  
  // Encrypted fields (envelope encryption)
  accessTokenEnc      String   @map("access_token_enc")
  refreshTokenEnc     String   @map("refresh_token_enc")
  
  // Encryption metadata
  keyVersion          Int      @map("key_version") @default(1)
  encryptionKeyId     String   @map("encryption_key_id") // DEK identifier
  
  accessTokenExpiresAt DateTime @map("access_token_expires_at")
  tokenType           String   @default("Bearer") @map("token_type")
  scope               String   // Space-separated scopes
  
  createdAt           DateTime @default(now()) @map("created_at")
  updatedAt           DateTime @updatedAt @map("updated_at")
  
  // Relations
  account             ConnectedAccount @relation(fields: [accountId], references: [id], onDelete: Cascade)
  
  @@index([accessTokenExpiresAt])
  @@map("oauth_tokens")
}

// ============================================
// SYNC STATE
// ============================================
model SyncState {
  id                String   @id @default(uuid())
  accountId         String   @unique @map("account_id")
  
  // Gmail specific
  gmailHistoryId    String?  @map("gmail_history_id")
  gmailWatchExpiry  DateTime? @map("gmail_watch_expiry")
  
  // Microsoft Graph specific
  mailDeltaLink     String?  @map("mail_delta_link") @db.Text
  calendarDeltaLink String?  @map("calendar_delta_link") @db.Text
  
  // Calendar sync tokens
  googleCalendarSyncToken String? @map("google_calendar_sync_token")
  
  // Subscription IDs for webhooks
  mailSubscriptionId     String? @map("mail_subscription_id")
  calendarSubscriptionId String? @map("calendar_subscription_id")
  subscriptionExpiry     DateTime? @map("subscription_expiry")
  
  // Polling fallback
  usePolling        Boolean  @default(false) @map("use_polling")
  lastPollAt        DateTime? @map("last_poll_at")
  pollErrorCount    Int      @default(0) @map("poll_error_count")
  
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")
  
  // Relations
  account           ConnectedAccount @relation(fields: [accountId], references: [id], onDelete: Cascade)
  
  @@map("sync_state")
}

// ============================================
// APPROVALS
// ============================================
model Approval {
  id                String   @id @default(uuid())
  tenantId          String   @map("tenant_id")
  userId            String   @map("user_id")
  accountId         String   @map("account_id")
  
  actionType        ActionType @map("action_type")
  status            ApprovalStatus @default(PENDING)
  
  // Action payload (what will be executed)
  actionPayload     Json     @map("action_payload")
  
  // Risk assessment
  riskLevel         RiskLevel @default(MEDIUM) @map("risk_level")
  riskReason        String?   @map("risk_reason")
  
  // Approval metadata
  requestedAt       DateTime @default(now()) @map("requested_at")
  expiresAt         DateTime @map("expires_at")
  decidedAt         DateTime? @map("decided_at")
  decidedBy         String?   @map("decided_by") // user_id who approved/rejected
  
  // Correlation
  correlationId     String   @map("correlation_id")
  
  createdAt         DateTime @default(now()) @map("created_at")
  
  @@index([tenantId, userId])
  @@index([status, expiresAt])
  @@index([correlationId])
  @@map("approvals")
}

enum ActionType {
  SEND_EMAIL
  DELETE_EMAIL
  BULK_ARCHIVE
  CREATE_EVENT
  UPDATE_EVENT
  DELETE_EVENT
  INVITE_ATTENDEES
}

enum ApprovalStatus {
  PENDING
  APPROVED
  REJECTED
  EXPIRED
  EXECUTED
}

enum RiskLevel {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

// ============================================
// AUDIT LOG (Append-Only)
// ============================================
model AuditLog {
  id                String   @id @default(uuid())
  tenantId          String   @map("tenant_id")
  userId            String   @map("user_id")
  accountId         String?  @map("account_id")
  
  action            String   // e.g., "email.send", "calendar.create", "account.connect"
  resourceType      String   @map("resource_type") // e.g., "email", "event", "account"
  resourceId        String?  @map("resource_id")
  
  // Request context
  correlationId     String   @map("correlation_id")
  ipAddress         String?  @map("ip_address")
  userAgent         String?  @map("user_agent")
  
  // Outcome
  status            AuditStatus
  errorCode         String?  @map("error_code")
  
  // Redacted metadata (no PII)
  metadata          Json?    // Redacted safe metadata
  
  // Timing
  durationMs        Int?     @map("duration_ms")
  
  createdAt         DateTime @default(now()) @map("created_at")
  
  @@index([tenantId, createdAt])
  @@index([tenantId, userId, createdAt])
  @@index([correlationId])
  @@index([action, createdAt])
  @@map("audit_log")
}

enum AuditStatus {
  SUCCESS
  FAILURE
  PENDING_APPROVAL
}

// ============================================
// PROCESSED EVENTS (Idempotency)
// ============================================
model ProcessedEvent {
  id                String   @id @default(uuid())
  
  // Idempotency key: provider + event_type + unique_id
  idempotencyKey    String   @unique @map("idempotency_key")
  
  provider          Provider
  eventType         String   @map("event_type") // e.g., "webhook", "sync"
  
  // What was processed
  accountId         String   @map("account_id")
  payload           Json?    // Safe subset of event data
  
  processedAt       DateTime @default(now()) @map("processed_at")
  
  // TTL for cleanup (events older than 7 days can be purged)
  expiresAt         DateTime @map("expires_at")
  
  @@index([accountId, eventType])
  @@index([expiresAt])
  @@map("processed_events")
}

// ============================================
// ENCRYPTION KEYS (Key Management)
// ============================================
model EncryptionKey {
  id                String   @id @default(uuid())
  tenantId          String   @map("tenant_id")
  
  version           Int
  keyEncrypted      String   @map("key_encrypted") // DEK encrypted with KEK
  algorithm         String   @default("aes-256-gcm")
  
  status            KeyStatus @default(ACTIVE)
  
  createdAt         DateTime @default(now()) @map("created_at")
  rotatedAt         DateTime? @map("rotated_at")
  expiresAt         DateTime? @map("expires_at")
  
  @@unique([tenantId, version])
  @@index([tenantId, status])
  @@map("encryption_keys")
}

enum KeyStatus {
  ACTIVE
  ROTATING
  DEPRECATED
  REVOKED
}
```

---

## C) UNIFIED PROVIDER INTERFACES

See `packages/connectors/src/interfaces/` for complete typed interfaces.

### Core Models (Provider-Agnostic)

```typescript
// Thread represents an email conversation
interface Thread {
  id: string;
  accountId: string;
  snippet: string;
  subject: string;
  participants: Participant[];
  messageCount: number;
  unreadCount: number;
  labels: string[];
  lastMessageAt: Date;
  messages?: Message[];
}

// Message represents a single email
interface Message {
  id: string;
  threadId: string;
  accountId: string;
  internetMessageId: string;
  
  from: Participant;
  to: Participant[];
  cc: Participant[];
  bcc: Participant[];
  replyTo: Participant[];
  
  subject: string;
  snippet: string;
  bodyText?: string;
  bodyHtml?: string;
  
  labels: string[];
  isRead: boolean;
  isStarred: boolean;
  isDraft: boolean;
  
  attachments: Attachment[];
  
  sentAt: Date;
  receivedAt: Date;
  
  // Provider metadata
  rawHeaders?: Record<string, string>;
}

// Calendar Event
interface CalendarEvent {
  id: string;
  accountId: string;
  calendarId: string;
  
  title: string;
  description?: string;
  location?: string;
  
  start: EventDateTime;
  end: EventDateTime;
  
  isAllDay: boolean;
  recurrence?: RecurrenceRule;
  
  organizer: Attendee;
  attendees: Attendee[];
  
  status: EventStatus;
  visibility: EventVisibility;
  
  conferenceData?: ConferenceData;
  
  reminders: Reminder[];
  
  createdAt: Date;
  updatedAt: Date;
  
  // For recurring events
  recurringEventId?: string;
  originalStartTime?: Date;
}
```

---

## D-H) IMPLEMENTATION

The complete implementation follows in the file structure below.
