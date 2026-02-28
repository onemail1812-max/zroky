"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import type { PresenceState } from "@/components/aaliyah/workspace/left/PresenceBadge"
import { PresenceBadge } from "@/components/aaliyah/workspace/left/PresenceBadge"
import { useSystemStore } from "@/lib/aaliyah/store"
import { Sun, Flame, Clock, Info, Activity, Archive, Plus } from "lucide-react"

export function LeftPanel({
  presence,
  briefingUnread,
  selectedId,
  loading,
  onOpenMorningBriefing,
  onOpenSettings,
}: {
  presence: PresenceState
  briefingUnread: boolean
  selectedId: string
  loading?: boolean
  onOpenMorningBriefing: () => void
  onOpenSettings?: () => void
}) {
  const { actionLogs, activeTriageQueue, setActiveTriageQueue, inboxItems, activeView, setActiveView } = useSystemStore()
  const recentLogs = actionLogs.slice(-5)

  // Calculate dynamic counts based on the inbox
  const priorityCount = inboxItems.filter(i => (i.priority === "urgent" || i.priority === "high") && !i.is_read).length
  const replyCount = inboxItems.filter(i => i.category === "needs_reply" && !i.is_read).length
  const approvalCount = inboxItems.filter(i => !!i.requires_approval && !i.is_read).length
  const followupCount = inboxItems.filter(i => (i.category === "fyi" || i.category === "followup") && !i.is_read).length

  return (
    <aside className="h-full w-full bg-zinc-50/50 backdrop-blur-3xl border-r border-zinc-200/60 p-5 overflow-hidden flex flex-col relative antialiased">
      {/* Soft Top Glow */}
      <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-white to-transparent pointer-events-none z-0" />

      <div className="relative z-10 shrink-0 mb-6 px-1 flex flex-col gap-6">
        <PresenceBadge state={presence} />

        <button
          onClick={() => useSystemStore.getState().openCompose()}
          className="w-full h-12 rounded-2xl bg-textPrimary text-surface font-bold text-[14px] flex items-center justify-center gap-2 shadow-lg shadow-zinc-200/50 hover:bg-black hover:scale-[1.02] active:scale-95 transition-all"
        >
          <Plus className="h-4 w-4" strokeWidth={3} />
          Compose
        </button>
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto pr-1 space-y-8 custom-scrollbar pb-10">

        {/* Action Streams Section */}
        <section>
          <div className="flex items-center gap-2 mb-4 px-2">
            <h3 className="text-[10px] font-bold tracking-[0.2em] text-zinc-400 uppercase">
              Action Streams
            </h3>
            <div className="h-[1px] flex-1 bg-gradient-to-r from-zinc-200/50 to-transparent" />
          </div>

          <div className="space-y-2">
            <StreamCard
              id="all"
              label="All Mail"
              icon={Activity}
              iconColor="text-zinc-500"
              iconBg="bg-zinc-100/50"
              selected={activeTriageQueue === "all"}
              onClick={() => setActiveTriageQueue("all")}
              badge={null}
            />

            <StreamCard
              id="priority"
              label="Priority ✨"
              icon={Flame}
              iconColor="text-rose-500"
              iconBg="bg-rose-100/50"
              selected={activeTriageQueue === "priority"}
              onClick={() => setActiveTriageQueue("priority")}
              badge={priorityCount > 0 ? (
                <span className="text-[10px] font-bold tabular-nums px-2 py-0.5 rounded-full bg-rose-100 text-rose-600 border border-rose-200/50">
                  {priorityCount}
                </span>
              ) : null}
            />

            <StreamCard
              id="needs_reply"
              label="Needs Reply"
              icon={Clock}
              iconColor="text-amber-500"
              iconBg="bg-amber-100/50"
              selected={activeTriageQueue === "needs_reply"}
              onClick={() => setActiveTriageQueue("needs_reply")}
              badge={replyCount > 0 ? (
                <span className="text-[10px] font-bold tabular-nums px-2 py-0.5 rounded-full bg-amber-100 text-amber-600 border border-amber-200/50">
                  {replyCount}
                </span>
              ) : null}
            />

            <StreamCard
              id="approvals"
              label="Approvals"
              icon={Sun}
              iconColor="text-indigo-500"
              iconBg="bg-indigo-100/50"
              selected={activeTriageQueue === "approvals"}
              onClick={() => setActiveTriageQueue("approvals")}
              badge={approvalCount > 0 ? (
                <span className="text-[10px] font-bold tabular-nums px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-600 border border-indigo-200/50">
                  {approvalCount}
                </span>
              ) : null}
            />

            <StreamCard
              id="follow_ups"
              label="Followup"
              icon={Info}
              iconColor="text-emerald-500"
              iconBg="bg-emerald-100/50"
              selected={activeTriageQueue === "follow_ups"}
              onClick={() => setActiveTriageQueue("follow_ups")}
              badge={followupCount > 0 ? (
                <span className="text-[10px] font-bold tabular-nums px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-600 border border-emerald-200/50">
                  {followupCount}
                </span>
              ) : null}
            />
          </div>
        </section>

        {/* Memory Section */}
        <section>
          <div className="flex items-center gap-2 mb-4 px-2">
            <h3 className="text-[10px] font-bold tracking-[0.2em] text-zinc-400 uppercase">
              Memory
            </h3>
            <div className="h-[1px] flex-1 bg-gradient-to-r from-zinc-200/50 to-transparent" />
          </div>

          <div className="space-y-2">
            <StreamCard
              id="action_log"
              label="Action Log"
              icon={Archive}
              iconColor="text-violet-500"
              iconBg="bg-violet-100/50"
              selected={activeView === "action_log"}
              onClick={() => setActiveView("action_log")}
              badge={null}
            />
          </div>
        </section>
      </div>

      {/* Cinematic Brain Log Bottom Section */}
      <div className="relative z-10 shrink-0 mt-4 pt-5">
        {/* Subtle dividing line */}
        <div className="absolute top-0 inset-x-4 h-[1px] bg-gradient-to-r from-transparent via-zinc-200/60 to-transparent" />

        <h3 className="text-[10px] font-bold tracking-[0.2em] text-zinc-400 uppercase mb-3 px-2 flex items-center gap-2">
          <div className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-60"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
          </div>
          Live Brain Log
        </h3>

        <div className="relative h-32 rounded-2xl bg-white border border-zinc-200/60 shadow-[0_4px_24px_rgba(0,0,0,0.03)] overflow-hidden flex flex-col justify-end p-3">
          {/* Gradient fade out effect on top elements inside the log */}
          <div className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-white via-white/80 to-transparent z-10"></div>

          <div className="flex flex-col gap-2 relative z-0 justify-end h-full">
            {recentLogs.length === 0 ? (
              <div className="flex items-center gap-2 text-[11px] text-zinc-400 animate-pulse px-1">
                <Activity className="h-3 w-3" />
                <span>Aaliyah network listening...</span>
              </div>
            ) : (
              recentLogs.map((log, i) => (
                <div key={`${log.timestamp}-${i}`} className="flex items-start gap-2 text-[11px] px-1 animate-in slide-in-from-bottom-2 fade-in duration-300">
                  <span className="text-zinc-400 font-mono shrink-0 mt-[1px]">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="text-zinc-600 font-medium leading-snug line-clamp-2">
                    {log.details}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </aside>
  )
}

function StreamCard({
  id,
  label,
  icon: Icon,
  iconColor,
  iconBg,
  selected,
  onClick,
  badge
}: {
  id: string
  label: string
  icon: any
  iconColor: string
  iconBg: string
  selected: boolean
  onClick: () => void
  badge: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center justify-between p-3 rounded-2xl text-[13px] font-semibold transition-all group outline-none",
        selected
          ? "bg-white text-zinc-900 shadow-[0_8px_30px_rgba(0,0,0,0.04)] ring-1 ring-zinc-200/60"
          : "text-zinc-500 hover:bg-white/60 hover:text-zinc-800 border border-transparent hover:shadow-[0_2px_12px_rgba(0,0,0,0.02)]"
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          "h-8 w-8 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105",
          selected ? iconBg : "bg-zinc-100/80 group-hover:bg-zinc-100"
        )}>
          <Icon className={cn("h-4 w-4", selected ? iconColor : "text-zinc-400 group-hover:text-zinc-600")} strokeWidth={2.5} />
        </div>
        <span>{label}</span>
      </div>
      {badge && <div className="shrink-0">{badge}</div>}
    </button>
  )
}

