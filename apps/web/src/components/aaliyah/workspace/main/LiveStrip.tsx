"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { useSystemStore } from "@/lib/aaliyah/store"

export function LiveStrip({
  tasks,
  active,
}: {
  tasks: string[]
  active: boolean
}) {
  const { actionLogs } = useSystemStore()
  const latestLog = actionLogs[0]

  return (
    <div className="h-8 border-b border-borderSubtle bg-surface px-4 md:px-6 text-[11px] text-textSecondary flex items-center justify-between gap-4 overflow-hidden">
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-textMuted font-bold uppercase tracking-tighter">Status:</span>
        <div className="flex gap-2 items-center">
          {tasks.map((task, index) => (
            <React.Fragment key={`${task}_${index}`}>
              <span className={cn("whitespace-nowrap", index === 0 && active && "text-textPrimary font-semibold animate-pulse")}>{task}</span>
              {index < tasks.length - 1 && <span className="text-textMuted/30">{"\u2022"}</span>}
            </React.Fragment>
          ))}
        </div>
      </div>

      {latestLog && (
        <div className="flex-1 flex justify-end overflow-hidden">
          <div className="flex items-center gap-2 text-textMuted font-medium animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500/50 shadow-[0_0_8px_rgba(16,185,129,0.3)]" />
            <span className="truncate max-w-[400px] italic">
              {latestLog.action}: {latestLog.details}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
