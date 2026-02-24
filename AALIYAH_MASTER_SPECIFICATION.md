# Aaliyah Executive Assistant - Master Product Specification

This document serves as the final, comprehensive specification for the "Aaliyah" AI Executive Assistant, incorporating all user-defined features and architectural requirements for a high-performance, jargon-free, and productive experience.

---

## 1. Core Architecture (The Intelligence Stack)

### 1.1 Backend: Agentic Orchestration
*   **LangGraph Implementation:** Moving away from static Python loops to a state-managed Agent.
    *   **Reasoning Loop:** The agent follows a "Read -> Analyze -> Self-Correct -> Execute" cycle.
    *   **Self-Correction:** If the AI detects a broken link or missing info in an email, it autonomously attempts to find it or drafts a query to the sender for clarification.
*   **Instructor & PydanticAI:** All LLM outputs are enforced via strict Pydantic schemas.
    *   **Benefit:** Eliminates "500 Internal Server Errors" caused by unpredictable LLM formatting. Accuracy is 100% via type-safe extraction.

### 1.2 Frontend: Performance & UX
*   **React Query:** Used for aggressive caching and state management. Ensures the UI feels lightning-fast without redundant server fetches.
*   **Native SSE Streaming:** Real-time "Thinking..." states and AI reply generation using Server-Sent Events ($0 cost, ultra-low latency).

### 1.3 Memory & Knowledge (RAG)
*   **Local Context (ChromaDB):** A vector database stores past emails, chats, and documents.
*   **"Ask My Inbox":** Natural language queries like *"What were the payment terms in the PDF Rashmi sent last week?"* will return exact answers from the vault.

---

## 2. Product Experience (Inbox Interaction)

### 2.1 The "Inline Assistant" Flow
*   **Simultaneous Processing:** As soon as an email arrives/is opened, Aaliyah analyzes it in parallel.
*   **The Magic Box:** A clean card components appears directly *below* the raw email text.
    *   **✨ Aaliyah's Take:** A 1-sentence executive summary of the email's intent.
    *   **Draft Ready:** A pre-written, high-quality response.
    *   **Actions:** `[Send This Reply]` | `[Edit This Draft]` | `[Discard]`.

### 2.2 Inbox Chat (Universal Commander)
*   **Natural Language Commander:** Replace traditional search with a conversational interface. 
*   **Assistant-UI & Lobe Chat Integration:**
    *   **Visual Badges:** Instead of loading spinners, see badges like `[Calendar Checked: Slot Found] 🗓️`.
    *   **Artifacts:** If AI reads an Excel sheet, an interactive mini-spreadsheet appears in-chat for direct editing.

### 2.3 Advanced Attachment Handling
*   **One-Tap Document Picker (📎):** Modern view showing "Recent & Relevant Files" based on the current context.
*   **Universal Drag-and-Drop:** Drop files anywhere on the draft card to auto-attach and update the reply text.

---

## 3. Data & Viewer Stack (Split-Screen UX)

### 3.1 Integrated Document Viewers
*   **PDF Viewer:** Built-in viewer on the right side of the screen.
    *   **AI Overlay:** Ask *"Explain clause 5"* while the PDF is open.
*   **Excel/Sheet Preview:** Interactive grid view with **Instant Math** (e.g., "What is the sum of Column B?").
*   **Image Previews:** Expandable images directly below emails/chats.

### 3.2 Workspace Shell
*   **Split Screen:** Left side for Inbox/Chat, Right side for Document/Excel viewer. **No Redirection**—everything stays in one window.

---

## 4. Smart Triage & Navigation

### 4.1 The Executive Left Panel (Categories)
Aaliyah categorizes every email into 4 high-value queues:
1.  🔴 **Priority:** Business-critical items (Payments, Deals, Bugs) marked with a **Sparkle Icon ✨**.
2.  💬 **Needs Reply:** Conversations where a response is required from the user.
3.  ✅ **Approvals:** AI-generated drafts waiting for a final "Go" from the owner.
4.  ⏳ **Followup:** Emails you sent where the other party has not replied yet.

### 4.2 Noise Cleaning
*   Newsletters and promotional content are moved automatically to a "Cleaned" background storage, keeping the main view 100% productive.

---

## 5. Executive Journal (Memory & History)

### 5.1 Meeting Intelligence
*   **Conversational Notes:** Outcomes delivered via Inbox Chat with interactive analysis.
*   **Meeting History (Date-wise):** A "Memory" tab in the Left Panel allows users to browse past meeting recaps chronologically.
*   **Actionable Tasks:** Buttons to convert meeting points into live workspace tasks.

### 5.2 Global Mission Store (Daily Reset)
*   **Daily Reset:** The main chat box resets every 24 hours to maintain 100% performance (no slowness).
*   **Action Log:** Previous conversations are archived into a searchable "Action Log" folder.
*   **Threaded Memory:** Email-specific conversations are saved permanently *within* that email thread for a "Single Source of Truth."

### 5.3 Authentic Ghostwriting (Humanizer Integration)
*   **AI Pattern Removal:** Uses advanced filtering (based on `blader/humanizer`) to strip away signs of AI-generated writing (e.g., specific buzzwords, excessive politeness, or "bot-like" sentence structures).
*   **Executive Decisiveness:** Rewrites drafts to use active voice and direct language, matching a top business owner's tone.
*   **Zero-Fluff Filter:** Automatically identifies and removes "filler" phrases, making emails shorter and more impactful.

---

## 6. Actionable Workflows
*   **One-tap Calendar Sync:** AI detects meeting requests and provides a `[Book for 2 PM Tomorrow]` button.
*   **Automated Labeling:** AI creates and applies semantic labels without manual rules.

---

## 7. Triple-Layer Performance Strategy (Speed, Accuracy, Perfection)

### 7.1 Speed (The "Instant" Experience)
*   **Predictive Ghostwriting:** AI generates drafts in the background as soon as an email is received, before the user even opens it.
*   **Native SSE Streaming:** Uses Server-Sent Events for real-time response generation, ensuring the first word appears in <200ms.
*   **Aggressive Caching:** React Query manages client-side state to eliminate redundant server requests and ensure instant tab switching.

### 7.2 Accuracy (The "Zero-Hallucination" Guard)
*   **Instructor Schemas:** LLM outputs are validated against strict Pydantic schemas. Invalid data is rejected and auto-retried before reaching the UI.
*   **Grounded RAG (Vector Search):** AI responses are anchored in actual email and document data from ChromaDB, preventing "made-up" facts.
*   **Reasoning-First Triage:** Utilizes models like DeepSeek-R1 (Reasoning Mode) to analyze complex email contexts before categorization.

### 7.3 Perfection (The "Elite Assistant" Polish)
*   **Generative UI (Contextual Cards):** UI components adapt to the content (e.g., meeting cards for schedule requests, grid views for invoices).
*   **Humanizer Polish:** Every AI draft passes through a refinement filter to ensure a direct, executive, and non-robotic tone.
*   **Human-in-the-Loop Gateway:** The user remains the final decision-maker with easy `[Approve/Edit/Discard]` controls for every action.

---

## 8. Enterprise Readiness & "Hack-Proof" Security

### 8.1 Global Security Standards
*   **AES-GCM Token Encryption:** All external OAuth tokens (Google/Microsoft) are encrypted at rest using AES-256-GCM. Decryption only happens in-memory during active requests.
*   **Identity First:** Integration with enterprise-grade identity providers (e.g., Clerk) ensuring secure sessions, 2FA, and session management.
*   **No Plaintext Secrets:** Zero hardcoded API keys. All configuration is managed via strictly isolated environment variables.

### 8.2 Reliability & Scale
*   **Rate Limiting:** Protects the API from brute-force and DDoS attacks.
*   **Transaction Auditing:** Every action taken by Aaliyah (Drafting, Sorting, Sending) is logged with a timestamp and reason for full audit transparency.
*   **Stateless Scaling:** The backend is designed as a stateless integration layer, allowing it to scale horizontally for high-traffic enterprise environments.

### 8.3 Mobile & Tablet Responsiveness
*   **Mobile-First Design:** The entire workspace is built with Tailwind CSS responsive utilities. 
*   **Adaptive Layouts:** 
    *   **Desktop:** Sidebar + Thread List + Reader/Chat View.
    *   **Tablet:** Collapsible Sidebar with a Split-Screen view for mails and drafts.
    *   **Mobile:** Focused single-column view with swipe gestures for quick approvals and a Bottom Navigation Bar.
