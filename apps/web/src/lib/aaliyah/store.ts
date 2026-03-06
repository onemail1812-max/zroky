import { create } from "zustand"
import { getCalendarConflicts, getCounts, getInbox, getStats, getStatus, getThreads, syncCalendar, syncInbox, getSyncStatus, triggerInitialSync as apiTriggerInitialSync, type SyncProgressItem } from "@/lib/aaliyah/api"
import { connectorService, ConnectionHealthResponse, ConnectionHealthData } from "@/services/connector.service"
import { EmailMessage } from "@/services/inbox.service"
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
  draft?: { to?: string; subject?: string; body: string; reasoning?: string }
}

export interface ChatMessageData {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  type?: string;
  payload?: Record<string, unknown>;
  timestamp?: string;
}

export interface SyncPayloadData {
  drafts?: number;
  calendar_conflicts?: number;
  by_category?: {
    // [Audit Fix] Frontend interface now matches Title Case keys from Backend
    "Priority"?: number;
    "Notifications"?: number;
    "Needs Reply"?: number;
    "Approvals"?: number;
    "Follow-ups"?: number;
    [key: string]: number | undefined;
  }
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

export interface AppNotification {
  id: string
  message: string
  type: "success" | "error" | "info" | "warning"
  timestamp: number
  isRead: boolean
}


interface SystemState {
  status: "idle" | "thinking" | "acting" | "error"
  lastSync: LastSyncState
  activeTask: string | null
  activeView: "inbox" | "memory" | "action_log"
  activeTriageQueue: "priority" | "needs_reply" | "approvals" | "follow_ups" | "cleaned" | "all"
  triagedCount: number
  priorityCount: number
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
  notifications: AppNotification[]
  // Progressive initial sync state
  syncProgress: {
    phase: "idle" | "queued" | "syncing" | "done" | "partial"
    inbox: SyncProgressItem | null
    calendar: SyncProgressItem | null
    startedAt: string | null
  }
  mainChatFeed: ChatMessageData[]
  mainChatLastReset: number
  threadCache: Record<string, ChatMessageData[]>
  threadSelection: EmailMessage | null
  unreadQueues: string[]
  isComposeOpen: boolean
  composeData: { to: string; cc: string; bcc: string; subject: string; body: string; threadId?: string } | null
  authError: boolean
  setAuthError: (val: boolean) => void
  setMainChatFeed: (feed: ChatMessageData[] | ((prev: ChatMessageData[]) => ChatMessageData[])) => void
  checkDailyReset: () => void
  getThreadCached: (threadId: string) => ChatMessageData[] | undefined
  setThreadCache: (threadId: string, data: ChatMessageData[]) => void
  openCompose: (data?: Partial<{ to: string; cc: string; bcc: string; subject: string; body: string; threadId: string }>) => void
  closeCompose: () => void
  fetchStatus: (signal?: AbortSignal) => Promise<void>
  fetchInbox: (queue?: string, signal?: AbortSignal) => Promise<void>
  fetchHealth: (signal?: AbortSignal) => Promise<ConnectionHealthData | null>
  triggerSync: () => Promise<void>
  triggerInitialSync: () => Promise<void>
  runPreflight: () => Promise<{ status: string }>
  resetSyncError: () => void
  dismissSyncProgress: () => void
  setThinking: (task: string) => void
  setIdle: () => void
  setIsLiveOffline: (val: boolean) => void
  addLog: (action: string, details: string) => void
  addNotification: (message: string, type: AppNotification["type"]) => void
  markNotificationRead: (id: string) => void
  clearAllNotifications: () => void
  setActiveView: (view: "inbox" | "memory" | "action_log") => void
  setActiveTriageQueue: (queue: "priority" | "needs_reply" | "approvals" | "follow_ups" | "cleaned" | "all") => void
  updateCountsFromPayload: (payload: SyncPayloadData) => void
  setThreadSelection: (thread: EmailMessage | null) => void
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
  priorityCount: 0,
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
  notifications: [],
  syncProgress: {
    phase: "idle",
    inbox: null,
    calendar: null,
    startedAt: null,
  },
  mainChatFeed: [],
  mainChatLastReset: Date.now(),
  threadCache: {},
  threadSelection: null,
  unreadQueues: [],
  isComposeOpen: false,
  composeData: null,
  authError: false,

  setAuthError: (val) => set({ authError: val }),

  setMainChatFeed: (feed) => set((state) => ({
    mainChatFeed: typeof feed === 'function' ? feed(state.mainChatFeed) : feed
  })),

  openCompose: (data) => set({
    isComposeOpen: true,
    composeData: {
      to: data?.to || "",
      cc: data?.cc || "",
      bcc: data?.bcc || "",
      subject: data?.subject || "",
      body: data?.body || "",
      threadId: data?.threadId,
    }
  }),

  closeCompose: () => set({ isComposeOpen: false, composeData: null }),

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

  setThreadCache: (threadId: string, data: ChatMessageData[]) => set((state) => ({
    threadCache: { ...state.threadCache, [threadId]: data }
  })),

  fetchHealth: async (signal?: AbortSignal) => {
    try {
      const response = await connectorService.getHealth(signal);
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

  fetchStatus: async (signal?: AbortSignal) => {
    try {
      const [statusData, statsData] = await Promise.all([getStatus(undefined, signal), getCounts(signal)])
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
        priorityCount: Number(statsData?.priority_count || 0),
        queuedCount: Number(statsData?.queued_count || 0),
        pendingApprovals: Number(statsData?.pending_approvals || 0),
        escalations: Number(statsData?.escalations || 0),
        calendarConflicts: Number(statsData?.calendar_conflicts || 0),
        isBackendConnected: true,
      })
    } catch (err: unknown) {
      const e = err as Error;
      console.error("Backend fetchStatus failed", e)
      set({ status: "error", isBackendConnected: false })
      if (!get().isLiveOffline) toast.error("Aaliyah is currently unavailable. Retrying connection...")
    }
  },

  fetchInbox: async (queue?: string, signal?: AbortSignal) => {
    try {
      const data = await getThreads(queue, 30, signal)
      const items = Array.isArray(data?.items) ? (data.items as InboxItem[]) : []
      set({ inboxItems: items, isBackendConnected: true })
    } catch (err: unknown) {
      const e = err as Error;
      console.error("Backend fetchInbox failed", e)
      set({ inboxItems: [], isBackendConnected: false })
      if (!get().isLiveOffline) toast.error("Unable to load inbox items. Please check your connection.")
    }
  },

  runPreflight: async () => {
    const { runPreflight } = await import("@/lib/aaliyah/api");
    try {
      const res = await runPreflight();
      return { status: res.status };
    } catch (err: unknown) {
      const e = err as Error;
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
    } catch (err: unknown) {
      const e = err as Error;
      console.error("Initial sync trigger failed", e)
      set(prev => ({ syncProgress: { ...prev.syncProgress, phase: "done" } }))
      toast.error("Initialization failed. Please try again or contact support.")
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
      } catch (err: unknown) {
        const e = err as Error;
        set({ syncError: `Protocol Preflight: ${e.message}` });
        toast.error(`Preflight failed: ${e.message}`)
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
        const emailSync = results[0] as PromiseSettledResult<{ status: string }>;
        if (emailSync?.status === "fulfilled" && emailSync.value?.status === "queued") {
          toast.success("Sync task queued in background. Waiting for events...")
        }

        const conflicts = await getCalendarConflicts(50);
        set({ calendarConflicts: Number(conflicts?.count || 0), isBackendConnected: true });
      }
    } catch (err: unknown) {
      const e = err as Error;
      console.error("Sync failed", e);
      set({ isBackendConnected: false, syncError: e.message || "Unknown synchronization error" });
      toast.error("Synchronization failed. This has been logged for review.")
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

  addNotification: (message, type) => {
    const notifs = [...get().notifications];
    notifs.unshift({
      id: Date.now().toString() + Math.random().toString(),
      message,
      type,
      timestamp: Date.now(),
      isRead: false
    });
    // Keep only last 50 notifications
    set({ notifications: notifs.slice(0, 50) });
  },

  markNotificationRead: (id) => set((state) => ({
    notifications: state.notifications.map(n => n.id === id ? { ...n, isRead: true } : n)
  })),

  markAllNotificationsRead: () => set((state) => ({
    notifications: state.notifications.map(n => ({ ...n, isRead: true }))
  })),

  clearAllNotifications: () => set({ notifications: [] }),


  setActiveView: (view) => set({ activeView: view }),
  setActiveTriageQueue: (queue) => {
    set((state) => ({
      activeTriageQueue: queue,
      activeView: "inbox",
      unreadQueues: state.unreadQueues.filter(q => q !== queue)
    }))
    get().fetchInbox(queue)
  },
  updateCountsFromPayload: (payload: any) => {
    if (!payload) return
    const currentState = get();
    const newUnread = [...currentState.unreadQueues];

    const mapping = [
      { key: 'priority', payloadKey: 'priority_count', current: currentState.priorityCount },
      { key: 'needs_reply', payloadKey: 'needs_reply_count', fallbackKey: 'queued_count', current: currentState.queuedCount },
      { key: 'approvals', payloadKey: 'pending_approvals', current: currentState.pendingApprovals },
      { key: 'follow_ups', payloadKey: 'followups_count', fallbackKey: 'escalations', current: currentState.escalations },
    ];

    mapping.forEach(({ key, payloadKey, fallbackKey, current }) => {
      // Check for key in top-level, then by_category, then fallback keys
      const newVal = Number(
        payload[payloadKey] ??
        payload[fallbackKey || ''] ??
        payload.by_category?.[key] ??
        payload[key] ?? // e.g. payload.followups
        0
      );
      if (newVal > current && currentState.activeTriageQueue !== key && !newUnread.includes(key)) {
        newUnread.push(key);
      }
    });

    set({
      triagedCount: Number(payload.triaged_count ?? payload.total_triaged ?? 0),
      priorityCount: Number(payload.priority_count ?? payload.by_priority?.High ?? 0),
      queuedCount: Number(payload.needs_reply_count ?? payload.needs_reply ?? payload.queued_count ?? payload.by_category?.['Needs Reply'] ?? 0),
      pendingApprovals: Number(payload.pending_approvals ?? payload.by_category?.Approvals ?? 0),
      escalations: Number(payload.followups_count ?? payload.followups ?? payload.escalations ?? payload.by_category?.['Follow-ups'] ?? 0),
      calendarConflicts: Number(payload.calendar_conflicts ?? 0),
      unreadQueues: newUnread
    })
  },
  setThreadSelection: (thread) => set({ threadSelection: thread }),
}))
