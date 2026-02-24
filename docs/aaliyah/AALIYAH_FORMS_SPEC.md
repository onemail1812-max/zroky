# Aaliyah Enterprise Configuration Specification
> "Your intelligent executive partner, tailored to your workflow."

## 1. Onboarding Wizard (First Run)
*Designed as a seamless, step-by-step setup to establish trust and capability.*

### Step 1: Scope of Assistance (Capabilities)
*   **Title:** "How would you like Aaliyah to assist with your inbox?"
*   **Helper:** "Choose what you want Aaliyah to help with. You can change these anytime."
*   **Options (Toggles):**
    *   [x] **Draft email replies** (Prepare drafts for review).
    *   [x] **Organize emails with labels** (Categorize into "To reply", "FYI", etc.).
    *   [ ] **Archive low-priority emails** (Auto-archive noise).
    *   [ ] **Manage your calendar** (Schedule/Update events).
    *   [x] **Initial inbox organization** (Organize recent history).

### Step 2: Email Categorization Preferences
*   **Title:** "How do you want Aaliyah to categorize your emails?"
*   **Helper:** "You can use our suggested labels or create your own."
*   **Default Chips (Selectable):**
    *   `To respond` `FYI` `Meeting update` `Awaiting reply` `Actioned` `Marketing` `Notifications`
*   **Optional Chips:**
    *   `Ideas` `Support` `Events` `Internal` `Clients` `Invoices`
*   **Custom:** [+ Add custom label]

### Step 3: Connect Email Account
*   **Title:** "I’m almost ready to manage your inbox"
*   **Helper:** "I need access to your email. Don't worry — I won’t send emails without approval."
*   **Providers (Tabs):** [Google] [Outlook] [IMAP]
*   **Input:** [Connect Account Button] (Triggers OAuth)

### Step 4: Email Permissions
*   **Title:** "Almost there!"
*   **Helper:** "Please grant the following permissions."
*   **Cards:**
    *   **Manage Inbox:** [Authorize] (Read metadata, labels).
    *   **Draft Emails:** [Authorize] (Write access to drafts).

### Step 5: Connect Calendar
*   **Title:** "Connect your calendar"
*   **Helper:** "Allows availability checks and meeting prep."
*   **Providers:** [Google] [Outlook]
*   **Input:** [Connect Account Button]

### Step 6: Calendar Selection
*   **Title:** "Select the calendar to manage"
*   **Input:** Dropdown of available calendars from the connected account.

### Step 7: Meeting Intelligence (Premium)
*   **Title:** "Do you want me to take notes during meetings?"
*   **Helper:** "I'll join, take notes, and send summaries."
*   **Option:** [ ] Enable meeting notes.

### Step 8: Completion
*   **Message:** "You’re all set! I’ll quietly work in the background and step in when something needs your attention. Check 'Guidelines' to fine-tune me."

---

## 2. Guidelines (The "Brain" Configuration)
*A centralized 'Rulebook' where the user defines Aaliyah's behavior. Always editable.*

### Section A: Communication Style
*   **Voice Consistency:**
    *   [ ] Match my past email tone (Analyze sent folder).
    *   [ ] Use specific guidelines only.
    *   [x] Blend both.
*   **Writing Style (Sliders/Select):**
    *   **Tone:** Direct/Confident <-> Friendly/Casual.
    *   **Length:** Concise <-> Detailed.
    *   **Formatting:** "Use short, punchy sentences. Focus on next steps."

### Section B: Decision Rules
*   **Reply Rules:** (Draft vs Ignore)
    *   *Draft for:* Clients, Partners, Internal Team.
    *   *Ignore:* Newsletters, Cold Outreach.
*   **Approval Level:** (When to ask?)
    *   [x] Before sending emails.
    *   [x] Before scheduling meetings.
    *   [ ] Before archiving in bulk.
*   **Priority Signals:**
    *   *Urgent:* CEO, "Urgent" in subject, conflict with Board Meeting.
    *   *Handling:* "Draft immediately + Notify via Slack."

### Section C: Calendar & Meetings
*   **Scheduling Preferences:**
    *   *Meeting Length:* [30] mins default.
    *   *Buffer:* [10] mins between meetings.
    *   *Work Hours:* 09:00 - 17:00 (Timezone: EST).
    *   *Focus Time:* "Avoid meetings before 10am."
*   **Meeting Notes:**
    *   *Focus on:* Decisions, Action Items.
    *   *Ignore:* Small talk.
    *   *Privacy:* "Do not record HR/Finance meetings."

### Section D: Privacy & Safety
*   **Sensitive Topics:**
    *   "Legal", "HR", "Finance", "Health".
    *   *Rule:* "Always require explicit approval. Never auto-action."
*   **Ambiguity Rule:** "If unsure, always ask me first."

---

## 3. Settings (System)
*   **Profile:** Updates to Name/Role come from Executive Assistant, but editable here.
*   **Integrations:** Manage OAuth connections (Gmail, Calendar, Slack).
*   **Notifications:** Desktop alerts, Daily Briefing time.
*   **Data Management:** "Clear my memory", "Export data".
