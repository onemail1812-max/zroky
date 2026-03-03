# AALIYAH AUTOMATIC CHAT SYSTEM

## Overview

Aaliyah can now **automatically initiate conversations** with users by:
- ✅ Detecting important emails and asking clarification questions
- ✅ Preparing for meetings proactively
- ✅ Reminding about pending follow-ups
- ✅ Sending daily briefing digests
- ✅ Handling VIP responses with priority
- ✅ Detecting and resolving calendar conflicts
- ✅ Auto-drafting responses
- **Everything happens automatically without waiting for user input**

---

## Architecture

### Three Core Components

```
┌─────────────────────────────────────────────────────┐
│        AutoChatService (Core Logic)                 │
│ • 8 conversation triggers                           │
│ • Proactive message generation                      │
│ • Auto-execution of actions                         │
└─────────────────────────────────────────────────────┘
                       ▲
                       │
        ┌──────────────┴──────────────┐
        │                             │
┌───────▼────────────────┐  ┌────────▼──────────────┐
│  AutoChatWorker        │  │  API Routes           │
│ (Background Loop)      │  │ (/auto-chat)          │
│ • Monitors inbox       │  │ • Manual triggers     │
│ • Runs triggers        │  │ • Execute actions     │
│ • Persists messages    │  │ • Configuration       │
└────────────────────────┘  └───────────────────────┘
```

### Files Added

```
app/agents/aaliyah/core/auto_chat_service.py     # Core service (400+ lines)
app/workers/auto_chat_worker.py                   # Background monitor (350+ lines)
app/routers/auto_chat.py                          # API endpoints (350+ lines)
```

---

## Features

### 1. **Automatic Email Handling**

When an urgent email arrives:

```python
TRIGGER: URGENT_EMAIL

Opens Aaliyah:
┌─────────────────────────────────────────┐
│ 🔴 URGENT, John!                         │
│                                          │
│ From: CEO <ceo@company.com>              │
│ Subject: Q4 Budget Approval Needed       │
│                                          │
│ Can you approve the attached budget      │
│ before end of day? Thanks!               │
│                                          │
│ What should we do?                       │
│ • 📝 Draft a reply                       │
│ • 📅 Schedule a call                     │
│ • 🔔 Snooze until later                  │
│ • ➡️ Delegate to someone                │
└─────────────────────────────────────────┘

→ Auto-generates context-aware draft
→ Asks clarification questions if needed
→ Can auto-execute (draft/snooze/delegate)
```

### 2. **Automatic Clarification Questions**

For ambiguous emails, Aaliyah automatically asks:

```
Trigger: CLARIFICATION_NEEDED

Hi John! Before I draft a response, I need a few clarifications:

**Q1: What's the deadline for this approval?**
**Q2: Should I include financial details in the response?**
**Q3: Who else needs to be CC'd?**
```

- Questions asked immediately
- Answers collected progressively
- Draft generated once clarification complete
- **User doesn't need to provide initial context** ← Auto-determined from email

### 3. **Meeting Preparation (5 Min Before)**

Automatically triggers meeting prep:

```
Trigger: MEETING_PREP (5 minutes before meeting starts)

📅 Meeting prep for: Q4 Planning Session

Attendees: John Smith, Sarah Lee, Mike Chen
Starts in: 5 minutes

Relevant context:
• Last week's decision: Use cloud infrastructure
• Budget approved: $500K
• Timeline: Start implementation next month

Suggested materials:
 - 📊 Recent emails from attendees
 - 📝 Talking points
 - ❓ Open questions
 - 📋 Agenda
```

- Pulls relevant emails/documents automatically
- Generates talking points
- No manual preparation needed

### 4. **Daily Afternoon Digest (3 PM)**

Automatic daily briefing:

```
Trigger: AFTERNOON_DIGEST (At 3 PM every day)

📊 Afternoon digest for John:

🔴 5 urgent emails needing action
📝 3 drafts ready to review
⏰ 2 follow-ups pending

What would help you most right now?
• 📥 Review high-priority emails
• ✍️ Draft responses
• 📋 Check follow-ups
• ⚙️ Settings
```

### 5. **Pending Follow-up Reminders (3+ Days)**

Automatic nudge for old emails:

```
Trigger: PENDING_FOLLOWUP

⏰ John, this email from investor@example.com has been waiting 3 days:

Subject: Series A Investment Terms
"Let's review the terms and timelines for the Series A round..."

Options:
• 📧 I'll draft a response
• ⏳ Snooze for 2 more days
• 🗑️ Mark as handled
• ⚡ Escalate
```

### 6. **Calendar Conflict Detection**

Automatic conflict resolution:

```
Trigger: CALENDAR_CONFLICT

⚠️ John, I found calendar conflicts:

• Q4 Planning overlaps with CEO 1-on-1
• Board Meeting overlaps with All-Hands

Quick fix options:
• 📅 Auto-reschedule one of them
• 🔔 Send apologies to attendees
• ✋ Skip this suggestion
```

### 7. **VIP Priority Handling**

Automatic detection of VIP emails:

```
Trigger: VIP_RESPONSE

⭐ VIP Alert, John!

Satya Nadella just sent you an email:

Subject: Partnership Opportunity

"I wanted to discuss a potential partnership between our companies..."

🎯 Priority draft suggestions:
1. Warm, professional tone
2. Address directly
3. Offer value
4. Call to action
```

### 8. **Auto-Execution of Actions**

Automatically execute follow-through:

```python
# Auto-draft response
POST /auto-chat/execute-action
{
  "email_id": "email_123",
  "action": "draft"
}

→ Generates full email draft
→ Uses memory + tone patterns
→ Ready for user review

# Auto-snooze
{
  "email_id": "email_123",
  "action": "snooze",
  "params": {"hours": 24}
}

→ Email disappears from inbox
→ Reappears in 24 hours

# Auto-schedule followup
{
  "email_id": "email_123",
  "action": "schedule"
}

→ Adds 3-day reminder
```

---

## API Endpoints

### Trigger Auto-Chat Manually

```bash
POST /auto-chat/trigger
Content-Type: application/json

{
  "trigger": "urgent_email",
  "email_id": "email_abc123"
}

Response:
{
  "success": true,
  "trigger_type": "urgent_email",
  "preview": {
    "type": "urgent_action_required",
    "message": "🔴 URGENT, John! ..."
  }
}
```

### Execute Auto Action

```bash
POST /auto-chat/execute-action

{
  "email_id": "email_abc123",
  "action": "draft"
}

Response:
{
  "success": true,
  "action": "draft",
  "timestamp": "2026-03-04T12:34:56Z"
}
```

### Get Auto-Chat Status

```bash
GET /auto-chat/status/{email_id}

Response:
{
  "email_id": "email_abc123",
  "auto_chat_triggered": true,
  "auto_chat_trigger_type": "urgent_email",
  "auto_draft_status": "ready_for_review",
  "clarification_pending": false,
  "vip_priority": true
}
```

### Configure Settings

```bash
PUT /auto-chat/settings

{
  "enable_urgent_auto_chat": true,
  "enable_meeting_prep": true,
  "enable_afternoon_digest": true,
  "enable_followup_reminders": true,
  "enable_vip_prioritization": true,
  "vip_senders": ["ceo@company.com", "board@company.com"],
  "auto_draft_priority_threshold": "High",
  "afternoon_digest_time": "15:00"
}
```

### Get Current Settings

```bash
GET /auto-chat/settings

Response:
{
  "auto_chat_settings": {
    "enable_urgent_auto_chat": true,
    "enable_meeting_prep": true,
    ...
  },
  "vip_senders": ["ceo@company.com"],
  "defaults": { ... }
}
```

### Demo Trigger

```bash
POST /auto-chat/demo/simulate-urgent-email

Response:
{
  "demo_email_id": "demo_abc123",
  "auto_chat_triggered": true,
  "preview": { ... }
}
```

---

## Integration Steps

### 1. Add Routes to Main App

In `app/main.py`:

```python
from app.routers import auto_chat

app.include_router(auto_chat.router)
```

### 2. Start Auto-Chat Worker

In `app/agents/aaliyah/core/orchestrator.py` lifespan:

```python
from app.workers.auto_chat_worker import start_auto_chat_worker
import asyncio

async def lifespan(...):
    # ...existing code...
    
    # Start auto-chat worker
    asyncio.create_task(
        start_auto_chat_worker(workspace_id)
    )
    
    yield
    
    # Cleanup
```

### 3. Configure Auto-Chat for User

```bash
PUT /auto-chat/settings

# Enable all auto-chat features
{
  "enable_urgent_auto_chat": true,
  "enable_meeting_prep": true,
  "enable_afternoon_digest": true,
  "enable_followup_reminders": true,
  "enable_vip_prioritization": true,
  "vip_senders": ["ceo@company.com"]
}
```

---

## How It Works (Step-by-Step)

### Scenario: Urgent Email Arrives at 2 PM

```
1. Email arrives from CEO with "URGENT" in subject
   ↓
2. AutoChatWorker detects it (30-second check interval)
   ↓
3. Calls AutoChatService.trigger_auto_chat(trigger=URGENT_EMAIL)
   ↓
4. Service generates opening message:
      "🔴 URGENT, John! CEO just sent..."
   ↓
5. Stores in ChatRepository (chat history)
   ↓
6. Emits LiveEvent (real-time to frontend)
   ↓
7. Retrieves clarification questions from triage
   ↓
8. Auto-asks first question:
      "Before I draft, what's your key concern?"
   ↓
9. User responds (or Aaliyah waits ~60 seconds)
   ↓
10. Generates draft using Brain service
    ↓
11. Offers action options (send/edit/snooze/delegate)
    ↓
12. If user clicks "Draft", executes auto_draft_response()
    ↓
13. Stores draft in metadata_json + audit trail
    ↓
14. ✅ COMPLETE - Ready for review or send
```

---

## Configuration Guide

### Enable Automatic Chat for Workspace

```python
# Workspace settings structure
{
  "aaliyah": {
    "auto_chat_settings": {
      "enable_urgent_auto_chat": true,
      "enable_meeting_prep": true,
      "enable_afternoon_digest": true,
      "enable_followup_reminders": true,
      "enable_vip_prioritization": true,
      "auto_draft_priority_threshold": "High",  # Only auto-draft High+ priority
      "afternoon_digest_time": "15:00"  # 3 PM
    },
    "vip_senders": [
      "ceo@company.com",
      "board@investors.com",
      "partners@acme.com"
    ]
  }
}
```

### Which Triggers Are Automatic?

| Trigger | Auto? | How Often | User Action |
|---------|-------|-----------|------------|
| URGENT_EMAIL | ✅ Yes | On arrival | Respond to chat |
| NEW_EMAIL | ⚠️ Optional | On arrival | Configure threshold |
| MEETING_PREP | ✅ Yes | 5 min before | Optional review |
| PENDING_FOLLOWUP | ✅ Yes | 1x per day | Optional snooze |
| AFTERNOON_DIGEST | ✅ Yes | 3 PM daily | Choose action |
| CALENDAR_CONFLICT | ✅ Yes | On detection | Approve resolution |
| VIP_RESPONSE | ✅ Yes | On arrival | Respond to chat |
| CLARIFICATION_NEEDED | ✅ Yes | During draft | Answer Qs |

---

## Customization

### Add Custom Auto-Chat Trigger

In `auto_chat_service.py`:

```python
class ConversationTrigger(str, Enum):
    # Add new trigger
    CUSTOM_WEEKEND_BRIEFING = "custom_weekend_briefing"

class AutoChatService:
    async def trigger_auto_chat(self, ...):
        # Handle new trigger
        elif trigger == ConversationTrigger.CUSTOM_WEEKEND_BRIEFING:
            return await self._handle_weekend_briefing(db, user_id, **context)
    
    async def _handle_weekend_briefing(self, ...):
        # Your custom logic here
        pass
```

### Customize Prompts

Edit templates in service methods:

```python
async def _handle_urgent_email(self, ...):
    msg = f"Custom greeting, {name}!\n\n"
    msg += f"From: {email.sender}\n"
    msg += f"Subject: {email.subject}\n\n"
    # Customize message here
```

---

## Testing

### Manual Testing

```bash
# 1. Create demo urgent email
POST /auto-chat/demo/simulate-urgent-email

# 2. Check what happened
GET /auto-chat/status/{demo_email_id}

# 3. Manually trigger a conversation
POST /auto-chat/trigger
{
  "trigger": "afternoon_digest"
}

# 4. Execute an auto action
POST /auto-chat/execute-action
{
  "email_id": "...",
  "action": "draft"
}
```

### Unit Testing

```python
# test_auto_chat_service.py

@pytest.mark.asyncio
async def test_urgent_email_auto_chat():
    service = AutoChatService("workspace_123")
    
    # Create test email
    email = TriagedEmail(
        subject="URGENT: System Down",
        priority="Critical"
    )
    
    # Trigger
    result = await service.trigger_auto_chat(
        db,
        user_id="user_123",
        trigger=ConversationTrigger.URGENT_EMAIL,
        context={"email_id": email.id}
    )
    
    # Assert message was created
    assert result is not None
    assert result["type"] == "urgent_action_required"
```

---

## Monitoring & Debugging

### Check Auto-Chat Activity

```bash
# View auto-chat logs
tail -f logs/aaliyah.log | grep "AutoChat"

# Count auto-chats triggered
SELECT COUNT(*) FROM chat_messages 
WHERE msg_type = 'system_action' 
AND payload->>'trigger' = 'urgent_email'
AND created_at > NOW() - INTERVAL '24 hours';
```

### Debug Auto-Chat Worker

```python
# Set debug mode
logger.setLevel(logging.DEBUG)

# Worker logs every check:
[AutoChatWorker] Checking urgent emails... (0 found)
[AutoChatWorker] Checking pending followups... (1 found)
[AutoChatWorker] Pending followup reminder: email_abc (3 days)
```

### Verify Integration

```bash
# Test endpoint responsiveness
curl -X GET http://localhost:8000/auto-chat/settings \
  -H "Authorization: Bearer $TOKEN"

# Demo mode
curl -X POST http://localhost:8000/auto-chat/demo/simulate-urgent-email \
  -H "Authorization: Bearer $TOKEN"
```

---

## Performance Notes

### Processing Intervals

- **Urgent emails**: Checked every 30 seconds
- **Pending followups**: Checked every 30 seconds
- **Meeting prep**: Checked every 30 seconds
- **Afternoon digest**: Checked once per hour (at 3 PM)
- **Calendar conflicts**: Checked every 30 seconds
- **VIP responses**: Checked every 30 seconds

### Database Impact

- ~1 query per trigger check
- Batch processing (multiple emails at once)
- No N+1 queries (efficient filtering)
- Auto-chat messages stored in existing `chat_messages` table

### Latency

- Email → Auto-chat message: **30-60 seconds** (based on check interval)
- Draft generation: **2-5 seconds** (Brain service)
- API response time: **< 500ms** (cached workspace settings)

---

## Production Checklist

- [ ] Add routes to `app/main.py`
- [ ] Start worker in orchestrator lifespan
- [ ] Configure workspace settings with VIP senders
- [ ] Test all 8 triggers manually
- [ ] Set up log monitoring
- [ ] Document VIP sender list
- [ ] Brief users on auto-chat features
- [ ] Monitor performance for first 24 hours
- [ ] Collect user feedback
- [ ] Adjust settings based on usage

---

## Examples

### Example 1: Urgent Budget Approval

```
CEO sends: "Need Q4 budget approval ASAP"
↓
[30 sec] Aaliyah: "🔴 URGENT, John! CEO..."
↓
[Automated] "Before I draft, what's your budget total?"
↓
John: "$2M for cloud infrastructure"
↓
[Automated] "Should I approve as-is or request changes?" 
↓
John: "Approve as-is"
↓
[Automated Draft] "Thanks for the opportunity. I've reviewed..."
↓
[2 sec] Draft ready
↓
John: "Send it"
✅ Email sent, audit logged
```

### Example 2: Meeting Preparation

```
John has "Board Review" at 3:05 PM
↓
[3:00 PM] Aaliyah: "📅 Meeting prep for Board Review"
"Attendees: Board members (5)"
"Context: Q3 results, growth targets"
"Recent emails: 2 from board members"
↓
[Optional] John reviews context
↓
[3:05 PM] Meeting starts
✅ John is prepared
```

### Example 3: Follow-up Reminder

```
John received email 3 days ago: "Can you review the proposal?"
↓
[3:30 PM] Aaliyah: "⏰ It's been 3 days..."
"Subject: Product Proposal Review"
↓
John: "Snooze 2 more days"
↓
[2 days later] ...reminder again
```

---

## Troubleshooting

### Auto-Chat Not Triggering

**Check:**
1. Is auto-chat enabled? `GET /auto-chat/settings`
2. Are trigger types enabled? Check `enable_urgent_auto_chat`, etc.
3. Is worker running? Check logs for `[AutoChatWorker]`
4. Email priority correct? Must be "High" or "Critical"

### Messages Not Appearing

**Check:**
1. Is chat history loading? Verify `ChatRepository.list_messages()`
2. Check `chat_messages` table for `msg_type = 'system_action'`
3. Verify `workspace_id` matches
4. Check frontend subscription to real-time events

### Drafts Not Generating

**Check:**
1. Brain service accessible? Test `/health`
2. Sufficient context? Check memory retrieval
3. LLM API keys valid? Check `.env`
4. Check logs for `[AutoChat] Error in auto_draft`

---

## Future Enhancements

- [ ] AI-powered urgency ranking (ML model for priority prediction)
- [ ] Tone learning (user feedback → style adaptation)
- [ ] Customizable trigger conditions (user rules engine)
- [ ] Recipient suggestion (who should get this email?)
- [ ] Multi-language support
- [ ] Auto-execute with confidence scoring
- [ ] A/B testing different greeting styles
- [ ] Timezone-aware scheduling

---

**CONCLUSION**: Aaliyah's automatic chat system makes your AI assistant truly *proactive* — responding to your work before you ask, asking clarifying questions before you give them, and preparing you for what's coming next. **Everything is automatic by default.**
