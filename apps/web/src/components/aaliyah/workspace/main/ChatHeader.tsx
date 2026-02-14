"use client"

import * as React from "react"
import { FileText, PenSquare, Settings } from "lucide-react"

import { cn } from "@/lib/utils"
import type { ConversationState } from "@/components/aaliyah/workspace/types"

function StatusBadge({ state }: { state: ConversationState }) {
  const dot =
    state === "Executing"
      ? "bg-infoExecuting"
      : state === "Waiting Approval" || state === "Needs Clarification"
        ? "bg-warningWaiting"
        : state === "Blocked by Rule"
          ? "bg-errorBlocked"
          : state === "Completed"
            ? "bg-borderSubtle"
            : "bg-borderSubtle"

  return (
    <span className="inline-flex items-center gap-2 rounded-lg border border-borderSubtle bg-surfaceElevated px-2 py-2 text-[11px] text-textSecondary">
      <span className={cn("h-2 w-2 rounded-full", dot)} aria-hidden="true" />
      <span className="whitespace-nowrap">{state}</span>
    </span>
  )
}

function HeaderIconButton({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={title}
      title={title}
      className={cn(
        "h-11 w-11 md:h-10 md:w-10 rounded-lg border border-borderSubtle bg-surface text-textSecondary",
        "hover:bg-surfaceElevated hover:text-textPrimary transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focusRing)]",
        "flex items-center justify-center"
      )}
    >
      {children}
    </button>
  )
}

export function ChatHeader({
  title,
  timestamp,
  state,
}: {
  title: string
  timestamp: string
  state: ConversationState
}) {
  return (
    <header className="h-16 border-b border-borderSubtle bg-appBg px-4 md:px-6 flex items-center justify-between">
      <div className="min-w-0">
        <h1 className="truncate text-[20px] font-semibold text-textPrimary leading-6">{title}</h1>
        <div className="mt-2 flex items-center gap-2">
          <StatusBadge state={state} />
          <span className="text-[12px] text-textMuted tabular-nums">{timestamp}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <HeaderIconButton title="Edit">
          <PenSquare className="h-5 w-5" strokeWidth={1.5} />
        </HeaderIconButton>
        <HeaderIconButton title="Guidelines">
          <FileText className="h-5 w-5" strokeWidth={1.5} />
        </HeaderIconButton>
        <HeaderIconButton title="Settings">
          <Settings className="h-5 w-5" strokeWidth={1.5} />
        </HeaderIconButton>
      </div>
    </header>
  )
}
