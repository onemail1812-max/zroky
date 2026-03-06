"use client"

import * as React from "react"
import { AnimatePresence, motion } from "framer-motion"

import { useSystemStore } from "@/lib/aaliyah/store"
import { useViewerStore } from "@/lib/aaliyah/viewerStore"
import { useOnlineStatus } from "@/hooks/useOnlineStatus"
import { useFeedSSE } from "@/hooks/useFeedSSE"
import { useConversations } from "@/hooks/useConversations"
import { usePresence } from "@/hooks/usePresence"

import { PreFlightPanel } from "@/components/aaliyah/workspace/PreFlightPanel"
import { MobileNavBar } from "@/components/aaliyah/workspace/mobile/MobileNavBar"
import { SyncStatusWidget } from "@/components/aaliyah/workspace/feed/SyncStatusWidget"
import { ComposeModal } from "@/components/aaliyah/workspace/main/ComposeModal"
import { OfflineState } from "@/components/ui/OfflineState"
import SettingsForm from "@/components/aaliyah/forms/SettingsForm"

import { Sidebar } from "./shell/Sidebar"
import { MainFeed } from "./shell/MainFeed"
import { IntelligenceContainer } from "./shell/IntelligenceContainer"

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
  const { isViewerOpen } = useViewerStore()
  const {
    status,
    lastSync,
    inboxItems,
    isBackendConnected,
    fetchStatus,
    fetchInbox,
    fetchHealth,
    triggerSync,
    triggerInitialSync,
    dismissSyncProgress,
    syncProgress,
    activeView,
    setActiveView,
    isIntelligenceOpen,
    setIsIntelligenceOpen,
  } = useSystemStore()

  const isDesktop = useMediaQuery("(min-width: 1024px)")
  const isTabletUp = useMediaQuery("(min-width: 768px)")
  const conversations = useConversations()
  const presence = usePresence()

  // SSE Connection Hook (Hardened)
  useFeedSSE({
    fetchHealth
  })

  const [activeConversationId, setActiveConversationId] = React.useState("morning-briefing")
  const [isLeftPanelOpen, setIsLeftPanelOpen] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState<any>("Research")
  const [briefingUnread, setBriefingUnread] = React.useState(true)
  const [isBooting, setIsBooting] = React.useState(true)
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false)

  const { isFullyConnected } = useOnlineStatus()
  const [isRetrying, setIsRetrying] = React.useState(false)

  const handleRetry = async () => {
    setIsRetrying(true)
    try {
      await triggerSync()
    } finally {
      setIsRetrying(false)
    }
  }

  // Lifecycle & Auto-Sync
  React.useEffect(() => {
    let alive = true

    const boot = async () => {
      await fetchHealth()
      const health = useSystemStore.getState().connectionHealth

      if (!health?.email_accessible) {
        if (alive) setIsBooting(false)
        return
      }

      const { runPreflight } = await import("@/lib/aaliyah/api")
      await Promise.all([
        runPreflight().catch(e => console.error("Preflight failed:", e)),
        fetchStatus(),
        fetchInbox()
      ])

      const currentState = useSystemStore.getState()
      const hasEverSynced = (currentState.lastSync?.gmail || currentState.lastSync?.calendar)

      if (!hasEverSynced) {
        if (alive) void triggerInitialSync()
      } else {
        if (alive && health?.email_accessible) void triggerSync()
      }

      if (alive) setIsBooting(false)
    }

    void boot()

    const interval = window.setInterval(() => {
      const health = useSystemStore.getState().connectionHealth
      const progress = useSystemStore.getState().syncProgress
      if (health?.email_accessible && progress.phase !== "syncing" && progress.phase !== "queued") {
        void triggerSync()
      }
    }, 120_000)

    return () => {
      alive = false
      window.clearInterval(interval)
    }
  }, [fetchStatus, fetchInbox, fetchHealth, triggerSync, triggerInitialSync])

  const activeConversation = React.useMemo(
    () => conversations.find((c) => c.id === activeConversationId) || conversations[0],
    [conversations, activeConversationId]
  )

  const activeWork = React.useMemo(
    () => conversations.filter((c) => c.id !== "morning-briefing"),
    [conversations]
  )

  const openIntelligence = (tab: any) => {
    setActiveTab(tab)
    setIsIntelligenceOpen(true)
  }

  return (
    <div className="h-screen overflow-hidden bg-appBg text-textPrimary flex flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[1000] focus:px-6 focus:py-3 focus:bg-zinc-900 focus:text-white focus:rounded-xl focus:font-bold focus:shadow-2xl transition-all"
      >
        Skip to content
      </a>
      <PreFlightPanel />

      {!isBackendConnected && !isBooting && (
        <div className="absolute inset-0 z-[200] flex bg-white backdrop-blur-3xl items-center justify-center animate-in fade-in duration-500">
          <OfflineState
            onRetry={() => {
              setIsBooting(true)
              fetchHealth().finally(() => setIsBooting(false))
            }}
            isRetrying={isBooting}
          />
        </div>
      )}

      <div className="flex-1 overflow-hidden flex">
        <Sidebar
          isOpen={isLeftPanelOpen}
          onClose={() => setIsLeftPanelOpen(false)}
          presence={presence}
          briefingUnread={briefingUnread}
          activeConversationId={activeConversationId}
          isBooting={isBooting}
          onOpenMorningBriefing={() => {
            setActiveConversationId("morning-briefing")
            setBriefingUnread(false)
          }}
        />

        <MainFeed
          activeView={activeView}
          isBooting={isBooting}
          syncProgress={syncProgress}
          activeWork={activeWork}
          activeConversation={activeConversation}
          isViewerOpen={isViewerOpen}
          onOpenIntelligence={openIntelligence}
          onSetConversationState={() => void fetchInbox()}
          onOpenMobileMenu={() => setIsLeftPanelOpen(true)}
          isLeftPanelOpen={isLeftPanelOpen}
        />

        <IntelligenceContainer
          isOpen={isIntelligenceOpen}
          onClose={() => setIsIntelligenceOpen(false)}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          isDesktop={isDesktop}
          isTabletUp={isTabletUp}
        />
      </div>

      <AnimatePresence>
        {!isFullyConnected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-white/40 backdrop-blur-md flex items-center justify-center p-6"
          >
            <OfflineState
              onRetry={handleRetry}
              isRetrying={isRetrying}
              className="max-w-md h-auto min-h-0 rounded-[40px] shadow-2xl border border-zinc-200"
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {syncProgress.phase !== "idle" && activeWork.length > 0 && !isBooting && (
          <div className="absolute bottom-6 right-6 w-[320px] z-20">
            <SyncStatusWidget onDismiss={dismissSyncProgress} />
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setIsSettingsOpen(false)}
            />
            <div className="relative w-full max-w-5xl h-[85vh] z-10">
              <SettingsForm onClose={() => setIsSettingsOpen(false)} />
            </div>
          </div>
        )}
      </AnimatePresence>

      <MobileNavBar
        activeTab={activeView === "action_log" ? "archive" : activeView === "inbox" ? "chat" : "settings"}
        onTabChange={(tab: any) => {
          if (tab === "settings") setIsSettingsOpen(true)
          else if (tab === "chat") {
            setActiveView("inbox")
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
