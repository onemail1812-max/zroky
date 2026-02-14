# 🚀 Aaliyah "Masterpiece" Sprint Plan: Zero to World-Class

**Objective:** Build Aaliyah (EVA), a fully autonomous, enterprise-grade AI Chief of Staff.
**Timeline:** 6 Sprints (12 Weeks)
**Philosophy:** Vertical Slices. Every sprint delivers a *working* capability, not just infrastructure.

---

## 🏃 Sprint 1: The "Sensory Foundation" (Weeks 1-2)
**Goal:** Aaliyah can "See" and "Organize" the world (Email/Calendar) but not yet act.

### 1.1 Core Brain Infrastructure
*   [ ] **Service Architecture:** Set up `apps/api/app/services/aaliyah` and `services/brain` with clean separation of concerns.
*   [ ] **Unified LLM Gateway:** Build `Brain.think()` wrapper around OpenRouter (supporting DeepSeek R1 for reasoning, Haiku for speed).
*   [ ] **Memory System v1:** Implement `PostgresVectorStore` for storing emails/events as embeddings.

### 1.2 The "All-Seeing Eye" (Ingestion)
*   [ ] **Universal Inbox:** Build `EmailIngestor` that normalizes Gmail/Outlook messages into a standard `Message` schema.
*   [ ] **Calendar Watcher:** Build `CalendarSync` to fetch events and detect conflicts.
*   [ ] **Smart Triage Agent:** Train a lightweight classifier to tag emails: `[Urgent, Newsletter, Meeting, FYI]`.

### 1.3 The "Live" Dashboard
*   [ ] **Real-Time Feed:** Create a WebSocket connection to the frontend to stream "Ignored newsletter from Substack" logs in real-time.
*   [ ] **"Inbox Zero" View:** A specialized UI showing Aaliyah's triage queue.

---

## 🧠 Sprint 2: The "Cognitive Loop" (Weeks 3-4)
**Goal:** Aaliyah can "Think" and "Draft" responses (but requires approval).

### 2.1 The Reasoning Engine
*   [ ] **Contextual Retrieval:** When viewing an email, auto-fetch the last 3 related emails + 1 relevant PDF from the Knowledge Base.
*   [ ] **Drafting Agent:** Build the LLM prompt chain to draft replies using the user's historical tone (few-shot learning).
*   [ ] **Conflict Resolver:** If a meeting request comes in for a busy slot, draft a specialized "Soft Decline" with 3 alternative times.

### 2.2 The "Human-in-the-Loop" Interface
*   [ ] **Approval Queue:** A Tinder-like UI for the user to "Approve", "Edit", or "Reject" drafts.
*   [ ] **Shadow Mode:** Aaliyah "pretends" to send emails. User reviews the "Simulated Sent" folder to build trust.

### 2.3 Learning from Feedback
*   [ ] **Correction Loop:** If user edits a draft, save the diff as a `Preference` rule ("User prefers 'Cheers' over 'Best'").

---

## ⚡ Sprint 3: The "Action Hero" (Weeks 5-6)
**Goal:** Aaliyah can "Act" autonomously on low-risk tasks.

### 3.1 Autonomous Execution
*   [ ] **Confidence Gating:** Implement logic: `if confidence > 95% AND risk < Low: Auto-Send`.
*   [ ] **Booking Links:** Aaliyah generates unique, one-time booking links for people she drafts emails to.
*   [ ] **Meeting Negotiation:** Aaliyah can handle back-and-forth email scheduling ("Does Tuesday work?" -> "No" -> "How about Wed?") without user input.

### 3.2 Proactive Capabilities
*   [ ] **Morning Briefing:** Aaliyah generates a 7:00 AM summary: "3 urgent emails, 4 meetings, 1 conflict to resolve."
*   [ ] **Meeting Prep:** 15 mins before a call, she emails you a "Cheat Sheet" about the attendee (LinkedIn + Past Emails).

---

## 🎨 Sprint 4: The "Generative Experience" (Weeks 7-8)
**Goal:** The UI becomes a "Living Surface" that adapts to the conversation.

### 4.1 Generative UI
*   [ ] **Dynamic Widgets:** If asked "How is my week?", she renders a React Timeline component, not text.
*   [ ] **Interactive Conflict Resolution:** She renders a drag-and-drop UI to fix double-bookings.

### 4.2 Voice & Mobile
*   [ ] **Voice Mode:** A "Walkie-Talkie" interface for on-the-go commands ("Clear my afternoon").
*   [ ] **WhatsApp/Telegram Integration:** Aaliyah texts you urgent updates ("VIP Client just emailed you").

---

## 🛡️ Sprint 5: The "Enterprise Trust" (Weeks 9-10)
**Goal:** Security, Governance, and Multi-Tenancy hard-scheduling.

### 5.1 Governance Layer
*   [ ] **Policy Engine:** Define rules like "Never book on Fridays" or "Forward all Legal docs to Jones".
*   [ ] **Audit Log:** Immutable record of *why* she took every action.
*   [ ] **RBAC:** Multi-user support (Admin vs. Viewer).

### 5.2 Optimization
*   [ ] **"Sleep" Cycle:** Nightly batch jobs to compress memory and optimize vector indices.
*   [ ] **Performance Tuning:** Ensure <2s latency for all interactions.

---

## 💎 Sprint 6: The "Masterpiece Polish" (Weeks 11-12)
**Goal:** Make it feel magical. Animation, sound, and "Soul".

### 6.1 Personality & Polish
*   [ ] **Micro-Interactions:** Subtle animations when she "thinks" or "types".
*   [ ] **Personality Tuner:** User can adjust Aaliyah's interaction style (Formal vs. Casual vs. Witty).
*   [ ] **"Soul" Injection:** Add small, non-functional touches (e.g., wishing you luck on a big meeting).

---

### 🚀 Immediate Next Step: Sprint 1.1
We are starting **Sprint 1.1: Core Brain Infrastructure**.
This means setting up the `Brain` service and the `EmailIngestor`.
