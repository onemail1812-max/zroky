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

const LABEL_COLORS: Record<string, string> = {
  "Urgent": "bg-rose-100 text-rose-700 border-rose-200/60",
  "High Priority": "bg-red-100 text-red-700 border-red-200/60",
  "Meeting": "bg-blue-100 text-blue-700 border-blue-200/60",
  "Money": "bg-amber-100 text-amber-700 border-amber-200/60",
  "Legal": "bg-purple-100 text-purple-700 border-purple-200/60",
  "Complaint": "bg-orange-100 text-orange-700 border-orange-200/60",
  "Hiring": "bg-teal-100 text-teal-700 border-teal-200/60",
  "Awaiting Reply": "bg-sky-100 text-sky-700 border-sky-200/60",
  "Receipt": "bg-emerald-100 text-emerald-700 border-emerald-200/60",
  "FYI": "bg-indigo-100 text-indigo-600 border-indigo-200/60",
}

const DEFAULT_LABEL_COLOR = "bg-zinc-100 text-zinc-600 border-zinc-200/60"

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
  const visibleLabels = (item.labels || []).filter(l => l !== "Actioned" && l !== "Cleaned" && l !== "Notification" && l !== "Newsletter").slice(0, 3)

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
          {visibleLabels.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {visibleLabels.map(label => (
                <span
                  key={label}
                  className={cn(
                    "inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold border",
                    LABEL_COLORS[label] || DEFAULT_LABEL_COLOR
                  )}
                >
                  {label}
                </span>
              ))}
            </div>
          )}
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
