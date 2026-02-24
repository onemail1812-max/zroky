import { create } from "zustand"
import { getCalendarConflicts, getCounts, getInbox, getStats, getStatus, getThreads, syncCalendar, syncInbox, getSyncStatus, triggerInitialSync as apiTriggerInitialSync, type SyncProgressItem } from "@/lib/aaliyah/api"
import { connectorService, ConnectionHealthResponse, ConnectionHealthData } from "@/services/connector.service"
import { toast } from "react-hot-toast"

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
  activeView: "inbox" | "memory" | "action_log"
  activeTriageQueue: "priority" | "reply" | "approvals" | "followup" | "all"
  triagedCount: number
  queuedCount: number
  pendingApprovals: number
  escalations: number
  calendarConflicts: number
  inboxItems: InboxItem[]
  isBackendConnected: boolean
  isLiveOffline: boolean
  connectionHealth: ConnectionHealthData | null
  isSyncing: boolean
  syncError: string | null
  actionLogs: ActionLog[]
  // Progressive initial sync state
  syncProgress: {
    phase: "idle" | "queued" | "syncing" | "done" | "partial"
    inbox: SyncProgressItem | null
    calendar: SyncProgressItem | null
    startedAt: string | null
  }
  mainChatFeed: any[]
  mainChatLastReset: number
  threadCache: Record<string, any>
  setMainChatFeed: (feed: any[] | ((prev: any[]) => any[])) => void
  checkDailyReset: () => void
  getThreadCached: (threadId: string) => any | undefined
  setThreadCache: (threadId: string, data: any) => void
  fetchStatus: () => Promise<void>
  fetchInbox: (queue?: string) => Promise<void>
  fetchHealth: () => Promise<ConnectionHealthData | null>
  triggerSync: () => Promise<void>
  triggerInitialSync: () => Promise<void>
  runPreflight: () => Promise<any>
  resetSyncError: () => void
  dismissSyncProgress: () => void
  setThinking: (task: string) => void
  setIdle: () => void
  setIsLiveOffline: (val: boolean) => void
  addLog: (action: string, details: string) => void
  setActiveView: (view: "inbox" | "memory" | "action_log") => void
  setActiveTriageQueue: (queue: "priority" | "reply" | "approvals" | "followup" | "all") => void
  updateCountsFromPayload: (payload: any) => void
}

function normalizeStatus(value: string | undefined): SystemState["status"] {
  if (value === "thinking" || value === "acting" || value === "error" || value === "idle") return value
  return "idle"
}

export const useSystemStore = create<SystemState>((set, get) => ({
  status: "idle",
  lastSync: { gmail: null, calendar: null },
  activeTask: null,
  activeView: "inbox",
  activeTriageQueue: "all",
  triagedCount: 0,
  queuedCount: 0,
  pendingApprovals: 0,
  escalations: 0,
  calendarConflicts: 0,
  inboxItems: [],
  isBackendConnected: true,
  isLiveOffline: false,
  connectionHealth: null,
  isSyncing: false,
  syncError: null,
  actionLogs: [],
  syncProgress: {
    phase: "idle",
    inbox: null,
    calendar: null,
    startedAt: null,
  },
  mainChatFeed: [],
  mainChatLastReset: Date.now(),
  threadCache: {},

  setMainChatFeed: (feed) => set((state) => ({
    mainChatFeed: typeof feed === 'function' ? feed(state.mainChatFeed) : feed
  })),

  checkDailyReset: () => {
    const { mainChatLastReset, mainChatFeed, addLog } = get()
    const now = Date.now()
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000

    if (now - mainChatLastReset > TWENTY_FOUR_HOURS) {
      if (mainChatFeed.length > 0) {
        // Archive the chat
        const messageCount = mainChatFeed.filter(i => i.type === 'user-command' || i.type === 'response').length
        addLog("Daily Chat Archive", `Archived ${messageCount} messages from the daily stream.`)
      }
      set({ mainChatFeed: [], mainChatLastReset: now })
    }
  },

  getThreadCached: (threadId: string) => get().threadCache[threadId],

  setThreadCache: (threadId: string, data: any) => set((state) => ({
    threadCache: { ...state.threadCache, [threadId]: data }
  })),

  fetchHealth: async () => {
    try {
      const response = await connectorService.getHealth();
      if (response && response.status === 'ok') {
        set({ connectionHealth: response.data, isBackendConnected: true });
        return response.data;
      }
      return null;
    } catch (e) {
      console.error("Failed to fetch health", e);
      set({ isBackendConnected: false });
      return null;
    }
  },

  fetchStatus: async () => {
    try {
      const [statusData, statsData] = await Promise.all([getStatus(), getCounts()])
      const health = get().connectionHealth
      const status = (!health || !health.email_accessible) ? "idle" : normalizeStatus(statusData?.status)

      set({
        status,
        activeTask: status === "idle" ? null : (typeof statusData?.active_task === "string" ? statusData.active_task : null),
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
    } catch (e: any) {
      console.error("Backend fetchStatus failed", e)
      set({ status: "error", isBackendConnected: false })
      if (!get().isLiveOffline) toast.error(`Status sync failed: ${e.message || 'Server offline'}`)
    }
  },

  fetchInbox: async (queue?: string) => {
    try {
      const data = await getThreads(queue, 30)
      const items = Array.isArray(data?.items) ? (data.items as InboxItem[]) : []
      set({ inboxItems: items, isBackendConnected: true })
    } catch (e: any) {
      console.error("Backend fetchInbox failed", e)
      set({ inboxItems: [], isBackendConnected: false })
      if (!get().isLiveOffline) toast.error(`Inbox fetch failed: ${e.message || 'API error'}`)
    }
  },

  runPreflight: async () => {
    const { runPreflight } = await import("@/lib/aaliyah/api");
    try {
      const res = await runPreflight();
      return res;
    } catch (e: any) {
      console.error("Preflight check failed", e);
      throw e;
    }
  },

  /**
   * triggerInitialSync — called right after OAuth completes.
   * 1. Fires POST /sync/initial → returns immediately with job IDs.
   * 2. Starts polling GET /sync/status every 3s.
   * 3. Updates syncProgress as partial data arrives.
   * 4. Stops polling when both inbox + calendar are done.
   */
  triggerInitialSync: async () => {
    set({
      syncProgress: {
        phase: "queued",
        inbox: null,
        calendar: null,
        startedAt: new Date().toISOString(),
      }
    })

    try {
      await apiTriggerInitialSync()
      toast.success("Initial background sync started.")
    } catch (err: any) {
      console.error("Initial sync trigger failed", err)
      set(prev => ({ syncProgress: { ...prev.syncProgress, phase: "done" } }))
      toast.error(`Sync failed to start: ${err.message}`)
      return
    }

    set(prev => ({ syncProgress: { ...prev.syncProgress, phase: "syncing" } }))

    // Poll status every 3 seconds until both services report done
    let attempts = 0
    const MAX_POLLS = 40 // 2 minutes max
    const poll = async () => {
      if (attempts++ > MAX_POLLS) {
        set(prev => ({ syncProgress: { ...prev.syncProgress, phase: "done" } }))
        return
      }

      try {
        const status = await getSyncStatus()
        const inboxDone = status.inbox.status === "done"
        const calendarDone = status.calendar.status === "done"
        const phase = inboxDone && calendarDone ? "done" : (inboxDone || calendarDone ? "partial" : "syncing")

        set({
          syncProgress: {
            phase,
            inbox: status.inbox,
            calendar: status.calendar,
            startedAt: get().syncProgress.startedAt,
          }
        })

        // If inbox has data, refresh the UI feed
        if (status.inbox.count > 0) {
          get().fetchStatus?.().catch(() => { })
          get().fetchInbox?.().catch(() => { })
        }

        if (!inboxDone || !calendarDone) {
          setTimeout(poll, 3000)
        }
      } catch (err) {
        console.error("Sync status poll failed", err)
        setTimeout(poll, 5000) // back off on error
      }
    }

    // Start polling after a brief delay
    setTimeout(poll, 2000)
  },

  resetSyncError: () => set({ syncError: null }),

  dismissSyncProgress: () => set({
    syncProgress: { phase: "idle", inbox: null, calendar: null, startedAt: null }
  }),

  triggerSync: async () => {
    if (get().isSyncing) return;
    set({ isSyncing: true, syncError: null });

    try {
      // 1. Check health first
      const health = await get().fetchHealth();
      const logs = [...get().actionLogs];

      // 2. Run Preflight
      try {
        const preflight = await get().runPreflight();
        if (preflight.status !== 'OK') {
          throw new Error(`Preflight failed: ${preflight.status}`);
        }
      } catch (err: any) {
        set({ syncError: `Protocol Preflight: ${err.message}` });
        toast.error(`Preflight failed: ${err.message}`)
      }

      const tasks = [];

      // 3. Email Blocking Rule
      if (health?.email_accessible) {
        tasks.push(syncInbox({ max_results: 40 }));
      } else {
        logs.unshift({
          timestamp: new Date().toISOString(),
          action: "Blocked: Inbox Sync",
          details: "Email provider not healthy or accessible."
        });
      }

      // 4. Calendar Blocking Rule
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
        const results = await Promise.allSettled(tasks); // Settlements so one failure doesn't kill both

        // Find if the sync API actually returned "queued" instead of hanging
        const emailSync = results[0] as any;
        if (emailSync?.status === "fulfilled" && emailSync.value?.status === "queued") {
          toast.success("Sync task queued in background. Waiting for events...")
        }

        const conflicts = await getCalendarConflicts(50);
        set({ calendarConflicts: Number(conflicts?.count || 0), isBackendConnected: true });
      }
    } catch (err: any) {
      console.error("Sync failed", err);
      set({ isBackendConnected: false, syncError: err.message || "Unknown synchronization error" });
      toast.error(`Sync error: ${err.message || 'Unknown'}`)
    } finally {
      await Promise.allSettled([
        get().fetchStatus?.(),
        get().fetchInbox?.(),
      ]);
      set({ isSyncing: false });
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
  },

  setActiveView: (view) => set({ activeView: view }),
  setActiveTriageQueue: (queue) => set({ activeTriageQueue: queue, activeView: "inbox" }),
  updateCountsFromPayload: (payload) => {
    if (!payload) return
    set({
      triagedCount: Number(payload.by_category?.priority || 0) + Number(payload.by_category?.fyi || 0) + Number(payload.by_category?.needs_reply || 0),
      pendingApprovals: Number(payload.by_category?.approvals || 0),
      escalations: Number(payload.by_category?.escalation || 0),
      calendarConflicts: Number(payload.calendar_conflicts || 0),
      queuedCount: Number(payload.drafts || 0), // Mapping drafts to queuedCount for simplicity in the current UI
    })
  },
}))
