# Enterprise-Grade Aaliyah UI/UX Blueprint
> "Calm, Intelligent, Trustworthy."

## 1. Design Philosophy
*   **Aesthetic:** "Premium Executive SaaS." Clean, light, high-whitespace.
*   **Metaphor:** A **workspace**, not a chatroom. A shared desk where you and Aaliyah collaborate on documents, emails, and schedules.
*   **Core Principle:** **Operational Transparency.** Show *processed signals* and *proposed actions*, not raw thought traces or fake metaphors.

## 2. Layout Structure (Responsive)
The interface uses a **Three-Column Productivity Layout**:

### Column A: Temporal Context (Left Sidebar - 250px)
*   **Timeline Navigation:**
    *   *Today's Briefing* (Top item, always accessible).
    *   *Active Threads* (Ongoing tasks like "Q3 Planning").
    *   *Past week* (History).
*   **Knowledge Graph Access:** Button to view "My Context" (Relationships, Projects) in a structured read-only view.

### Column B: The Workspace Stream (Center - Flex)
*   **The "Feed"**: A chronological stream of **Event Cards** and **Action Cards**.
    *   **Notification Card:** "New Email from Steve (VIP)." Minimalist, clickable.
    *   **Reasoning Summary Card:** Instead of raw thoughts, show:
        *   *Signals:* "Detected conflict with Board Meeting."
        *   *Logic:* "Priority: High. Action: Draft reply + Reschedule."
        *   *Confidence:* "High (95%)".
    *   **Generative UI Widgets:**
        *   **Email Editor:** A clean, bordered box with Subject/Body fields.
        *   **Scheduler:** A mini-calendar snippet showing the specific slot.
*   **Input Area:** A clean, floating bar at the bottom with "Ask Aaliyah..." placeholder.

### Column C: Operational Status (Right Panel - 300px / Collapsible)
*   **System Status (Real Metrics):**
    *   *Sync Status:* "Gmail: Synced 2m ago", "Calendar: Synced 1m ago".
    *   *Queue:* "Idle" or "Processing 1 item...".
*   **Active Context:**
    *   *Current Focus:* "Drafting email to Steve."
    *   *Data Sources:* "Using: Email History, Calendar Availability."

## 3. Visual Identity (Strict Enterprise)

*   **Colors:**
    *   **Background:** `#F7F8FA` (Soft Gray).
    *   **Canvas:** `#FFFFFF` (White).
    *   **Primary Text:** `#0F172A` (Slate 900).
    *   **Secondary Text:** `#64748B` (Slate 500).
    *   **Borders:** `#E5E7EB` (Gray 200).
    *   **Accent:** `#2563EB` (Royal Blue) - Used *only* for primary actions (buttons, active states).

*   **Typography:**
    *   **Font:** `Inter`.
    *   **Headings:** Semibold, compact.
    *   **Body:** 14px, high readability.
    *   **Logs/Metadata:** 12px, muted (`#94A3B8`).

*   **Components:**
    *   **Cards:** White background, 1px `#E5E7EB` border, 12px rounded corners. No shadow (or very subtle `sm`).
    *   **Buttons:**
        *   *Primary:* Blue background, white text, rounded-md.
        *   *Secondary:* White background, gray border, slate text.
        *   *Ghost:* Transparent background, slate text.
    *   **Icons:** Lucide React (1.5px stroke, Slate 500).

## 4. Key Workflows

### A. Onboarding (First Run)
A multi-step wizard, not a chat.
1.  **Identity:** "What should I call you?" / "What is your role?"
2.  **Connections:** "Connect Gmail" / "Connect Calendar" (OAuth Buttons).
3.  **Communication Style:** "Formal vs Casual", "Brief vs Detailed".
4.  **Operational Rules:** "Work Hours", "Meeting Buffers".

### B. Daily Briefing (Morning)
A dedicated "Dashboard View" that appears at the start of the day.
*   **Greeting:** "Good morning, [Name]. Here is your day."
*   **Weather:** Minimal icon + temp.
*   **Schedule:** List of meetings today.
*   **Inbox Triage:** "3 Urgent Emails", "5 Newsletters (Auto-Archived)".
*   **Action:** [Start Day] button.

### C. Live Event Notification
When a new email arrives:
1.  **Toast Notification:** "New Email from Steve (VIP)."
2.  **Feed Update:** An **Event Card** slides in.
    *   *Header:* "Email Received: 10:45 AM"
    *   *Content:* Summary of the email.
    *   *Auto-Action:* "Aaliyah is drafting a reply..." (Spinner).
    *   *Draft Card:* Appears below. "Here is a draft. Approve?"
    *   *Actions:* [Approve & Send] [Edit] [Reject].

## 5. Implementation Plan (Frontend)
*   **Stack:** Next.js 14, Tailwind CSS, Shadcn/UI, Lucide React.
*   **State:** React Query (Fetching), Zustand (UI State).
*   **Real-time:** Server-Sent Events (SSE) for the live feed.
