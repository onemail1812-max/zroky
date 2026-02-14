"use client"

import * as React from "react"

import { sendChat } from "@/lib/aaliyah/api"
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

function seedForConversation(conversation: ConversationSummary): FeedItem[] {
  if (conversation.id === "morning-briefing") return []

  const base: FeedItem[] = [
    {
      id: `${conversation.id}_intro`,
      type: "response",
      title: "Aaliyah Response",
      text: conversation.subtitle,
    },
  ]

  if (conversation.status === "Waiting Approval") {
    return [
      ...base,
      {
        id: `${conversation.id}_proposal`,
        type: "proposal",
        title: "Action Plan",
        bullets: [
          "Confirm the final tone and recipients.",
          "Prepare the send-ready draft and attach approvals.",
          "Queue execution once approved.",
        ],
      },
      {
        id: `${conversation.id}_approval`,
        type: "approval",
        title: "Approval Required",
        detail: "External outreach and calendar edits require explicit approval.",
      },
      {
        id: `${conversation.id}_draft`,
        type: "artifact-email",
        draft: {
          to: "board@northbridge.com",
          subject: "Q3 Investor Update and Scheduling Alignment",
          body: "Attached is the refined update. Pending your approval, I will send to legal and finance, then align board prep to remove conflicts.",
        },
      },
    ]
  }

  if (conversation.status === "Executing") {
    return [
      ...base,
      {
        id: `${conversation.id}_receipt`,
        type: "receipt",
        text: "Execution in progress. Monitoring for exceptions.",
        timestamp: formatTime(),
      },
      {
        id: `${conversation.id}_calendar`,
        type: "artifact-calendar",
        title: "Calendar Diff",
        items: [
          { time: "10:30", update: "Move board prep from Wed to Thu" },
          { time: "14:00", update: "Conflict cleared with strategy review" },
        ],
      },
    ]
  }

  if (conversation.status === "Blocked by Rule") {
    return [
      {
        id: `${conversation.id}_blocked`,
        type: "response",
        title: "Blocked by Rule",
        text: "This action is restricted by policy. I can summarize options and request approval to proceed.",
        tone: "error",
      },
    ]
  }

  if (conversation.status === "Needs Clarification") {
    return [
      {
        id: `${conversation.id}_clarify`,
        type: "response",
        title: "Needs Clarification",
        text: "I need one missing detail to proceed (owner, deadline, or preferred tone).",
        tone: "error",
      },
    ]
  }

  if (conversation.status === "Completed") {
    return [
      {
        id: `${conversation.id}_done`,
        type: "receipt",
        text: "Completed. Output archived for retrieval.",
        timestamp: formatTime(),
      },
    ]
  }

  return base
}

export function NotificationStream({
  activeConversation,
  onOpenIntelligence,
  onSetConversationState,
}: {
  activeConversation: ConversationSummary
  onOpenIntelligence: (tab?: IntelligenceTab) => void
  onSetConversationState?: (conversationId: string, state: ConversationSummary["status"]) => void
}) {
  const { status, setThinking, setIdle } = useSystemStore()

  const [feedItems, setFeedItems] = React.useState<FeedItem[]>(() => seedForConversation(activeConversation))
  const [composerValue, setComposerValue] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [workingOpen, setWorkingOpen] = React.useState(false)
  const [workingStepIndex, setWorkingStepIndex] = React.useState(0)
  const [workingDetail, setWorkingDetail] = React.useState<string | undefined>(undefined)

  const requestIdRef = React.useRef(0)
  const delayTimerRef = React.useRef<number | null>(null)
  const feedScrollRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    setFeedItems(seedForConversation(activeConversation))
    setComposerValue("")
  }, [activeConversation])

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

  const onApprovalAction = (action: "approve" | "edit" | "reject", _id: string) => {
    if (action === "approve") {
      onSetConversationState?.(activeConversation.id, "Executing")
      setFeedItems((prev) => [
        ...prev,
        { id: `exec_${Date.now()}`, type: "receipt", text: "Approved. Executing the queued actions now.", timestamp: formatTime() },
      ])
      onOpenIntelligence("Timeline")
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

  const liveTasks =
    status === "thinking" || workingOpen
      ? ["Syncing inbox", "Checking conflicts", "Waiting approval"]
      : ["Monitoring inbox", "Maintaining schedule", "Ready for instruction"]

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
