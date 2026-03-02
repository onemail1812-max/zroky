"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Brain,
  CalendarDays,
  Home,
  Menu,
  MessageSquareText,
  PanelRightOpen,
  X,
  AlertCircle,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { PreFlightPanel } from "@/components/aaliyah/workspace/PreFlightPanel"
import { MobileNavBar } from "@/components/aaliyah/workspace/mobile/MobileNavBar"
import { useSystemStore } from "@/lib/aaliyah/store"
import { NotificationStream } from "@/components/aaliyah/workspace/NotificationStream"
import { SyncStatusWidget } from "@/components/aaliyah/workspace/feed/SyncStatusWidget"
import { ActionLogView } from "@/components/aaliyah/workspace/main/ActionLogView"
import { LeftPanel } from "@/components/aaliyah/workspace/left/LeftPanel"
import { IntelligencePanel } from "@/components/aaliyah/workspace/intelligence/IntelligencePanel"
import { SlideOver } from "@/components/aaliyah/workspace/intelligence/SlideOver"
import { BottomSheet } from "@/components/aaliyah/workspace/intelligence/BottomSheet"
import { FocusTrap } from "@/components/aaliyah/workspace/intelligence/FocusTrap"
import { TerminalLoader } from "@/components/aaliyah/workspace/main/TerminalLoader"
import { DocumentViewerPanel } from "@/components/aaliyah/workspace/viewer/DocumentViewerPanel"
import { useViewerStore } from "@/lib/aaliyah/viewerStore"
import type { ConversationSummary, IntelligenceTab } from "@/components/aaliyah/workspace/types"
import SettingsForm from "@/components/aaliyah/forms/SettingsForm"
import { AnimatePresence } from "framer-motion"
import { ComposeModal } from "@/components/aaliyah/workspace/main/ComposeModal"



function useMediaQuery(query: string) {
  const [matches, setMatches] = React.useState(false)

  React.useEffect(() => {
    const media = window.matchMedia(query)
    const update = () => setMatches(media.matches)
    update()

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", update)
      return () => media.removeEventListener("change", update)
    }

    media.addListener(update)
    return () => media.removeListener(update)
  }, [query])

  return matches
}

export default function WorkspaceShell() {
  const pathname = usePathname()
  const { isViewerOpen, closeViewer } = useViewerStore()
  const {
    status,
    lastSync,
    pendingApprovals,
    queuedCount,
    inboxItems,
    isBackendConnected,
    isLiveOffline,
    fetchStatus,
    fetchInbox,
    fetchHealth,
    triggerSync,
    triggerInitialSync,
    dismissSyncProgress,
    setIsLiveOffline,
    connectionHealth,
    syncProgress,
    activeTriageQueue,
    activeView,
    setActiveView,
  } = useSystemStore()

  const isDesktop = useMediaQuery("(min-width: 1024px)")
  const isTabletUp = useMediaQuery("(min-width: 768px)")

  // Derived conversations from inboxItems
  const conversations = React.useMemo<ConversationSummary[]>(() => {
    let filteredItems = inboxItems

    // Noise Cleaning: Always exclude Cleaned/Newsletter from standard queues
    const excludeNoise = (item: any) =>
      item.category !== "cleaned" && item.category !== "newsletter";

    if (activeTriageQueue === "priority") {
      filteredItems = filteredItems.filter(i => i.priority === "urgent" || i.priority === "high")
    } else if (activeTriageQueue === "needs_reply") {
      filteredItems = filteredItems.filter(i => i.category === "needs_reply")
    } else if (activeTriageQueue === "approvals") {
      filteredItems = filteredItems.filter(i => !!i.requires_approval)
    } else if (activeTriageQueue === "follow_ups") {
      filteredItems = filteredItems.filter(i => i.category === "fyi" || i.category === "followup")
    } else if (activeTriageQueue === "all") {
      filteredItems = filteredItems.filter(excludeNoise)
    }

    const items = filteredItems.map(item => ({
      id: item.id,
      title: item.subject || "No Subject",
      subtitle: item.snippet,
      timestamp: item.received_at ? new Date(item.received_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Recently",
      status: (item.requires_approval ? "Waiting Approval" : "Shadow Mode") as ConversationSummary["status"],
      labels: item.labels || []
    }))

    // Truth Gating for Briefing Tab
    const isEmailAccessible = connectionHealth?.email_health?.status === 'OK'
    const hasSyncSuccess = lastSync?.gmail !== null
    const hasData = items.length > 0 || (lastSync?.gmail !== null && items.length === 0) // items.length 0 + sync success = confirmed empty

    const showBriefing = isEmailAccessible && hasSyncSuccess && hasData

    if (!showBriefing) {
      return items
    }

    return [
      {
        id: "morning-briefing",
        title: "Morning Briefing",
        subtitle: "Daily executive context",
        timestamp: lastSync?.gmail ? new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(lastSync.gmail)) : "Today",
        status: "Shadow Mode" as any,
      },
      ...items
    ]
  }, [inboxItems, connectionHealth, lastSync, activeTriageQueue])

  const [activeConversationId, setActiveConversationId] = React.useState("morning-briefing")
  const [isLeftPanelOpen, setIsLeftPanelOpen] = React.useState(false)
  const [isIntelligenceOpen, setIsIntelligenceOpen] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState<IntelligenceTab>("Research")
  const [briefingUnread, setBriefingUnread] = React.useState(true)
  const [isBooting, setIsBooting] = React.useState(true)
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false)

  React.useEffect(() => {
    let alive = true

    const boot = async () => {
      // 1. Critical Health Check First
      await fetchHealth()

      // 2. Check if we should proceed (Gatekeeper)
      const health = useSystemStore.getState().connectionHealth

      // Block if Email is not accessible (Minimum Requirement)
      if (!health?.email_accessible) {
        console.warn("Workspace Boot Halted: connection required.")
        if (alive) setIsBooting(false)
        return // STOP HERE. No fetching inbox, no syncing.
      }

      // 3. System is Go -> Preflight & Initial Data
      const { runPreflight } = await import("@/lib/aaliyah/api")
      await runPreflight()

      // 4. First-Time User Detection:
      //    Fetch status first to ensure local store has latest server truth.
      await fetchStatus()

      const currentState = useSystemStore.getState()
      const hasEverSynced = (currentState.lastSync?.gmail || currentState.lastSync?.calendar)

      if (!hasEverSynced) {
        // First time: use the scoped initial sync with live progress widget
        if (alive) void triggerInitialSync()
      } else {
        // Returning user: normal quick sync
        if (alive && health?.email_accessible) void triggerSync()
      }

      await fetchInbox()
      if (alive) setIsBooting(false)
    }

    void boot()

    // ── Auto-Sync every 2 minutes (runs forever while workspace is open) ──────
    const interval = window.setInterval(() => {
      const health = useSystemStore.getState().connectionHealth
      const progress = useSystemStore.getState().syncProgress
      // Don't run auto-sync while initial sync is still in progress
      if (health?.email_accessible && progress.phase !== "syncing" && progress.phase !== "queued") {
        void triggerSync()
      }
    }, 120_000)

    return () => {
      alive = false
      window.clearInterval(interval)
    }
  }, [fetchStatus, fetchInbox, fetchHealth, triggerSync, triggerInitialSync])

  // SSE Live Stream with Exponential Backoff Reconnection
  React.useEffect(() => {
    let es: EventSource | null = null
    let alive = true
    let retryDelay = 2000 // Start at 2s
    const MAX_RETRY_DELAY = 30000 // Cap at 30s
    let heartbeatTimer: ReturnType<typeof setInterval> | null = null

    const connect = async () => {
      if (!alive) return

      try {
        const { getLiveToken } = await import("@/lib/aaliyah/api")
        const token = await getLiveToken()
        if (!alive) return

        // [v2.1 Scale Hardening] - Last-Event-ID recovery
        const lastId = window.sessionStorage.getItem("aaliyah_last_event_id")
        const url = `/aaliyah/live/stream?stream_token=${token}` + (lastId ? `&last_event_id=${lastId}` : "")

        es = new EventSource(url)

        es.onopen = () => {
          setIsLiveOffline(false)
          retryDelay = 2000 // Reset on success
        }

        es.onerror = () => {
          setIsLiveOffline(true)
          es?.close()
          es = null
          if (alive) {
            // Exponential backoff with jitter
            const jitter = Math.random() * 1000
            const delay = Math.min(retryDelay + jitter, MAX_RETRY_DELAY)
            retryDelay = Math.min(retryDelay * 2, MAX_RETRY_DELAY)
            setTimeout(() => void connect(), delay)
          }
        }

        es.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)

            // Log everything interesting
            const { addLog } = useSystemStore.getState()

            if (data.id) {
              window.sessionStorage.setItem("aaliyah_last_event_id", data.id)
            }

            if (data.type === "update" || data.type === "thread_updated" || data.type === "thread_moved") {
              void fetchStatus()
              void fetchInbox()
            }

            if (data.type === "briefing_ready") {
              // Dispatch to window so MorningBriefing can pick it up
              window.dispatchEvent(
                new CustomEvent("aaliyah:briefing_ready", { detail: data.payload })
              )
            }

            if (data.type === "compose_action") {
              useSystemStore.getState().openCompose(data.payload)
            }

            if (data.message) {
              addLog(data.type, data.message)
            }
          } catch (e) { }
        }

        // Heartbeat: detect silent disconnects every 30s
        if (heartbeatTimer) clearInterval(heartbeatTimer)
        heartbeatTimer = setInterval(() => {
          if (es && es.readyState === EventSource.CLOSED) {
            setIsLiveOffline(true)
            es.close()
            es = null
            void connect()
          }
        }, 30000)

      } catch (err) {
        if (alive) {
          setIsLiveOffline(true)
          const jitter = Math.random() * 1000
          const delay = Math.min(retryDelay + jitter, MAX_RETRY_DELAY)
          retryDelay = Math.min(retryDelay * 2, MAX_RETRY_DELAY)
          setTimeout(() => void connect(), delay)
        }
      }
    }

    void connect()
    return () => {
      alive = false
      es?.close()
      if (heartbeatTimer) clearInterval(heartbeatTimer)
    }
  }, [fetchStatus, fetchInbox, setIsLiveOffline])

  // ── OAuth Completion Listener ───────────────────────────────────
  React.useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "oauth_complete") {
        if (event.data.success) {
          // Immediately sync and refresh context
          void triggerSync().then(() => {
            void fetchStatus()
            void fetchInbox()
          })
        }
      }
    }
    window.addEventListener("message", handleMessage)
    return () => window.removeEventListener("message", handleMessage)
  }, [triggerSync, fetchStatus, fetchInbox])

  React.useEffect(() => {
    if (!isLeftPanelOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [isLeftPanelOpen])

  React.useEffect(() => {
    if (!isDesktop || !isIntelligenceOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsIntelligenceOpen(false)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [isDesktop, isIntelligenceOpen])

  const activeConversation = React.useMemo(() => {
    const found = conversations.find((conversation) => conversation.id === activeConversationId)
    if (found) return found
    // Fallback: If morning-briefing was active but is now hidden, or id mismatch
    if (conversations.length > 0) return conversations[0]
    // Base fallback for booting
    return {
      id: "idle",
      title: "Aaliyah",
      subtitle: "System standby",
      timestamp: "",
      status: "Shadow Mode" as any
    }
  }, [activeConversationId, conversations])

  const openIntelligence = React.useCallback((tab: IntelligenceTab = "Research") => {
    setActiveTab(tab)
    setIsIntelligenceOpen(true)
  }, [])

  const lastSyncMs = React.useMemo(() => {
    const values = [lastSync?.gmail, lastSync?.calendar].filter(Boolean) as string[]
    const parsed = values.map((value) => Date.parse(value)).filter((n) => Number.isFinite(n))
    return parsed.length > 0 ? Math.max(...parsed) : null
  }, [lastSync?.calendar, lastSync?.gmail])

  const presence = React.useMemo(() => {
    if (status === "thinking" || status === "acting") return "working"
    if (status === "error") return "idle"
    if (!lastSyncMs) return "idle"
    const isFresh = Date.now() - lastSyncMs < 15 * 60 * 1000
    return isFresh ? "online" : "idle"
  }, [lastSyncMs, status])

  const highPriorityCount = React.useMemo(
    () => inboxItems.filter((item) => String(item.priority).toLowerCase() === "high").length,
    [inboxItems]
  )

  const activeWork = React.useMemo(
    () => conversations.filter((conversation) => conversation.id !== "morning-briefing"),
    [conversations]
  )

  const setConversationState = React.useCallback((_conversationId: string, _next: ConversationSummary["status"]) => {
    // In Sprint 1, we rely on the DB as truth. This should trigger a fetch or wait for background sync.
    void fetchInbox()
  }, [fetchInbox])

  return (
    <div className="h-screen overflow-hidden bg-appBg text-textPrimary flex flex-col">
      <PreFlightPanel />
      <div className="flex-1 overflow-hidden flex">
        <div className="hidden lg:block w-[300px] shrink-0">
          <LeftPanel
            presence={presence}
            briefingUnread={briefingUnread}
            selectedId={activeConversationId}
            loading={isBooting}
            onOpenMorningBriefing={() => {
              setActiveConversationId("morning-briefing")
              setBriefingUnread(false)
            }}
          />
        </div>

        <main className="flex-1 min-w-0 lg:min-w-[720px] relative">
          <div className="absolute left-4 top-11 z-30 lg:hidden flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsLeftPanelOpen(true)}
              className="h-11 w-11 rounded-lg border border-borderSubtle bg-surface text-textSecondary hover:bg-surfaceElevated hover:text-textPrimary flex items-center justify-center"
              aria-label="Open sidebar"
              title="Open sidebar"
            >
              <Menu className="h-5 w-5" strokeWidth={1.5} />
            </button>

            <button
              type="button"
              onClick={() => openIntelligence("Research")}
              className="h-11 w-11 rounded-lg border border-borderSubtle bg-surface text-textSecondary hover:bg-surfaceElevated hover:text-textPrimary flex items-center justify-center"
              aria-label="Open intelligence panel"
              title="Open intelligence panel"
            >
              <PanelRightOpen className="h-5 w-5" strokeWidth={1.5} />
            </button>
          </div>

          {/* Main Content Area */}
          <div className="flex h-full w-full">
            {/* Left/Main Column - Notifications/Chat */}
            <div className={cn(
              "flex-1 h-full min-w-0 transition-all duration-300 relative pb-16 lg:pb-0",
              isViewerOpen ? "border-r border-borderSubtle" : ""
            )}>
              {activeView === "action_log" ? (
                <ActionLogView />
              ) : activeView === "memory" ? (
                <div className="h-full w-full lg:hidden bg-zinc-50 flex flex-col pt-12">
                  <LeftPanel
                    presence={presence}
                    briefingUnread={briefingUnread}
                    selectedId={activeConversationId}
                    loading={isBooting}
                    onOpenMorningBriefing={() => {
                      setActiveConversationId("morning-briefing")
                      setBriefingUnread(false)
                      setActiveView("inbox")
                    }}
                  />
                </div>
              ) : isBooting || (syncProgress.phase === "syncing" && activeWork.length === 0) ? (
                <div className="absolute inset-0 z-20 flex bg-white/95 backdrop-blur-xl items-center justify-center animate-in fade-in duration-500">
                  <TerminalLoader
                    progress={syncProgress.phase === "syncing" ? (syncProgress.inbox?.progress || 45) : 12}
                    status={syncProgress.inbox?.message}
                  />
                </div>
              ) : (
                <NotificationStream
                  activeConversation={activeConversation}
                  onOpenIntelligence={openIntelligence}
                  onSetConversationState={setConversationState}
                />
              )}
            </div>

            {/* Right Column - Document Viewer */}
            {isViewerOpen && (
              <div className="w-1/2 h-full min-w-[400px] shrink-0 hidden xl:block animate-in slide-in-from-right-8 duration-300">
                <DocumentViewerPanel />
              </div>
            )}

            {/* Slide-over viewer for smaller screens */}
            {isViewerOpen && (
              <div className="xl:hidden fixed inset-y-0 right-0 z-50 w-full sm:w-[500px] bg-surface shadow-2xl animate-in slide-in-from-right duration-300">
                <DocumentViewerPanel />
              </div>
            )}
          </div>

          {/* ── First-time & periodic sync progress widget ────────── */}
          <AnimatePresence>
            {syncProgress.phase !== "idle" && activeWork.length > 0 && !isBooting && (
              <div className="absolute bottom-6 right-6 w-[320px] z-20">
                <SyncStatusWidget
                  onDismiss={dismissSyncProgress}
                />
              </div>
            )}
          </AnimatePresence>
        </main>

        <div className={cn("hidden lg:block shrink-0 overflow-hidden transition-[width] duration-300", isIntelligenceOpen ? "w-[420px]" : "w-0")}>
          <div className="h-full w-[420px]">
            <IntelligencePanel activeTab={activeTab} onTabChange={setActiveTab} onClose={() => setIsIntelligenceOpen(false)} />
          </div>
        </div>
      </div>

      {isLeftPanelOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 lg:hidden"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsLeftPanelOpen(false)
          }}
        >
          <div className="h-full w-[300px] max-w-[86vw] bg-surfaceElevated shadow-[0_12px_36px_rgba(26,29,35,0.08)]">
            <div role="dialog" aria-modal="true" aria-label="Workspace sidebar">
              <FocusTrap active onEscape={() => setIsLeftPanelOpen(false)}>
                <div className="h-14 border-b border-borderSubtle px-4 flex items-center justify-between bg-surface">
                  <span className="text-[13px] font-semibold text-textPrimary">Workspace</span>
                  <button
                    type="button"
                    onClick={() => setIsLeftPanelOpen(false)}
                    className="h-10 w-10 rounded-lg text-textSecondary hover:bg-surfaceElevated hover:text-textPrimary flex items-center justify-center"
                    aria-label="Close sidebar"
                    title="Close"
                  >
                    <X className="h-5 w-5" strokeWidth={1.5} />
                  </button>
                </div>

                <LeftPanel
                  presence={presence}
                  briefingUnread={briefingUnread}
                  selectedId={activeConversationId}
                  loading={isBooting}
                  onOpenMorningBriefing={() => {
                    setActiveConversationId("morning-briefing")
                    setBriefingUnread(false)
                    setIsLeftPanelOpen(false)
                  }}
                />
              </FocusTrap>
            </div>
          </div>
        </div>
      )}

      {isIntelligenceOpen && !isDesktop && (isTabletUp ? (
        <SlideOver open onClose={() => setIsIntelligenceOpen(false)}>
          <IntelligencePanel activeTab={activeTab} onTabChange={setActiveTab} onClose={() => setIsIntelligenceOpen(false)} />
        </SlideOver>
      ) : (
        <BottomSheet open onClose={() => setIsIntelligenceOpen(false)}>
          <IntelligencePanel activeTab={activeTab} onTabChange={setActiveTab} onClose={() => setIsIntelligenceOpen(false)} />
        </BottomSheet>
      ))}

      {/* Settings Modal Overlay */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setIsSettingsOpen(false)}
            />
            <div className="relative w-full max-w-5xl h-[85vh] z-10">
              {/* Dynamic import or direct usage if imported at top. We need to import it first. */}
              <SettingsForm onClose={() => setIsSettingsOpen(false)} />
            </div>
          </div>
        )}
      </AnimatePresence>

      <MobileNavBar
        activeTab={activeView === "memory" ? "inbox" : activeView === "inbox" ? "chat" : activeView === "action_log" ? "archive" : "settings"}
        onTabChange={(tab) => {
          if (tab === "settings") setIsSettingsOpen(true)
          else if (tab === "chat") {
            setActiveView("inbox")
            setIsSettingsOpen(false)
          } else if (tab === "inbox") {
            setActiveView("memory")
            setIsSettingsOpen(false)
          } else if (tab === "archive") {
            setActiveView("action_log")
            setIsSettingsOpen(false)
          }
        }}
        unreadCount={inboxItems.filter(i => !i.is_read).length}
      />

      <ComposeModal />
    </div>
  )
}
