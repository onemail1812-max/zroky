# AALIYAH PRODUCTION WORKFLOW TESTING GUIDE
**Version:** 1.0  
**Last Updated:** March 4, 2026  
**Purpose:** High-end testing procedures for 100% production fitness

---

## OVERVIEW

This guide contains **executable test scenarios** for validating Aaliyah's core workflows under production conditions. Each scenario includes:
- **Setup instructions**
- **Step-by-step test flow**
- **Expected outcomes (with metrics)**
- **Failure recovery procedures**
- **Pass/fail criteria**

---

## WORKFLOW 1: EMAIL INBOX ASSISTANT (Core Value)

### Test Case 1.1: New Email Detection & Triage (Happy Path)

**Objective:** Verify email ingestion, triage classification, and draft generation within SLA

**Estimated Duration:** 5-10 minutes  
**Environment:** Staging (with test Gmail account)  
**Users Needed:** 1 (test account with inbox)

#### Setup
```bash
# 1. Create test Gmail account: aaliyah-test-001@gmail.com
# 2. Grant OAuth permission to Aaliyah app
# 3. Verify workspace created in database
#    SELECT * FROM workspaces WHERE owner_email = 'aaliyah-test-001@gmail.com'

# 4. Send 5 test emails to this account from different senders
#    - From: alice@company.com (high priority)
#    - From: newsletter@news.com (low priority)
#    - From: ceo@company.com (urgent/priority)
#    - From: support@tools.com (help request)
#    - From: friend@personal.com (personal)

# 5. Wait 2 minutes for ingestor to pick up emails
```

#### Test Steps

| Step | Action | Expected Result | Metric |
|---|---|---|---|
| 1 | Open Aaliyah dashboard | Inbox page loads, email count > 0 | Page load < 2s |
| 2 | Check "Priority" folder | CEO email appears first, marked ✨ | Classification accuracy 100% |
| 3 | Click on CEO email | Aaliyah's Take + Draft appears below | Draft generation time < 3s |
| 4 | Review draft content | Draft tone matches CEO authority level | LLM quality manual review ✅ |
| 5 | Click [Edit] | Draft editor opens with pre-filled content | Editor responsiveness < 500ms |
| 6 | Modify draft briefly | Changes saved to input field | No lag in typing |
| 7 | Click [Send] | Confirmation dialog appears | UI/UX clarity ✅ |
| 8 | Confirm send | Email sent, undo window visible (20s) | Sent notification appears < 1s |
| 9 | Check audit log | Entry logged: `action=SEND_DRAFT, status=SUCCESS` | Audit trail complete ✅ |
| 10 | Wait 3 days | Follow-up job scheduled if no reply | Job scheduled in queue |

#### Expected Outcomes
```json
{
  "email_ingestion_latency": "< 120 seconds",
  "triage_classification_accuracy": "100% (high=1, low=1, normal=3)",
  "draft_generation_time": "< 3 seconds",
  "send_confirmation_time": "< 1 second",
  "undo_window_duration": "20 seconds",
  "audit_log_completeness": "5/5 entries logged"
}
```

#### Pass/Fail Criteria
```
✅ PASS if:
  - All 5 emails correctly classified
  - Draft generates < 3s
  - Send succeeds + audit logged
  - Undo window appears

🔴 FAIL if:
  - Any email misclassified
  - Draft generation > 5s or fails
  - Send returns error
  - Undo doesn't appear
```

---

### Test Case 1.2: Bulk Email Sync (Performance Under Load)

**Objective:** Verify email ingestion at scale (1000+ emails)

**Estimated Duration:** 20 minutes  
**Environment:** Staging  
**Requirements:** Gmail account with 1000+ emails

#### Setup
```bash
# 1. Export 1000 emails to Gmail account (or use existing mailbox)
# 2. Note timestamp: T0 = 12:00 PM

# 3. Trigger historical sync
curl -X POST http://staging-api:8000/aaliyah/sync/inbox \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "provider": "google",
    "max_results": 1000
  }'
```

#### Test Steps

| Step | Expected Result | Metric |
|---|---|---|
| T0+5s | Ingestion job queued | Queue depth = 1 |
| T0+15s | Workers processing emails in parallel | Queue depth = decreasing |
| T0+30s | Dashboard shows 1000 emails received | Inbox count = 1000 |
| T0+45s | All emails triaged (labeled) | Triage queue empty |
| T0+60s | UI responsive (no lag when scrolling) | Scroll FPS ≥ 60 |
| T0+120s | Drafts for all "needs reply" ready | Draft count = ~100 |
| T0+180s | Ingestion complete | Worker finished log entry |

#### Performance Targets
```yaml
Total Ingestion Time (1000 emails):
  Target: < 3 minutes
  Success: All emails triaged + drafts ready

Throughput:
  Target: 5-10 emails/second
  Calculation: 1000 emails / 180s = 5.5 emails/sec ✅

API Latency:
  p50: < 500ms
  p95: < 1000ms
  p99: < 2000ms

Memory Usage:
  Baseline: 400MB
  Peak: < 1500MB
  After cleanup: < 600MB

Database Load:
  QPS: < 200 queries/second
  Connection count: < 30 (of 50 available)
```

#### Pass/Fail Criteria
```
✅ PASS if:
  - All 1000 emails ingested < 3 min
  - Triage accuracy > 95%
  - API latency p95 < 1s
  - No database locks / deadlocks
  - Memory recovers after cleanup

🔴 FAIL if:
  - Emails dropped / missing
  - Triage accuracy < 90%
  - API latency p95 > 2s
  - Out of memory error
  - Database connection pool exhausted
```

---

## WORKFLOW 2: DRAFT GENERATION & EDITING

### Test Case 2.1: Draft Quality & Tone Matching

**Objective:** Verify draft quality and tone consistency

**Estimated Duration:** 10 minutes  
**Environment:** Staging

#### Setup
```bash
# 1. Create draft templates in database
INSERT INTO draft_templates VALUES (
  id='dt_001',
  user_id='user_001',
  tone='professional',
  style='concise'
);

# 2. Send test email to workspace
From: vendor@acme.com
Subject: Q1 Budget Review
Body: Hi, can you confirm the Q1 budget allocation for our contract?
```

#### Test Steps

| Step | Action | Validation |
|---|---|---|
| 1 | Open email draft | Should contain: greeting, context acknowledgment, action |
| 2 | Review tone | Should be professional, direct (not verbose) |
| 3 | Check for jargon | Should have: 0 AI buzzwords (e.g., "leverage", "synergize") |
| 4 | Verify personalization | Should mention: budget, contract (from context) |
| 5 | Click [Make it Shorter] | Draft length should reduce by 30% |
| 6 | Click [Add More Details] | Draft length should increase (include context) |
| 7 | Compare to user's past emails | Tone consistency scoring |

#### Quality Metrics
```yaml
Draft Quality Scorecard:
  Grammar & Spelling: 100% (native speaker review)
  Tone Consistency: > 90% (pattern matching to user history)
  Factual Accuracy: 100% (no hallucinated facts)
  Bullshit-Free Score: > 95% (humanizer filter applied)
  Readability Score: 70+ (Flesch-Kincaid)
  
AI Detection Test:
  Human rater: Can't distinguish from user-written
  Plagiarism: 0% (original composition)
```

#### Pass/Fail Criteria
```
✅ PASS if:
  - Draft reads naturally (no AI patterns detected)
  - Grammar 100% correct
  - Tone matches user's style
  - No hallucinations
  - Edit buttons work (shorter/longer)

🔴 FAIL if:
  - Obvious AI patterns detected
  - Grammar errors present
  - Tone mismatch
  - Factual inaccuracies
  - Edit buttons broken
```

---

### Test Case 2.2: Draft Editing & Undo (Safety Net)

**Objective:** Verify draft can be edited before send, and undo works within 20s window

**Estimated Duration:** 5 minutes

#### Test Steps

| Step | Action | Expected |
|---|---|---|
| 1 | Generate draft | Draft appears |
| 2 | Edit text (add 2 sentences) | Changes reflected immediately |
| 3 | Click [Send] | "Sending..." dialog appears with UNDO button |
| 4 | Wait 5 seconds | UNDO still available |
| 5 | Click [UNDO] | Email NOT sent, reverts to draft |
| 6 | Modify again | Edit persists (not lost from undo) |
| 7 | Click [Send] again | "Sending..." appears |
| 8 | Wait 21 seconds | Undo option disappears (20s window passed) |
| 9 | Check email sent | Email delivered to recipient |
| 10 | Verify in "Sent" folder | Email visible with timestamp |

#### Technical Checks
```bash
# 1. Database audit log shows correct sequence
SELECT * FROM audit_logs 
WHERE user_id = 'user_001' 
  AND action IN ('DRAFT_EDIT', 'SEND_ATTEMPT', 'UNDO')
ORDER BY created_at DESC;
# Expected: DRAFT_EDIT → DRAFT_EDIT → SEND_ATTEMPT → SEND (no UNDO in this case)

# 2. Email sent only once (no duplicates)
SELECT COUNT(*) FROM emails_sent 
WHERE draft_id = 'draft_xyz' AND status = 'SENT';
# Expected: 1 (exactly)

# 3. Undo payload matches original draft
SELECT undo_payload FROM audit_logs 
WHERE action = 'UNDO' AND draft_id = 'draft_xyz';
# Expected: Contains full original draft text
```

#### Pass/Fail Criteria
```
✅ PASS if:
  - UNDO appears within 20s
  - UNDO actually reverses send
  - No duplicate emails sent
  - Audit trail shows correct sequence

🔴 FAIL if:
  - UNDO doesn't appear
  - Email already sent when undo clicked
  - Duplicate emails in inbox
  - Audit log shows wrong order
```

---

## WORKFLOW 3: CALENDAR SYNC & SMART SCHEDULING

### Test Case 3.1: Calendar Conflict Detection

**Objective:** Verify calendar conflicts flagged correctly

**Estimated Duration:** 10 minutes  
**Environment:** Staging with Google Calendar

#### Setup
```bash
# 1. Create calendar with overlapping events
Event 1: Mon 2PM-3PM (Team Meeting)
Event 2: Mon 2:30PM-3:30PM (1-on-1)
Event 3: Tue 3PM-4PM (Office Hours)

# 2. Connect Google Calendar to workspace
#    Verify: calendar_integration.enabled = true
```

#### Test Steps

| Step | Action | Expected | Metric |
|---|---|---|---|
| 1 | Sync calendar | 3 events ingested | Sync time < 5s |
| 2 | Check conflicts dashboard | Conflict flagged between Event 1 & 2 | 1 conflict detected |
| 3 | Open conflict detail | Shows overlapping time window (2:30-3PM) | Precision < 1 min |
| 4 | Review suggested times | 3 open slots shown (same day alternatives) | Suggestion latency < 2s |
| 5 | Check meeting prep email | Pre-call digest for office hours | Generated < 5 min before meeting |

#### Expected Output
```json
{
  "calendar_events_total": 3,
  "conflicts_detected": 1,
  "conflict_details": {
    "event_1": "Team Meeting (2:00-3:00 PM)",
    "event_2": "1-on-1 (2:30-3:30 PM)",
    "overlap_duration_minutes": 30
  },
  "suggested_slots": [
    { "time": "2024-03-11 1:00-2:00 PM", "availability": "free" },
    { "time": "2024-03-11 3:30-4:30 PM", "availability": "free" },
    { "time": "2024-03-12 10:00-11:00 AM", "availability": "free" }
  ]
}
```

#### Pass/Fail Criteria
```
✅ PASS if:
  - Conflict detected (1/1)
  - Overlap time calculated correctly
  - 3 open slots suggested
  - Suggestion time < 2s

🔴 FAIL if:
  - Conflict not detected
  - Wrong times shown
  - Suggestions take > 5s
  - Available slots shown as busy
```

---

### Test Case 3.2: Smart Meeting Scheduling (Booking Link)

**Objective:** Verify booking link embedded in draft, recipient can book directly

**Estimated Duration:** 15 minutes

#### Setup
```bash
# 1. Create draft response to meeting request
# 2. Verify: booking_link_service.enabled = true
# 3. User timezone: America/New_York
# 4. Recipient timezone: Europe/London
```

#### Test Steps

| Step | Action | Expected |
|---|---|---|
| 1 | Open meeting request email | Draft has booking link embedded |
| 2 | Check draft text | Includes: "Pick a time here: [BOOKING_LINK]" |
| 3 | Check booking link URL | Format: calendly.com/aaliyah/user_xxx?tz=EST |
| 4 | Click link (as recipient) | Booking page loads showing 3 available slots |
| 5 | Check displayed times | Converted to recipient's timezone (GMT) |
| 6 | Select a slot | Booking confirmed, event added to both calendars |
| 7 | Check user's calendar | Event appears with correct meeting details |
| 8 | Check Aaliyah history | Meeting logged with attendee info |

#### Timezone Handling Check
```yaml
User: New York (EST = UTC-5)
Recipient: London (GMT = UTC+0)

User's available slot: 2024-03-15 2:00 PM EST
Display to recipient: 2024-03-15 7:00 PM GMT ✅ (5 hour offset correct)

Recipient books slot: Confirmed at 7:00 PM GMT
Event in user's calendar: 2024-03-15 2:00 PM EST ✅ (correctly converted back)
```

#### Pass/Fail Criteria
```
✅ PASS if:
  - Booking link present in draft
  - 3 slots shown at booking page
  - Timezone conversion correct
  - Event syncs to both calendars
  - No conflicts created

🔴 FAIL if:
  - Booking link missing
  - Wrong timezone shown
  - Event not synced
  - Conflict created
```

---

## WORKFLOW 4: MEETING INTELLIGENCE (Notetaker)

### Test Case 4.1: Meeting Notes Generation (Happy Path)

**Objective:** Verify Aaliyah joins meeting, records, summarizes

**Estimated Duration:** 45 minutes (includes actual meeting)  
**Environment:** Production  
**Requirements:** Recorded Zoom/Google Meet, controlled attendees

#### Setup
```yaml
Meeting Details:
  Platform: Google Meet
  Title: "Q1 Planning - Finance Review"
  Duration: 15 minutes
  Attendees: User + 3 team members + Aaliyah (bot account)
  Status: CONFIRMED (5 min before, user gets notification)

Aaliyah Permissions:
  ✅ User clicked [Allow Aaliyah to join]
  ✅ Bot account has permission to join
  ✅ Notetaker service enabled
```

#### Test Steps

| Time | Step | Expected Outcome |
|---|---|---|
| T-5min | System sends notification | "Should Aaliyah join your meeting?" [Yes]/[No] |
| T-0 | User clicks [Yes] | Aaliyah joins silently, appears as participant |
| T+0:00 | Meeting starts | Aaliyah's status: recording = true, logging = active |
| T+5:00 | User references document | Aaliyah references doc in notes (context captured) |
| T+10:00 | Decision made | "Q1 budget: $500K approved" | Logged in decision section |
| T+15:00 | Meeting ends | Aaliyah exits, begins processing |
| T+15:30 | Transcript available | Speech-to-text complete, in database |
| T+16:00 | Summary generated | "Key Decisions", "Action Items", "Next Steps" |
| T+17:00 | Dashboard updated | Meeting recap visible in Aaliyah workspace |
| T+18:00 | User receives email | Email summary with action items + links |

#### Expected Analysis Output
```json
{
  "meeting": {
    "title": "Q1 Planning - Finance Review",
    "duration_minutes": 15,
    "attendees": ["user@company.com", "cfo@company.com", "finance@company.com"],
    "recording_status": "complete"
  },
  "analysis": {
    "key_topics": ["budget allocation", "timeline", "resource planning"],
    "decisions": [
      { "text": "Q1 budget: $500K approved", "owner": "cfo@company.com" }
    ],
    "action_items": [
      {
        "task": "Prepare detailed budget breakdown",
        "owner": "user@company.com",
        "due_date": "2024-03-15"
      },
      {
        "task": "Schedule follow-up with CFO",
        "owner": "user@company.com",
        "due_date": "2024-03-13"
      }
    ],
    "next_meeting": "TBD, pending budget review"
  },
  "quality_metrics": {
    "transcript_confidence": 0.92,
    "action_items_extracted": 2,
    "decisions_identified": 1,
    "summary_readability_score": 85
  }
}
```

#### Production Checks
```bash
# 1. Verify call recording captured
SELECT * FROM meeting_recordings 
WHERE meeting_id = 'mt_q1planning'
  AND status = 'COMPLETE';
# Expected: 1 record, duration ≈ 15 min

# 2. Check transcript accuracy
SELECT * FROM meeting_transcripts
WHERE meeting_id = 'mt_q1planning'
  AND confidence_score > 0.9;
# Expected: > 95% words captured

# 3. Audit trail for meeting
SELECT * FROM audit_logs
WHERE entity_id = 'mt_q1planning'
  AND entity_type = 'MEETING'
ORDER BY created_at;
# Expected: JOIN → RECORD → TRANSCRIBE → SUMMARIZE
```

#### Pass/Fail Criteria
```
✅ PASS if:
  - Aaliyah joins meeting silently
  - Recording captured (> 90% duration)
  - Transcript generated (confidence > 90%)
  - Action items extracted (> 80% accuracy)
  - Summary readable + professional
  - User gets email notification

🔴 FAIL if:
  - Aaliyah doesn't join / kicked out
  - Recording incomplete
  - Transcript quality < 80%
  - Action items missed
  - Spam/noise in summary
```

---

### Test Case 4.2: Legal Compliance (Recording Disclosure)

**Objective:** Verify GDPR/CCPA compliance for meeting recording

**Estimated Duration:** 10 minutes

#### Test Steps

| Step | Expected |
|---|---|
| 1 | 5 min before meeting, user gets prompt | "Aaliyah will record this meeting for notes. Confirm?" |
| 2 | If user clicks [No], Aaliyah doesn't join | Meeting not recorded |
| 3 | If user clicks [Yes], notice sent to attendees | In chat: "This meeting is being recorded for notes" |
| 4 | Recording happens only after consent | Audit log: consent_timestamp < recording_start |
| 5 | Recording stored with consent flag | recording.has_user_consent = true |
| 6 | On user data deletion request | Recording deleted + audit trail updated |

#### Compliance Checks
```yaml
GDPR (EU users):
  ✅ Explicit consent before recording
  ✅ Notice to all participants (mandatory)
  ✅ Data deletion within 30 days
  ✅ No data transfer outside EU (if applicable)

CCPA (CA users):
  ✅ Right to know: User can download raw recording
  ✅ Right to delete: Recording deleted on request
  ✅ No selling of data: Recording never shared
  ✅ Transparency: Privacy policy updated

Biometric (EU):
  ✅ Speaker diarization: Consent to identify speakers
  ✅ Facial recognition: Not used (audio only ✅)
```

#### Pass/Fail Criteria
```
✅ PASS if:
  - Consent obtained before recording
  - All attendees notified
  - Data deletion works
  - Audit trail complete

🔴 FAIL if:
  - Recording w/o consent
  - Silent recording (no notice)
  - Data deletion fails
  - No audit trail
```

---

## WORKFLOW 5: FOLLOW-UP INTELLIGENCE

### Test Case 5.1: Auto Follow-up Tracking

**Objective:** Verify follow-up tracking and smart reminders

**Estimated Duration:** 5+ days (timeline test)  
**Environment:** Staging

#### Setup
```bash
# Day 1 (Friday):
# Send email: "Hi vendor, can you provide the Q1 quote by March 15?"

# Job scheduled: Check for reply on March 15 (4 days later)
SELECT * FROM scheduled_jobs
WHERE type = 'AUTO_FOLLOWUP'
  AND scheduled_for = '2024-03-15';
# Expected: 1 job exists
```

#### Test Flow

| Day | Step | Expected | Evidence |
|---|---|---|---|
| 1 | Send email via Aaliyah | Follow-up job created in queue | `scheduled_jobs.created_at = now()` |
| 2 | No reply from vendor | Job remains scheduled | `job.status = 'pending'` |
| 3 | No reply from vendor | Job remains scheduled | `job.status = 'pending'` |
| 4 | Replay from vendor: "Quote coming Monday" | Job executed, reply detected | `job.executed = true` |
| 5 | No further follow-up needed | User gets notification | Email: "Vendor replied + quote incoming" |
| If vendor never replies: | | | |
| 5 | Job executes (follow-up day) | Smart reminder sent to user | Email: "Still waiting for Q1 quote?" |
| 5 | User clicks "Send escalation" | Escalation draft pre-written | Auto-escalation prepared |
| 5 | User sends escalation | Follow-up logged in thread | Thread count = 3 |

#### Database Checks
```sql
-- Verify follow-up thread tracking
SELECT * FROM threads
WHERE original_email_id = 'em_vendor_quote'
ORDER BY created_at;
-- Expected:
-- 1. Original: "Hi vendor, can you provide..."
-- 2. Reply: "Quote coming Monday"
-- 3. (Potentially) Escalation: "Hi, haven't received yet..."

-- Verify no duplicate reminders
SELECT COUNT(*) FROM scheduled_jobs
WHERE type = 'AUTO_FOLLOWUP'
  AND original_email_id = 'em_vendor_quote'
  AND status = 'completed';
-- Expected: 1 or 2 (not duplicated)
```

#### Pass/Fail Criteria
```
✅ PASS if:
  - Follow-up job scheduled on Day 1
  - Job executes on Day 5 (or when no reply)
  - User notified of reply (if reply received)
  - Escalation draft prepared (if no reply)
  - No duplicate reminders sent

🔴 FAIL if:
  - Follow-up job not created
  - Job not executed
  - Duplicate reminders sent
  - Wrong dates used
  - Escalation draft missing
```

---

## WORKFLOW 6: LOAD & STRESS TESTING

### Test Case 6.1: Concurrent Users (Spike Handling)

**Objective:** Verify system handles spike in users (e.g., 1000 → 2000 concurrent)

**Estimated Duration:** 30 minutes  
**Tool:** Locust or Apache JMeter  
**Environment:** Staging

#### Load Profile
```yaml
Phase 1 (Ramp-up, 0-5 min):
  Users: 100 → 500 (gradual)
  Action: Each user opens inbox + loads 10 emails
  Expected: p95 latency < 1s

Phase 2 (Sustained, 5-15 min):
  Users: 500 (constant)
  Action: Mixed (browse, click email, generate draft)
  Expected: p95 latency < 1.5s, error_rate < 0.1%

Phase 3 (Spike, 15-20 min):
  Users: 500 → 1000 (sudden spike)
  Action: Same as Phase 2
  Expected: p95 latency < 2s (acceptable degradation)

Phase 4 (Cool-down, 20-30 min):
  Users: 1000 → 100 (ramp-down)
  Expected: System recovers to baseline
```

#### Test Metrics
```yaml
Metric Targets:
  Availability: 99.9%
  p50 latency: < 500ms
  p95 latency: < 1500ms
  p99 latency: < 3000ms
  Error rate (4xx/5xx): < 0.5%
  Throughput: > 200 req/sec
  
Database Load:
  QPS: < 500
  Connection count: < 40 (of 50)
  Lock wait time: < 100ms
  
Infrastructure:
  CPU: < 70%
  Memory: < 80%
  Disk I/O: < 60%
```

#### Execution
```bash
# 1. Run load test
locust -f tests/load_test_stress.py \
  --host=http://staging-api:8000 \
  --users 1000 \
  --spawn-rate 50 \
  --run-time 30m

# 2. Monitor real-time
# Dashboard: http://localhost:8089
# Check: response times, RPS, error heatmap

# 3. Generate report
locust --headless -f tests/load_test_stress.py \
  --host=http://staging-api:8000 \
  --users 1000 \
  --csv=results/load_test
```

#### Expected Results
```
Load Test Summary:
  Total Requests: ~360,000 (200 req/sec * 30 min)
  Successful: > 359,100 (99.75%)
  Failed: < 900 (0.25%)
  
Response Time Distribution:
  Min: 45ms
  p50: 280ms ✅
  p95: 890ms ✅
  p99: 1200ms ✅
  Max: 4500ms
  
Virtual Users:
  Peak: 1000
  Ramp-up time: 5 min
  
Bottleneck Analysis:
  Database: 400 QPS (healthy)
  API CPU: 65% (healthy)
  Memory: 800MB peak (healthy)
```

#### Pass/Fail Criteria
```
✅ PASS if:
  - p95 latency < 2000ms throughout
  - Error rate < 1.0%
  - No cascading failures
  - Database connections < 45

🔴 FAIL if:
  - p95 latency > 3000ms
  - Error rate > 1.0%
  - System becomes unresponsive
  - DB connections exceeded
```

---

## WORKFLOW 7: SECURITY & COMPLIANCE TESTING

### Test Case 7.1: Authorization Boundary Violation

**Objective:** Ensure users cannot access other workspaces' data

**Estimated Duration:** 10 minutes

#### Test Setup
```bash
# 1. Create 2 test workspaces
ws_user_alice="workspace_alice_001"
ws_user_bob="workspace_bob_001"

# 2. Generate tokens for each user
TOKEN_ALICE=$(curl -X POST http://api:8000/auth/login \
  -d '{"email": "alice@company.com", "password": "test"}' | jq -r '.access_token')

TOKEN_BOB=$(curl -X POST http://api:8000/auth/login \
  -d '{"email": "bob@company.com", "password": "test"}' | jq -r '.access_token')
```

#### Attack Scenarios

| Scenario | Attack | Expected Defense | Pass/Fail |
|---|---|---|---|
| **Direct ID manipulation** | GET `/aaliyah/threads?workspace_id=workspace_bob_001` (with Alice's token) | 403 Forbidden | ✅ |
| **Bearer token steal** | Use Bob's token to fetch Alice's data | Isolated by `workspace_id` in token | ✅ |
| **SQL injection** | GET `/inbox?query=test' OR '1'='1` | Parameterized query (Pydantic validation) | ✅ |
| **Rate limit bypass** | 100 requests in 10s | 429 Too Many Requests | ✅ |
| **Missing auth** | GET `/aaliyah/status` (no token) | 401 Unauthorized | ✅ |

#### Database Verification
```sql
-- Confirm no cross-workspace leakage
SELECT DISTINCT workspace_id FROM triaged_emails
WHERE email_text LIKE '%bob%' AND workspace_id = 'workspace_alice_001';
-- Expected: No rows (Alice can't see Bob's emails)
```

#### Pass/Fail Criteria
```
✅ PASS if:
  - All boundary violations rejected
  - 403/401 responses correct
  - SQL injection blocked
  - Rate limiting enforced

🔴 FAIL if:
  - Any boundary violated
  - Cross-workspace data leaked
  - Auth bypass possible
```

---

### Test Case 7.2: Data Encryption & Secret Handling

**Objective:** Verify secrets not in logs or error messages

**Estimated Duration:** 15 minutes

#### Test Procedure

| Step | Check | Expected |
|---|---|---|
| 1 | Generate OAuth token | Token issued (JWT format) |
| 2 | Include token in request | GET `/aaliyah/status` (with header) |
| 3 | Review server logs | Token not logged (redacted) |
| 4 | Check error message | If error, no token in response |
| 5 | Verify database encryption | `OPENROUTER_API_KEY` encrypted at rest |
| 6 | Check error tracking (Sentry) | No PII in error reports |
| 7 | Scan code for hardcoded secrets | `grep -r "sk-" app/` returns 0 results |

#### Log Audit
```bash
# 1. Check production logs for secrets
tail -1000 logs/app.json.log | grep -i "sk-\|secret\|password\|token"
# Expected: No results (or redacted: "sk-XXX...XXX")

# 2. Verify PII redaction
grep "secret_scan" logs/app.json.log | head -5
# Expected: Email addresses + API keys are masked

# 3. Check error response safety
curl -X GET http://api:8000/aaliyah/invalid/endpoint
# Expected: {"error": {"code": "not_found", "message": "Endpoint not found"}}
# (NOT: Stack trace or sensitive info)
```

#### Pass/Fail Criteria
```
✅ PASS if:
  - No secrets in logs
  - Error messages safe
  - Database encryption enabled
  - Secret scanning clean
  - No hardcoded credentials

🔴 FAIL if:
  - API keys logged
  - Passwords in error messages
  - Database unencrypted
  - Secret scan finds leaks
```

---

## WORKFLOW 8: DATA INTEGRITY & BACKUP

### Test Case 8.1: Database Backup & Restore

**Objective:** Verify backups work and are restorable

**Estimated Duration:** 2 hours (staging only)

#### Procedure

| Step | Command | Expected | Time |
|---|---|---|---|
| 1 | Create baseline backup | Backup file created (> 100MB) | 10 min |
| 2 | Restore to staging DB | Database restored successfully | 15 min |
| 3 | Run smoke tests | All tests pass | 5 min |
| 4 | Verify row count | Same as production | Instant |
| 5 | Check indexes | All indexes present | 5 min |
| 6 | EXPLAIN ANALYZE | Query plans optimal | 10 min |
| 7 | Delete backup | Cleanup staging resources | 1 min |

#### Database Validation
```sql
-- Check data integrity post-restore
SELECT COUNT(*) as total_emails FROM triaged_emails; -- Should match original
SELECT COUNT(*) as total_users FROM users; -- Should match original
SELECT COUNT(*) as total_audit FROM audit_logs; -- Should match original

-- Verify no orphaned records
SELECT COUNT(*) FROM threads WHERE parent_email_id NOT IN (SELECT id FROM triaged_emails);
-- Expected: 0 (no orphans)

-- Check for data corruption
SELECT COUNT(*) FROM triaged_emails WHERE triage_label NOT IN ('priority', 'needs_reply', 'approvals', 'followup', 'fyi');
-- Expected: 0 (no invalid labels)
```

#### Pass/Fail Criteria
```
✅ PASS if:
  - Backup completes
  - Restore completes
  - Smoke tests pass
  - Data matches pre-backup
  - Query performance same

🔴 FAIL if:
  - Backup incomplete
  - Restore fails
  - Data mismatch
  - Orphaned records found
  - Query slowdown > 10%
```

---

## FINAL PRODUCTION SIGN-OFF CHECKLIST

Before deploying to production, all workflows must PASS:

```markdown
WORKFLOW TESTING COMPLETION

Core Workflows:
  ☐ 1.1: Email Detection & Triage (Happy Path) - PASS
  ☐ 1.2: Bulk Email Sync (Performance) - PASS
  ☐ 2.1: Draft Quality & Tone - PASS
  ☐ 2.2: Draft Editing & Undo - PASS
  ☐ 3.1: Calendar Conflict Detection - PASS
  ☐ 3.2: Smart Meeting Scheduling - PASS
  ☐ 4.1: Meeting Notes Generation - PASS
  ☐ 4.2: Legal Compliance (Recording) - PASS
  ☐ 5.1: Auto Follow-up Tracking - PASS

Load & Stress:
  ☐ 6.1: Concurrent Users (Spike Handling) - PASS

Security & Compliance:
  ☐ 7.1: Authorization Boundaries - PASS
  ☐ 7.2: Data Encryption & Secrets - PASS

Data Integrity:
  ☐ 8.1: Database Backup & Restore - PASS

═══════════════════════════════════════════════════════

PRODUCTION SIGN-OFF

I verify that Aaliyah has been tested comprehensively across all core workflows and is production-ready.

QA Lead: _________________ Date: _________
Eng Lead: _________________ Date: _________
Product: _________________ Date: _________

ON-CALL ROTATION ESTABLISHED: [ ] Yes [ ] No
RUNBOOK APPROVED: [ ] Yes [ ] No
TEAM TRAINING COMPLETE: [ ] Yes [ ] No

🚀 PRODUCTION DEPLOYMENT APPROVED
```

---

**Document Prepared By:** QA & Engineering Teams  
**Last Updated:** March 4, 2026  
**Next Review:** Upon major feature addition

