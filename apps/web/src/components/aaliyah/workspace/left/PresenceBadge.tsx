"use client"

import Image from "next/image"
import { cn } from "@/lib/utils"

export type PresenceState = "online" | "idle" | "working"

const STATE_CONFIG: Record<PresenceState, { label: string; ringColor: string; dotColor: string }> = {
  online: {
    label: "Online",
    ringColor: "ring-successOnline/20",
    dotColor: "bg-successOnline",
  },
  idle: {
    label: "Idle",
    ringColor: "ring-textMuted/20",
    dotColor: "bg-textMuted",
  },
  working: {
    label: "Thinking",
    ringColor: "ring-infoExecuting/30",
    dotColor: "bg-infoExecuting",
  },
}

export function PresenceBadge({
  state,
  avatarSrc = "/employees/aaliyah.png",
}: {
  state: PresenceState
  avatarSrc?: string
}) {
  const config = STATE_CONFIG[state]

  return (
    <section className="flex items-center gap-4 py-2">
      <div className="relative group">
        <div className={cn(
          "relative h-12 w-12 overflow-hidden rounded-full border border-borderSubtle bg-surfaceElevated transition-all duration-500",
          state === 'working' && "border-infoExecuting/50 shadow-[0_0_12px_-2px_rgba(59,130,246,0.3)]"
        )}>
          <Image src={avatarSrc} alt="Aaliyah" fill sizes="48px" className="object-cover object-[50%_17%] grayscale-[10%] group-hover:grayscale-0 transition-all duration-500" priority />
        </div>

        {/* Status indicator badge */}
        <div className={cn(
          "absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-surface border-[2px] border-surface flex items-center justify-center",
        )}>
          <span className={cn("h-2 w-2 rounded-full", config.dotColor, state === 'working' && "animate-pulse-slow")} />
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <div className="text-[14px] font-medium text-textPrimary leading-none tracking-tight">Aaliyah</div>
          {state === 'working' && (
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-infoExecuting opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-infoExecuting"></span>
            </span>
          )}
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          <span className="text-[12px] text-textSecondary font-medium">{config.label}</span>
          <span className="text-[12px] text-textMuted scale-75">•</span>
          <span className="text-[12px] text-textMuted truncate">Executive Assistant</span>
        </div>
      </div>
    </section>
  )
}
