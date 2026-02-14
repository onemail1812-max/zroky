import { create } from "zustand"

import { getCalendarConflicts, getInbox, getStats, getStatus, syncCalendar, syncInbox } from "@/lib/aaliyah/api"

export interface InboxItem {
  id: string
  provider: string
  external_message_id: string
  thread_id?: string | null
  sender?: string | null
  subject?: string | null
  snippet: string
  received_at?: string | null
  category: string
  priority: string
  is_noise: boolean
  is_read?: boolean
  confidence?: string | null
  reasoning?: string | null
  labels?: string[]
}

interface LastSyncState {
  gmail: string | null
  calendar: string | null
}

interface SystemState {
  status: "idle" | "thinking" | "acting" | "error"
  lastSync: LastSyncState
  activeTask: string | null
  triagedCount: number
  queuedCount: number
  pendingApprovals: number
  escalations: number
  calendarConflicts: number
  inboxItems: InboxItem[]
  fetchStatus: () => Promise<void>
  fetchInbox: () => Promise<void>
  triggerSync: () => Promise<void>
  setThinking: (task: string) => void
  setIdle: () => void
}

function normalizeStatus(value: string | undefined): SystemState["status"] {
  if (value === "thinking" || value === "acting" || value === "error" || value === "idle") return value
  return "idle"
}

export const useSystemStore = create<SystemState>((set) => ({
  status: "idle",
  lastSync: { gmail: null, calendar: null },
  activeTask: null,
  triagedCount: 0,
  queuedCount: 0,
  pendingApprovals: 0,
  escalations: 0,
  calendarConflicts: 0,
  inboxItems: [],

  fetchStatus: async () => {
    try {
      const [statusData, statsData] = await Promise.all([getStatus(), getStats()])
      set({
        status: normalizeStatus(statusData?.status),
        activeTask: typeof statusData?.active_task === "string" ? statusData.active_task : null,
        lastSync: {
          gmail: typeof statusData?.last_sync?.gmail === "string" ? statusData.last_sync.gmail : null,
          calendar: typeof statusData?.last_sync?.calendar === "string" ? statusData.last_sync.calendar : null,
        },
        triagedCount: Number(statsData?.triaged_count || 0),
        queuedCount: Number(statsData?.queued_count || 0),
        pendingApprovals: Number(statsData?.pending_approvals || 0),
        escalations: Number(statsData?.escalations || 0),
        calendarConflicts: Number(statsData?.calendar_conflicts || 0),
      })
    } catch {
      set({ status: "error" })
    }
  },

  fetchInbox: async () => {
    try {
      const data = await getInbox({ limit: 30, include_noise: false })
      const items = Array.isArray(data?.items) ? (data.items as InboxItem[]) : []
      set({ inboxItems: items })
    } catch {
      set({ inboxItems: [] })
    }
  },

  triggerSync: async () => {
    try {
      await Promise.all([syncInbox({ max_results: 40 }), syncCalendar({ window_days: 7, buffer_minutes: 15 })])
      const conflicts = await getCalendarConflicts(50)
      set({ calendarConflicts: Number(conflicts?.count || 0) })
    } catch {
      // Keep UI responsive, errors are surfaced by fetchStatus.
    } finally {
      await Promise.all([
        (useSystemStore.getState().fetchStatus?.() || Promise.resolve()),
        (useSystemStore.getState().fetchInbox?.() || Promise.resolve()),
      ])
    }
  },

  setThinking: (task) => set({ status: "thinking", activeTask: task }),
  setIdle: () => set({ status: "idle", activeTask: null }),
}))
