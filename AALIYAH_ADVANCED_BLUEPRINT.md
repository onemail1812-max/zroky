# Aaliyah: Advanced Blueprint (Reality-Based)

### 1. The Core Rule: User is the Boss
* **No Auto-Send:** Aaliyah will NEVER send an email on her own.
* **Human Approval:** She only prepares the draft. You must click "Send".
* **Zero Risk:** You have 100% control over everything going out.

### 2. Auto-Sync & Immediate Response
* **Always On Background Workers:** Emails and calendar sync continuously via background cron jobs (Ingestor).
* **Zero Waiting:** Because drafts are prepared in the background *before* you open the app, you get immediate responses. No "Loading AI..." spinners.

### 3. Smart Inbox (The 6 Folders)
* **Priority:** VIP and urgent emails (with drafts ready).
* **Needs Reply:** Normal questions (with drafts ready).
* **Approvals:** Sensitive/Money emails (no draft, waiting for your instruction).
* **Follow-ups:** Reminders for clients who haven't replied.
* **FYI:** Read-only alerts and newsletters (hidden).
* **Drafts:** Mails waiting for you to hit "Send".

### 4. Auto-Drafting Engine & Double LLM Check
* **General Questions:** Always drafting answers based on past emails. No auto-send.
* **The "Double Draft Check":** AI can hallucinate. To prevent this, Aaliyah uses a two-step agentic workflow:
  1. *The Drafter (LLM 1)* writes the email.
  2. *The Critic (LLM 2)* strictly reviews the draft for tone, errors, or invented facts. If it fails, the draft is rejected and rewritten before you ever see it.

### 5. Smart Meeting Scheduling (Double Availability)
* **Your Calendar:** She checks your real-time Google/Outlook calendar for exactly 3 open slots.
* **Their Timezone Check:** She checks the recipient's timezone from past memory. 
* **The Booking Link:** She automatically embeds a booking link into the draft, so the recipient can lock a time instantly.

### 6. Professional Writing Style
* **To-The-Point:** Drafts are crisp, short, and professional.
* **No Fluff/Jargon:** AI robotic words are completely removed.
* **Your Tone:** She learns and mimics your personal writing style.

### 7. Live Meeting Notes (With Permission)
* **Explicit Entry Permission:** 5 minutes before your Zoom/Meet starts, Zroky will ask: *"Should Aaliyah join the meeting to take notes?"* [Yes] / [No].
* **Pen-Free Meetings:** If you click Yes, Aaliyah joins silently in the background as a "Notetaker".
* **Automated Notes:** She types out the discussion points live using Speech-to-Text via a headless browser worker.
* **Next Steps:** After the meeting, a clean summary and action items are instantly ready on your dashboard.

### 8. Conversational Chat
* **Command Aaliyah:** You can chat with her directly to command tasks.
* **Search & Ask:** "What did Rahul say yesterday?" or "Prepare a draft for my 2 PM meeting."

### 9. The "Undo" Safety Net (20 Seconds)
* **Instant Regret Button:** Even after you click "Send" on a draft, Aaliyah holds the email for 20 seconds.
* **Stop It:** A pop-up will show *"Sending..."* with a clear `[UNDO / STOP]` button, giving you peace of mind to cancel any accidental sends.

### 10. Attachment Reader (Docs/PDFs)
* **No Manual Downloading:** If an email contains a long PDF or Document, Aaliyah automatically reads it in the background.
* **Simple Summary:** She will extract a clean, simple summary (not just rigid bullets, but a proper contextual brief) and display it directly above the email so you instantly know what the file is about without opening it.

### 11. Fast Draft Tweaks (No Typing Required)
* **One-Click Edits:** If Aaliyah prepares a draft but you don't like it, you don't need to type out new instructions or edit it manually.
* **Action Buttons:** Right below the draft, you will see 3 quick buttons: `[Make it Shorter]`, `[Add more details]`, and `[Custom]`. Clicking these will instantly rewrite the draft.

### 12. Multi-Language Detection
* **Global Ready:** Aaliyah automatically detects if an incoming email is in Spanish, Hindi, French, or any other language.
* **Native Reply:** She analyzes it and prepares the draft reply in the exact same language and professional tone natively.
