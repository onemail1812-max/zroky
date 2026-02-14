"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

export function LiveStrip({
  tasks,
  active,
}: {
  tasks: string[]
  active: boolean
}) {
  return (
    <div className="h-8 border-b border-borderSubtle bg-surface px-4 md:px-6 text-[12px] text-textSecondary flex items-center gap-2">
      <span className="text-textSecondary font-medium">Aaliyah is currently:</span>
      {tasks.map((task, index) => (
        <React.Fragment key={`${task}_${index}`}>
          <span className={cn(index === 0 && active && "text-textPrimary animate-pulse-soft")}>{task}</span>
          {index < tasks.length - 1 && <span className="text-textMuted">{"\u2022"}</span>}
        </React.Fragment>
      ))}
    </div>
  )
}
