# Aaliyah Executive Assistant - End-to-End Sprint Plan

This sprint plan addresses the complete integration of Aaliyah's intelligence engine with the Zroky frontend, aligning everything seamlessly with the "Trust-First" and "Aesthetics-First" blueprint.

## Phase 1: Live Neural Sync & Triage UI 
**Goal:** Connect abstract frontend UI counters and feeds to the real-time AI background sync pipeline.
1. **Sidebar Counters (`LeftPanel.tsx` / `QuickFocus.tsx`)**
   - Wire up `api.getCounts()` so the sidebar accurately reflects real-time database counts (Priority, Needs Reply, Approvals).
2. **Dynamic Inbox Rendering**
   - Connect the main Workspace feed to `api.getThreads(queue)` instead of dummy data.
   - Map Aaliyah's triaged JSON outputs to stunning Frontend UI cards.
3. **SSE Connection (Live Feed)**
   - Wire `api.getLiveToken()` into `WorkspaceShell.tsx` and subscribe to `/aaliyah/live/stream`.
   - Show live glassmorphism toast when a new Priority email arrives.

## Phase 2: The "Send" Gate & Draft Engine
**Goal:** Implement the Human-in-the-Loop strict "Approve & Send" mechanism.
1. **Draft Transparency UI**
   - Display Aaliyah's reasoning above drafts (e.g., *"Matched your 'Direct' tone settings"*).
2. **Review & Action Flow**
   - Connect "Approve & Send" button to `api.sendDraft()`.
   - Connect inline text editor to `api.updateDraft()` before sending.
   - Enforce the "No Auto-Send" rule, locking out automatic dispatching unless in Safe Mode payload limits.

## Phase 3: Morning Protocol (Briefing)
**Goal:** Replicate the elite executive assistant morning walk-through.
1. **Briefing Card**
   - Render the contextual morning view generated from backend `api.getBriefing()`.
   - Include counts of meetings, urgent follow-ups, and priority items awaiting review.

## Phase 4: Meeting Intelligence & Brain Refinement
**Goal:** Ensure Aaliyah handles calendar context perfectly.
1. **Cheat Sheet Generation**
   - Wire up the UI for `api.getUpcomingMeetings()`.
   - Provide a button to fetch `api.getEventDetails(eventId)` which includes the AI prep agent context.
2. **Edge Cases & Error States**
   - Handle revoked tokens/unauthorized states gracefully with inline reconnect UI.

---
*Created by Antigravity in alignment with the Zroky Blueprint. Execution starts Phase 1 immediately.*
