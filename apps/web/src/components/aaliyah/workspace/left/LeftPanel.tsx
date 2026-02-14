"use client"

import * as React from "react"

import type { ConversationSummary } from "@/components/aaliyah/workspace/types"
import type { PresenceState } from "@/components/aaliyah/workspace/left/PresenceBadge"
import { PresenceBadge } from "@/components/aaliyah/workspace/left/PresenceBadge"
import { MorningBriefingItem } from "@/components/aaliyah/workspace/left/MorningBriefingItem"
import { QuickFocus } from "@/components/aaliyah/workspace/left/QuickFocus"
import { ActiveWorkList } from "@/components/aaliyah/workspace/left/ActiveWorkList"

export function LeftPanel({
  presence,
  briefingUnread,
  selectedId,
  activeWork,
  quickFocus,
  loading,
  onOpenMorningBriefing,
  onOpenWorkItem,
}: {
  presence: PresenceState
  briefingUnread: boolean
  selectedId: string
  activeWork: ConversationSummary[]
  quickFocus: { needsApproval: number; waitingReply: number; highPriority: number }
  loading?: boolean
  onOpenMorningBriefing: () => void
  onOpenWorkItem: (id: string) => void
}) {
  return (
    <aside className="h-full w-full bg-surfaceElevated border-r border-borderSubtle p-6 overflow-y-auto">
      <PresenceBadge state={presence} />

      <div className="mt-6">
        <MorningBriefingItem selected={selectedId === "morning-briefing"} unread={briefingUnread} onOpen={onOpenMorningBriefing} />
      </div>

      <div className="mt-6">
        <QuickFocus {...quickFocus} />
      </div>

      <div className="mt-6">
        <ActiveWorkList items={activeWork} selectedId={selectedId} loading={loading} onOpen={onOpenWorkItem} />
      </div>
    </aside>
  )
}

