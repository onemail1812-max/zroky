# Aaliyah "Masterpiece" Specification: The Definitive Cut
> A strict audit of features for the Enterprise Executive Assistant.
> **Philosophy:** If it doesn't build trust or save time, it is cut.

---

## 1. Global Rail (Navigation)
**Goal:** minimal context switching.

| Feature | Status | Ruling |
| :--- | :--- | :--- |
| **Logo / Home** | ✅ **KEEP** | Essential anchor. |
| **Central Notifications** | ❌ **CUT** | **Reasoning:** Aaliyah *is* the notification system. Having a separate bell icon confuses the metaphor. The "Stream" (Col B) should handle alerts. |
| **Executive Assistant Icon** | ✅ **KEEP** | The primary "Agent" view. |
| **Add Workspace (+)** | ⚠️ **REFINE** | **Change:** Rename to "Add Context" (e.g., "Personal", "Work", "Board"). |
| **Feedback Icon** | ❌ **CUT** | **Reasoning:** Clutter. Users will chat with Aaliyah if something is wrong. |
| **Global Info (Globe)** | ❌ **CUT** | **Reasoning:** Distraction. |
| **Settings / Profile** | ✅ **KEEP** | Essential for connection management (Connect Gmail/Calendar). |

---

## 2. Column A: Operational Transparency (Sidebar)
**Goal:** "At a glance" situational awareness.

| Feature | Status | Ruling |
| :--- | :--- | :--- |
| **Today's Briefing** | ✅ **KEEP** | **Must Have.** The "Morning Paper" view. Shows the 3 most important things. |
| **Calendar (Next 3)** | ✅ **KEEP** | **Crucial.** Executives live by their calendar. Must show "Time until next meeting". |
| **"Live Activity" Widget** | ⚠️ **REFINE** | **Change:** Remove fake spinners. Only show *real* async jobs (e.g., "Syncing Gmail..."). If idle, hide it. Fake activity destroys trust. |
| **Tasks & Timeline** | ✅ **KEEP** | Group by "Today" vs "Pending". |
| **"History" Section** | ❌ **CUT** | **Reasoning:** Visual noise. We only care about *active* and *pending* work. History belongs in a separate "Audit Log" page, not the main dash. |
| **Approvals Queue** | ✅ **KEEP** | **The most important widget.** This is the "Inbox" for the user's decisions. |

---

## 3. Column B: The Notification Stream (Main Stage)
**Goal:** Zero-friction decision making.

| Feature | Status | Ruling |
| :--- | :--- | :--- |
| **Proactive Chat Bubble** | ✅ **KEEP** | "I've drafted a reply..." |
| **Draft Card** | ✅ **KEEP** | **Core Artifact.** Must support: Read, Edit (Inline), Approve, Reject. |
| **"User Input" Bar** | ✅ **KEEP** | Simple text input. "Change the time to 2pm." |
| **"Aaliyah Thinking"** | ⚠️ **REFINE** | **Change:** Subtle pulse only. No full-screen blockers. |
| **Generative Widgets** | ❌ **CUT** | **Reasoning:** (For Phase 1). No drag-and-drop timelines yet. Text negotiation is faster to build and sufficient for MVP. |
| **Voice Mode** | ❌ **CUT** | **Reasoning:** Phase 2. Focus on perfect text interaction first. |

---

## 4. Backend Capabilities (The Brain)
**Goal:** Reliability over creativity.

| Capability | Status | Ruling |
| :--- | :--- | :--- |
| **Email Ingestion** | ✅ **KEEP** | Gmail/Outlook. Must parse "Who", "Subject", "Priority". |
| **Smart Triage** | ✅ **KEEP** | Classifier: [Urgent, Meeting, Newsletter, Ignore]. |
| **Draft Generation** | ✅ **KEEP** | RAG-based drafting (using past emails for tone). |
| **Calendar Sync** | ✅ **KEEP** | Read-only access to start. (Aaliyah proposes times, User books). |
| **Auto-Booking** | ❌ **CUT** | **Reasoning:** Too risky for MVP. Aaliyah should *draft* the invite, User clicks "Send". |
| **Internet Browsing** | ❌ **CUT** | **Reasoning:** Distraction. Focus on internal company data first. |

---

## 5. Trust & Safety (Governance)
**Goal:** "Review-First" Architecture.

| Feature | Status | Ruling |
| :--- | :--- | :--- |
| **Shadow Mode** | ✅ **KEEP** | **Default.** Aaliyah *cannot* send emails without explicit approval button click. |
| **Audit Log** | ⚠️ **DEFER** | **Reasoning:** Users trust the "Stream History" for now. A dedicated compliance log is post-MVP. |
| **Edit History** | ❌ **CUT** | **Reasoning:** Over-engineering. Just save the latest draft. |

---

## Summary of Changes Required
1.  **Sidebar Cleanup:** Remove "History" and "Feedback" icons. Simplify "Live Activity" to be real-only.
2.  **Stream Focus:** Ensure the "Edit Draft" flow is buttery smooth (Done).
3.  **Backend Focus:** Nail the **Ingestion -> Triage -> Draft -> Approve** loop. Ignore everything else.
