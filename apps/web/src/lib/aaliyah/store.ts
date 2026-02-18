import { create } from "zustand"
import { getCalendarConflicts, getCounts, getInbox, getStats, getStatus, getThreads, syncCalendar, syncInbox } from "@/lib/aaliyah/api"
import { connectorService, ConnectionHealthResponse, ConnectionHealthData } from "@/services/connector.service"

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
  requires_approval?: boolean
  draft?: any
}

interface LastSyncState {
  gmail: string | null
  calendar: string | null
}

interface ActionLog {
  timestamp: string;
  action: string;
  details: string;
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
  isBackendConnected: boolean
  isLiveOffline: boolean
  connectionHealth: ConnectionHealthData | null
  actionLogs: ActionLog[]
  fetchStatus: () => Promise<void>
  fetchInbox: (queue?: string) => Promise<void>
  fetchHealth: () => Promise<void>
  triggerSync: () => Promise<void>
  setThinking: (task: string) => void
  setIdle: () => void
  setIsLiveOffline: (val: boolean) => void
  addLog: (action: string, details: string) => void
}

function normalizeStatus(value: string | undefined): SystemState["status"] {
  if (value === "thinking" || value === "acting" || value === "error" || value === "idle") return value
  return "idle"
}

export const useSystemStore = create<SystemState>((set, get) => ({
  status: "idle",
  lastSync: { gmail: null, calendar: null },
  activeTask: null,
  triagedCount: 0,
  queuedCount: 0,
  pendingApprovals: 0,
  escalations: 0,
  calendarConflicts: 0,
  inboxItems: [],
  isBackendConnected: true,
  isLiveOffline: false,
  connectionHealth: null,
  actionLogs: [],

  fetchHealth: async () => {
    try {
      const response = await connectorService.getHealth();
      if (response && response.status === 'ok') {
        set({ connectionHealth: response.data });
      }
    } catch (e) {
      console.error("Failed to fetch health", e);
    }
  },

  fetchStatus: async () => {
    try {
      const [statusData, statsData] = await Promise.all([getStatus(), getCounts()])
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
        isBackendConnected: true,
      })
    } catch (e) {
      console.error("Backend fetchStatus failed", e)
      set({ status: "error", isBackendConnected: false })
    }
  },

  fetchInbox: async (queue?: string) => {
    try {
      const data = await getThreads(queue, 30)
      const items = Array.isArray(data?.items) ? (data.items as InboxItem[]) : []
      set({ inboxItems: items, isBackendConnected: true })
    } catch (e) {
      console.error("Backend fetchInbox failed", e)
      set({ inboxItems: [], isBackendConnected: false })
    }
  },

  triggerSync: async () => {
    try {
      // 1. Check health first
      await get().fetchHealth();
      const health = get().connectionHealth;
      const logs = [...get().actionLogs];

      const tasks = [];

      // 2. Email Blocking Rule
      if (health?.email_accessible) {
        tasks.push(syncInbox({ max_results: 40 }));
      } else {
        logs.unshift({
          timestamp: new Date().toISOString(),
          action: "Blocked: Inbox Sync",
          details: "Email provider not healthy or accessible."
        });
      }

      // 3. Calendar Blocking Rule
      if (health?.calendar_accessible) {
        tasks.push(syncCalendar({ window_days: 7, buffer_minutes: 15 }));
      } else {
        logs.unshift({
          timestamp: new Date().toISOString(),
          action: "Blocked: Calendar Sync",
          details: "Calendar provider not healthy or accessible."
        });
      }

      set({ actionLogs: logs });

      if (tasks.length > 0) {
        await Promise.all(tasks);
        const conflicts = await getCalendarConflicts(50)
        set({ calendarConflicts: Number(conflicts?.count || 0), isBackendConnected: true })
      }
    } catch {
      set({ isBackendConnected: false })
    } finally {
      await Promise.all([
        (get().fetchStatus?.() || Promise.resolve()),
        (get().fetchInbox?.() || Promise.resolve()),
      ])
    }
  },

  setThinking: (task) => set({ status: "thinking", activeTask: task }),
  setIdle: () => set({ status: "idle", activeTask: null }),
  setIsLiveOffline: (val) => set({ isLiveOffline: val }),
  addLog: (action, details) => {
    const logs = [...get().actionLogs];
    logs.unshift({
      timestamp: new Date().toISOString(),
      action,
      details
    });
    // Keep only last 50 logs
    set({ actionLogs: logs.slice(0, 50) });
  }
}))
