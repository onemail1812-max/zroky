# Aaliyah Chat Workspace: The Definitive Specification
> **Role:** Enterprise Executive Assistant (EVA)
> **Core Philosophy:** "Operational Transparency." Aaliyah is not a chatbot; she is a workspace for decision-making.

---

## 1. High-Level Architecture
The workspace follows a strict **Three-Part Productivity Layout** designed to minimize context switching.

| Component | Width | Purpose |
| :--- | :--- | :--- |
| **1. Global Rail** | `72px` (Fixed) | **Navigation.** High-level context switching (Home, Agent, Settings). |
| **2. Operational Sidebar** | `320px` (Resizable) | **Context.** "What is the state of my world right now?" (Briefing, Calendar, Tasks). |
| **3. Notification Stream** | `Fluid` (Rest) | **Action.** Aaliyah's proactive feed of updates, drafts, and approval requests. |

---

## 2. Component Breakdown

### A. The Global Rail (Navigation)
A slim, persistent strip on the far left.
*   **Visuals:** White background, thin right border (`#E5E7EB`). Icons are `20px` stroke `1.5` (Slate 500).
*   **Items (Top):**
    1.  **Home:** Dashboard overview.
    2.  **AaliyahIcon:** The active agent view.
*   **Items (Bottom):**
    1.  **Add Context (+):** Create/Switch profiles (Personal/Work).
    2.  **Settings (Cog):** Integrations & Preferences.

### B. The Operational Sidebar (Left Panel)
This column provides **Situational Awareness**. It answers "What's happening?" without you asking.

#### **Section 1: The "Now" (Header)**
*   **Aaliyah Profile:** Avatar + Role ("Executive Assistant").
*   **Live Metrics:**
    *   *Sync Status:* "Gmail synced 2m ago."
    *   *Queue:* "Processing 3 items..." (Real-time count).
    *   *Status Dot:* 🟢 Active / 🟡 Thinking / 🔴 Error.

#### **Section 2: Daily Briefing**
*   **Briefing Card:** "Today's Briefing." Click to expand a modal summary of the day.
*   **Calendar Card:** "Next: 2pm - Marketing Sync." Shows countdown. Click to view full day.

#### **Section 3: Task Timeline**
A chronological list of Aaliyah's work.
*   **Grouping:** `Today` / `Yesterday` / `Earlier`.
*   **Items:** "Drafted reply to Steve", "Scheduled Q3 Review".
*   **Status Indicators:**
    *   🟡 **Waiting:** Needs user approval.
    *   🟢 **Active:** Currently executing.
    *   ⚪ **Done:** Completed and logged.

#### **Section 4: Approvals Queue (Sticky Bottom)**
*   **Purpose:** The user's "Inbox" for decisions.
*   **Counter:** "Pending: 3".
*   **List:** Compact list of pending drafts/invites. Clicking one jumps to it in the Stream.

---

### C. The Notification Stream (Main Stage)
The core interaction surface. **Aaliyah Leads, You Guide.**

#### **1. The "Stream" Metaphor**
*   **Not a Chatbot:** No continuous bubbles. Interaction is **Event-Based**.
*   **Structure:** A linear feed of "Updates" and "Cards".
*   **Timeline Headers:** Sticky headers text ("Today", "Yesterday") separate the days.

#### **2. The Draft Card (Core Artifact)**
When Aaliyah drafts an email or calendar invite, it appears as a **Card**.
*   **Header:** "Draft Ready" | "To: Steve" | "Sub: Update".
*   **Body:** The actual content of the email (Pre-filled).
*   **Actions:**
    1.  **Approve:** Instantly sends the email. Card turns Green (Approved).
    2.  **Edit (Inline):** Click "Edit" -> Body turns into a `Textarea`. User fixes typos -> Click "Save".
    3.  **Reject:** Card turns Red (Rejected). Aaliyah asks for guidance.

#### **3. User Interaction**
*   **Input Bar:** Simple text field at the bottom.
*   **Placeholder:** "Reply with an approval or guidance..."
*   **Behavior:** User types "Move the meeting to 3pm." -> Aaliyah updates the Draft Card -> User clicks "Approve".

---

## 3. Visual Polish Guidelines
*   **Typography:** `Inter`. High legibility.
    *   *Headings:* Semibold, Tracking `-0.02em`.
    *   *Body:* Regular, `14px`, `1.5` Line Height.
*   **Colors (Enterprise):**
    *   *Background:* `#FAFAFA` (Zinc 50).
    *   *Surface:* `#FFFFFF` (White).
    *   *Text:* `#18181B` (Zinc 900).
    *   *Muted:* `#71717A` (Zinc 500).
    *   *Accent:* `#18181B` (Black) for primary buttons. NO bright blue/green except for specific status dots.
*   **Animation:**
    *   **Entrance:** Cards slide up (`y: 20 -> 0`, `opacity: 0 -> 1`).
    *   **Updates:** "Reviewing..." spinner must be subtle, not blocking.

---

## 4. Implementation Checklist
*   [x] **Layout:** `WorkspaceShell` (Flexbox Rail/Sidebar/Main).
*   [x] **Sidebar:** `OperationalSidebar` with Mock Data.
*   [x] **Stream:** `NotificationStream` with Draft Cards.
*   [x] **Interaction:** "Edit Draft" mode is fully implemented.
*   [ ] **Backend Hookup:** Connect `StreamItem` to real API data (Next Step).
