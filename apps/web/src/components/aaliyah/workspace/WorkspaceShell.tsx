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
import { useSystemStore } from "@/lib/aaliyah/store"
import { NotificationStream } from "@/components/aaliyah/workspace/NotificationStream"
import { LeftPanel } from "@/components/aaliyah/workspace/left/LeftPanel"
import { IntelligencePanel } from "@/components/aaliyah/workspace/intelligence/IntelligencePanel"
import { SlideOver } from "@/components/aaliyah/workspace/intelligence/SlideOver"
import { BottomSheet } from "@/components/aaliyah/workspace/intelligence/BottomSheet"
import { FocusTrap } from "@/components/aaliyah/workspace/intelligence/FocusTrap"
import type { ConversationSummary, IntelligenceTab } from "@/components/aaliyah/workspace/types"

const MOBILE_NAV = [
  { href: "/dashboard", icon: Home, label: "Home" },
  { href: "/aaliyahworkspace", icon: MessageSquareText, label: "Chat" },
  { href: "/guidelines", icon: Brain, label: "Brain" },
  { href: "/notifications", icon: CalendarDays, label: "Calendar" },
]

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
    setIsLiveOffline,
    connectionHealth
  } = useSystemStore()

  const isDesktop = useMediaQuery("(min-width: 1024px)")
  const isTabletUp = useMediaQuery("(min-width: 768px)")

  // Derive conversations from inboxItems
  const conversations = React.useMemo<ConversationSummary[]>(() => {
    const items = inboxItems.map(item => ({
      id: item.id,
      title: item.subject || "No Subject",
      subtitle: item.snippet,
      timestamp: item.received_at ? new Date(item.received_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Recently",
      status: (item.requires_approval ? "Waiting Approval" : "Shadow Mode") as ConversationSummary["status"]
    }))

    return [
      {
        id: "morning-briefing",
        title: "Morning Briefing",
        subtitle: "Daily executive context",
        timestamp: "8:05 AM",
        status: "Shadow Mode",
      },
      ...items
    ]
  }, [inboxItems])

  const [activeConversationId, setActiveConversationId] = React.useState("morning-briefing")
  const [isLeftPanelOpen, setIsLeftPanelOpen] = React.useState(false)
  const [isIntelligenceOpen, setIsIntelligenceOpen] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState<IntelligenceTab>("Research")
  const [briefingUnread, setBriefingUnread] = React.useState(true)
  const [isBooting, setIsBooting] = React.useState(true)

  React.useEffect(() => {
    let alive = true
    void Promise.all([fetchStatus(), fetchInbox(), fetchHealth()]).finally(() => {
      if (alive) setIsBooting(false)
    })
    const interval = window.setInterval(() => {
      void triggerSync()
    }, 120_000)

    return () => {
      alive = false
      window.clearInterval(interval)
    }
  }, [fetchStatus, fetchInbox, fetchHealth, triggerSync])

  // SSE Live Stream
  React.useEffect(() => {
    let es: EventSource | null = null
    let alive = true

    const connect = async () => {
      try {
        const { getLiveToken } = await import("@/lib/aaliyah/api")
        const token = await getLiveToken()
        if (!alive) return

        es = new EventSource(`/aaliyah/live/stream?stream_token=${token}`)
        es.onopen = () => setIsLiveOffline(false)
        es.onerror = () => setIsLiveOffline(true)
        es.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)

            // Log everything interesting
            const { addLog } = useSystemStore.getState()

            if (data.type === "update" || data.type === "thread_updated" || data.type === "thread_moved") {
              void fetchStatus()
              void fetchInbox()
            }

            if (data.message) {
              addLog(data.type, data.message)
            }
          } catch (e) { }
        }
      } catch (err) {
        if (alive) setIsLiveOffline(true)
      }
    }

    void connect()
    return () => {
      alive = false
      es?.close()
    }
  }, [fetchStatus, fetchInbox, setIsLiveOffline])

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

  const activeConversation = React.useMemo(
    () => conversations.find((conversation) => conversation.id === activeConversationId) ?? conversations[0],
    [activeConversationId, conversations]
  )

  const openIntelligence = (tab: IntelligenceTab = "Research") => {
    setActiveTab(tab)
    setIsIntelligenceOpen(true)
  }

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
            activeWork={activeWork}
            quickFocus={{
              needsApproval: pendingApprovals,
              waitingReply: queuedCount,
              highPriority: highPriorityCount,
            }}
            loading={isBooting}
            onOpenMorningBriefing={() => {
              setActiveConversationId("morning-briefing")
              setBriefingUnread(false)
            }}
            onOpenWorkItem={(id) => setActiveConversationId(id)}
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

          <NotificationStream
            activeConversation={activeConversation}
            onOpenIntelligence={openIntelligence}
            onSetConversationState={setConversationState}
          />
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
                  activeWork={activeWork}
                  quickFocus={{
                    needsApproval: pendingApprovals,
                    waitingReply: queuedCount,
                    highPriority: highPriorityCount,
                  }}
                  loading={isBooting}
                  onOpenMorningBriefing={() => {
                    setActiveConversationId("morning-briefing")
                    setBriefingUnread(false)
                    setIsLeftPanelOpen(false)
                  }}
                  onOpenWorkItem={(id) => {
                    setActiveConversationId(id)
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

      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-borderSubtle bg-surface md:hidden">
        <div className="grid grid-cols-4">
          {MOBILE_NAV.map((item) => {
            const Icon = item.icon
            const active = pathname === item.href || pathname.startsWith(item.href + "/")
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                className={cn(
                  "h-14 flex items-center justify-center transition-colors",
                  active ? "text-textPrimary" : "text-textMuted hover:text-textPrimary"
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={1.5} />
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
