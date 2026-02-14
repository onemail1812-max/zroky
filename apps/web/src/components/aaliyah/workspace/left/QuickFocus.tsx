"use client"

import { cn } from "@/lib/utils"

function FocusRow({
  label,
  count,
  dotClassName,
}: {
  label: string
  count: number
  dotClassName: string
}) {
  return (
    <li className="flex items-center justify-between rounded-lg px-4 py-2 hover:bg-surface transition-colors">
      <span className="flex items-center gap-2 text-[13px] text-textSecondary">
        <span className={cn("h-2 w-2 rounded-full", dotClassName)} aria-hidden="true" />
        {label}
      </span>
      <span className="text-[13px] font-medium tabular-nums text-textPrimary">{count}</span>
    </li>
  )
}

export function QuickFocus({
  needsApproval,
  waitingReply,
  highPriority,
}: {
  needsApproval: number
  waitingReply: number
  highPriority: number
}) {
  return (
    <section>
      <h3 className="text-[11px] font-semibold tracking-[0.14em] text-textMuted">QUICK FOCUS</h3>
      <ul className="mt-2 space-y-2">
        <FocusRow label="Needs Approval" count={needsApproval} dotClassName="bg-warningWaiting" />
        <FocusRow label="Waiting Reply" count={waitingReply} dotClassName="bg-textMuted" />
        <FocusRow label="High Priority" count={highPriority} dotClassName="bg-infoExecuting" />
      </ul>
    </section>
  )
}
