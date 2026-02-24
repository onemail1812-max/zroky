"use client"

import * as React from "react"

import { getThreadItem, sendChat, sendDraft } from "@/lib/aaliyah/api"
import { useSystemStore } from "@/lib/aaliyah/store"
import { MorningBriefing } from "@/components/aaliyah/workspace/MorningBriefing"
import { LiveStrip } from "@/components/aaliyah/workspace/main/LiveStrip"
import { ChatHeader } from "@/components/aaliyah/workspace/main/ChatHeader"
import { CardFeed, type DraftArtifact, type FeedItem } from "@/components/aaliyah/workspace/main/CardFeed"
import { Composer } from "@/components/aaliyah/workspace/main/Composer"
import { WorkingView } from "@/components/aaliyah/workspace/main/WorkingView"
import type { ConversationSummary, IntelligenceTab } from "@/components/aaliyah/workspace/types"

const WORKING_DELAY_MS = 1600
const WORKING_STEPS = ["Syncing inbox", "Checking conflicts", "Drafting response", "Preparing execution package"]

function formatTime(date = new Date()) {
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(date)
}

// seedForConversation removed (Sprint 1)

export function NotificationStream({
  activeConversation,
  onOpenIntelligence,
  onSetConversationState,
}: {
  activeConversation: ConversationSummary
  onOpenIntelligence: (tab?: IntelligenceTab) => void
  onSetConversationState?: (conversationId: string, state: ConversationSummary["status"]) => void
}) {
  const { status, activeTask, setThinking, setIdle, isBackendConnected, mainChatFeed, setMainChatFeed, checkDailyReset } = useSystemStore()

  const [localFeedItems, setLocalFeedItems] = React.useState<FeedItem[]>([])
  const isMorningBriefing = activeConversation.id === "morning-briefing"
  const feedItems = isMorningBriefing ? mainChatFeed : localFeedItems

  const setFeedItems = React.useCallback((valOrFn: FeedItem[] | ((prev: FeedItem[]) => FeedItem[])) => {
    if (isMorningBriefing) {
      setMainChatFeed(valOrFn)
    } else {
      setLocalFeedItems(valOrFn as React.SetStateAction<FeedItem[]>)
    }
  }, [isMorningBriefing, setMainChatFeed])
  const [composerValue, setComposerValue] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [workingOpen, setWorkingOpen] = React.useState(false)
  const [workingStepIndex, setWorkingStepIndex] = React.useState(0)
  const [workingDetail, setWorkingDetail] = React.useState<string | undefined>(undefined)
  const [isLoading, setIsLoading] = React.useState(false)
  const [isLiveOffline, setIsLiveOffline] = React.useState(false)

  const requestIdRef = React.useRef(0)
  const delayTimerRef = React.useRef<number | null>(null)
  const feedScrollRef = React.useRef<HTMLDivElement>(null)

  // Fetch thread data
  React.useEffect(() => {
    if (activeConversation.id === "morning-briefing") {
      checkDailyReset()
      return
    }

    let alive = true
    setIsLoading(true)

    getThreadItem(activeConversation.id)
      .then((data) => {
        if (!alive) return

        const items: FeedItem[] = [
          {
            id: `${data.id}_intro`,
            type: "response",
            title: "Aaliyah Triage",
            text: data.snippet,
          }
        ]

        if (data.status === "sent") {
          items.push({ id: `${data.id}_exec`, type: "receipt", text: "Successfully sent.", timestamp: data.timestamp })
        } else if (data.draft) {
          items.push({ id: `${data.id}_draft`, type: "artifact-email", draft: data.draft })
        }

        setFeedItems(items)
      })
      .catch((err) => {
        console.error("Failed to fetch thread", err)
        setFeedItems([
          { id: "error", type: "response", title: "Sync Error", text: "Failed to load thread details. Backend may be offline.", tone: "error" }
        ])
        if (!isBackendConnected) setIsLiveOffline(true)
      })
      .finally(() => {
        if (alive) setIsLoading(false)
      })

    setComposerValue("")
    return () => { alive = false }
  }, [activeConversation.id, isBackendConnected])

  React.useEffect(() => {
    if (!feedScrollRef.current) return
    feedScrollRef.current.scrollTo({ top: feedScrollRef.current.scrollHeight, behavior: "smooth" })
  }, [feedItems])

  React.useEffect(() => {
    if (!workingOpen) {
      setWorkingStepIndex(0)
      return
    }

    const timer = window.setInterval(() => {
      setWorkingStepIndex((prev) => Math.min(prev + 1, WORKING_STEPS.length - 1))
    }, 900)

    return () => window.clearInterval(timer)
  }, [workingOpen])

  const openWorkingAfterDelay = (detail?: string) => {
    setWorkingDetail(detail)
    if (delayTimerRef.current) window.clearTimeout(delayTimerRef.current)
    delayTimerRef.current = window.setTimeout(() => setWorkingOpen(true), WORKING_DELAY_MS)
  }

  const stopWorking = () => {
    if (delayTimerRef.current) window.clearTimeout(delayTimerRef.current)
    delayTimerRef.current = null
    setWorkingOpen(false)
    setWorkingDetail(undefined)
  }

  const onUpdateDraft = (id: string, draft: DraftArtifact) => {
    setFeedItems((prev) => prev.map((item) => (item.id === id && item.type === "artifact-email" ? { ...item, draft } : item)))
  }

  const onApprovalAction = async (action: "approve" | "edit" | "reject", id: string) => {
    if (action === "approve") {
      try {
        // Retrieve workspace ID from storage
        const workspaceId = typeof window !== "undefined" ?
          (window.localStorage.getItem("workspace_id") || window.localStorage.getItem("tenant_id") || "default") : "default"

        // Only call API if it's likely a real ID (no underscores/hyphens from mocks)
        // or just let it fail and handle the error.
        await sendDraft(workspaceId, id)

        onSetConversationState?.(activeConversation.id, "Executing")
        setFeedItems((prev) => [
          ...prev,
          { id: `exec_${Date.now()}`, type: "receipt", text: "Approved. Executing the queued actions now.", timestamp: formatTime() },
        ])
        onOpenIntelligence("Timeline")
      } catch (e: any) {
        console.error("Approval failed", e)
        throw e // Propagate to component to show error
      }
      return
    }

    if (action === "edit") {
      onOpenIntelligence("Documents")
      return
    }

    onSetConversationState?.(activeConversation.id, "Needs Clarification")
    setFeedItems((prev) => [
      ...prev,
      {
        id: `rej_${Date.now()}`,
        type: "response",
        title: "Needs Clarification",
        text: "Understood. Tell me what to change and I will regenerate the proposal and artifacts.",
        tone: "error",
      },
    ])
  }

  const handleSend = async () => {
    const message = composerValue.trim()
    if (!message || isSubmitting) return

    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId

    setComposerValue("")
    setIsSubmitting(true)
    setThinking("Drafting response")
    openWorkingAfterDelay(`Command: ${message}`)

    setFeedItems((prev) => [
      ...prev,
      { id: `cmd_${requestId}`, type: "user-command", text: message, timestamp: formatTime() },
    ])

    try {
      const result = await sendChat(message)
      if (requestIdRef.current !== requestId) return

      const replyText = String(result?.reply ?? result?.message ?? "Draft complete and ready for your review.")
      setFeedItems((prev) => [
        ...prev,
        { id: `resp_${requestId}`, type: "response", title: "Aaliyah Response", text: replyText },
        { id: `receipt_${requestId}`, type: "receipt", text: "Prepared execution package. Awaiting approval.", timestamp: formatTime() },
      ])
    } catch {
      if (requestIdRef.current !== requestId) return
      setFeedItems((prev) => [
        ...prev,
        {
          id: `err_${requestId}`,
          type: "response",
          title: "Error",
          text: "Connection failed. Please retry.",
          tone: "error",
        },
      ])
    } finally {
      if (requestIdRef.current !== requestId) return
      stopWorking()
      setIsSubmitting(false)
      setIdle()
    }
  }

  const cancelWorking = () => {
    requestIdRef.current += 1
    stopWorking()
    setIsSubmitting(false)
    setIdle()
  }


  const liveTasks = React.useMemo(() => {
    if (status === "thinking" || workingOpen) {
      return [activeTask || "Processing...", "System sync", "Ready"]
    }
    return ["Awaiting instructions", "Scanning providers", "Neural system active"]
  }, [status, workingOpen, activeTask])

  return (
    <section className="h-full bg-appBg flex flex-col relative">
      <LiveStrip tasks={liveTasks} active={status === "thinking" || workingOpen} />
      <ChatHeader title={activeConversation.title} timestamp={activeConversation.timestamp} state={activeConversation.status} />

      <div ref={feedScrollRef} className="flex-1 overflow-y-auto px-4 pb-48 pt-6 md:px-6">
        <div className="mx-auto w-full max-w-4xl space-y-4">
          {activeConversation.id === "morning-briefing" && <MorningBriefing />}
          <CardFeed
            items={feedItems}
            onOpenIntelligence={(tab) => onOpenIntelligence(tab)}
            onUpdateDraft={onUpdateDraft}
            onApprovalAction={onApprovalAction}
          />
        </div>
      </div>

      <Composer value={composerValue} disabled={isSubmitting} onChange={setComposerValue} onSend={handleSend} />

      <WorkingView
        open={workingOpen}
        steps={WORKING_STEPS}
        activeIndex={workingStepIndex}
        onCancel={cancelWorking}
        detail={workingDetail}
      />

      <div className="sr-only" aria-live="polite">
        {workingOpen ? "Aaliyah is working" : ""}
      </div>
    </section>
  )
}
