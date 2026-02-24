# 🌟 Aaliyah: The "Masterpiece" Executive Architecture
**Role:** World-Class AI Executive Assistant (EVA)
**Objective:** To be indistinguishable from a top-tier human Executive Assistant in reliability, proactivity, and context awareness.

---

## 🏗️ 1. The Core "Brain" Architecture (Cognitive Layer)
*   **Tiered Intelligence:**
    *   **Level 1 (Fast):** fine-tuned 8B model (e.g. Llama 3) for instant classification (Spam/Urgent/Routine) & simple replies. >99% uptime, <200ms latency.
    *   **Level 2 (Deep):** DeepSeek R1 / Claude 3.5 Sonnet for complex reasoning, negotiation, conflict resolution, and nuanced drafting.
    *   **Level 3 (Deterministic):** Python-based rules engine for absolute constraints (e.g., "Never book meetings on Friday after 2 PM").
*   **Dual-State Memory:**
    *   **Hot State:** Redis cache of the user's *current* context (location, mood, active project, immediate deadlines).
    *   **Cold State:** Vector DB + Knowledge Graph of *historical* context (relationships, preferences, long-term goals).
*   **The "Inner Monologue" Loop:**
    Before sending ANY message, Aaliyah runs a silent `Thought -> Critic -> Refine` loop:
    1.  *Draft:* "Hi Steve, Tuesday works."
    2.  *Critic:* "Too blunt. User prefers warmth. Also, check conflict with the dentist appt."
    3.  *Refine:* "Hi Steve! Tuesday afternoon is great. Would 2 PM work for you?"

## 📨 2. The "Inbox Zero" Engine (Communication Layer)
*   **Polyglot Ingestion:** Seamlessly connects to Gmail, Outlook, Slack, Discord, and WhatsApp.
*   **Smart Triage & Labeling:**
    *   **VIP Detection:** Identifying investors, key clients, or family members dynamically based on interaction frequency/sentiment (not just static lists).
    *   **Action Extraction:** Automatically parsing "Send me the deck by Friday" into a `Task` object linked to a `Due Date`.
*   **The "Drafting Board":**
    *   **Style Mirroring:** Analyzes your last 50 sent emails to mimic your exact tone, greeting style, and sign-off.
    *   **Contextual RAG:** When replying to "Project X", automatically pulls the latest PDF/Link about Project X into the context window for accurate answers.
    *   **Confidence Gating:**
        *   High Confidence (>95%): Auto-drafts & notifies "Ready to send".
        *   Low Confidence (<70%): Asks clarification questions ("Do we still offer the 20% discount?").

## 🗓️ 3. The "Time Lord" (Calendar & Scheduling Layer)
*   **Dynamic Booking Links:**
    *   Instead of sending a static Calendly link, Aaliyah generates *ephemeral, personalized* booking pages. "Here are 3 slots for *Steve* based on his time zone."
*   **Defensive Scheduling:**
    *   **Buffer Blocks:** Automatically adds 15-min buffers between meetings.
    *   **Focus Time Preservation:** Aggressively blocks out "Deep Work" chunks if your week is getting too fragmented.
*   **The "Meeting Prep" Agent:**
    *   15 minutes before *every* meeting, Aaliyah sends a "Cheat Sheet":
        *   *Who:* LinkedIn Summary of the attendee.
        *   *History:* Summary of last 3 emails/meetings with them.
        *   *Goal:* What specific outcome do we need from this call?

## 👁️ 4. The "Live" Perception System (Real-Time Layer)
*   **"Always-On" Background Workers:**
    *   Aaliyah doesn't sleep. She runs a `sync_worker` every 60 seconds to check for cancellations, new invites, or urgent fires.
*   **The Dashboard Feed:**
    *   A specialized UI component showing exactly what she is doing *right now*:
    *   *"Creating brief for 10am meeting..."*
    *   *"Negotiating time with Sarah..."*
    *   *"Waiting for your approval on the Q3 Report..."*
*   **Proactive Alerts:**
    *   "Heads up: You have back-to-back meetings tomorrow with no travel time. Should I move one?"

## 🔄 5. The "Self-Driving" Learning Loop (Evolution Layer)
*   **Feedback Integration:**
    *   If you *edit* a draft she wrote, she captures the "Diff" (Difference).
    *   She categorizes the edit: "Tone Correction", "Fact Correction", "Preference Change".
    *   She updates her `UserPreference` vector embedding immediately. "Note: User prefers 'Best regards' over 'Cheers' for external clients."
*   **Nightly "Dreaming":**
    *   Post-processing analysis of the day's decisions to optimize weights for tomorrow.

## 🛡️ 6. Enterprise-Grade Governance (Trust Layer)
*   **"Shadow Mode" (Training Wheels):**
    *   New capabilities launch in "Shadow Mode"—she *proposes* actions but cannot *execute* until you click "Approve".
    *   Once a specific task type (e.g., "Schedule Internal Sync") reaches 50 consecutive approvals, she requests "Autonomy" for that specific task type.
*   **Audit Trails:**
    *   Every single action, decision, and thought process is logged immutably.
    *   "Why did you decline that meeting?" -> "Because it conflicted with your 'No Meetings on Fridays' rule (Rule ID: #882)."

## 🎨 7. The Experience (UX/UI Layer)
*   **Voice-First Mode:**
    *   A mobile interface where you can just talk: "Aaliyah, clear my afternoon, I'm not feeling well." -> She handles cancellations, drafts apologies, and blocks the calendar.
*   **Generative UI:**
    *   She doesn't just send text. She sends *interactive widgets*.
    *   "Here are the 3 conflicts." -> Renders a mini-timeline component where you can drag-and-drop to resolve.

---

### 🚀 Immediate Action Plan (Phase 1 Build)
To start building this masterpiece, we focus on the **"Sensory & Action" Core**:
1.  **Architecture:** Set up the `Service` layer in `apps/api` with the `Brain` (LangGraph) and `Memory` (Postgres+Vector).
2.  **Ingestion:** Build the `EmailManager` to securely ingest and normalize data from Gmail/Outlook.
3.  **The Loop:** Create the `AaliyahOrchestrator`—the main "Thinking Loop" that decides if an incoming email needs a reply, a calendar action, or an archive.
