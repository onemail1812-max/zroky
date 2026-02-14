"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import type { ConversationState, ConversationSummary } from "@/components/aaliyah/workspace/types"

const INDICATOR: Record<ConversationState, string> = {
  "Shadow Mode": "bg-borderSubtle",
  "Waiting Approval": "bg-warningWaiting",
  Executing: "bg-infoExecuting",
  Completed: "bg-borderSubtle",
  "Blocked by Rule": "bg-errorBlocked",
  "Needs Clarification": "bg-warningWaiting",
}

function statusDot(state: ConversationState) {
  if (state === "Executing") return "bg-infoExecuting"
  if (state === "Waiting Approval") return "bg-warningWaiting"
  if (state === "Blocked by Rule") return "bg-errorBlocked"
  if (state === "Completed") return "bg-borderSubtle"
  if (state === "Needs Clarification") return "bg-warningWaiting"
  return "bg-borderSubtle"
}

export function ActiveWorkItem({
  item,
  selected,
  onOpen,
  buttonRef,
}: {
  item: ConversationSummary
  selected: boolean
  onOpen: (id: string) => void
  buttonRef?: React.Ref<HTMLButtonElement>
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={() => onOpen(item.id)}
      className={cn(
        "relative w-full text-left rounded-lg border border-transparent px-4 py-4 min-h-[56px]",
        "hover:bg-surfaceElevated hover:border-borderSubtle transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focusRing)]",
        selected && "bg-surfaceElevated border-borderSubtle"
      )}
      role="option"
      aria-selected={selected}
    >
      <span
        className={cn("absolute left-0 top-2 bottom-2 w-[2px] rounded-full", INDICATOR[item.status])}
        aria-hidden="true"
      />

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="truncate text-[13px] font-semibold text-textPrimary leading-5">{item.title}</div>
          <div className="mt-2 truncate text-[12px] text-textSecondary leading-5">{item.subtitle}</div>
        </div>

        <div className="shrink-0 text-right">
          <div className="inline-flex items-center gap-2 rounded-lg border border-borderSubtle bg-surfaceElevated px-2 py-2 text-[11px] text-textSecondary">
            <span className={cn("h-2 w-2 rounded-full", statusDot(item.status))} aria-hidden="true" />
            <span className="whitespace-nowrap">{item.status}</span>
          </div>
          <div className="mt-2 text-[11px] text-textMuted tabular-nums">{item.timestamp}</div>
        </div>
      </div>
    </button>
  )
}
