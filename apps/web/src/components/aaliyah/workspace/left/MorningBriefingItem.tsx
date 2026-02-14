"use client"

import { Sunrise } from "lucide-react"

import { cn } from "@/lib/utils"

export function MorningBriefingItem({
  selected,
  unread,
  onOpen,
}: {
  selected: boolean
  unread: boolean
  onOpen: () => void
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "w-full min-h-11 rounded-xl border border-borderSubtle px-4 py-4 text-left bg-[color:rgba(59,130,246,0.06)] hover:bg-[color:rgba(59,130,246,0.08)] transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focusRing)]",
        selected && "ring-1 ring-[color:rgba(59,130,246,0.22)]"
      )}
      aria-current={selected ? "page" : undefined}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-textPrimary">
            <Sunrise className="h-4 w-4 text-textSecondary" strokeWidth={1.5} />
            <span className="truncate">Morning Briefing</span>
          </div>
          <div className="mt-2 text-[12px] text-textSecondary leading-5">Pinned daily executive context</div>
        </div>

        <div className="flex items-center gap-2 pt-0">
          {unread && <span className="h-2 w-2 rounded-full bg-infoExecuting" aria-label="Unread" />}
        </div>
      </div>
    </button>
  )
}
