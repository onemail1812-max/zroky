import * as React from "react"
import {
    Flame,
    MessageSquare,
    Clock,
    Info,
    Sparkles,
    FileText,
    Activity,
    AlertCircle,
    LayoutDashboard,
    Settings,
    BookOpen,
    Archive,
    PenSquare,
    Terminal
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useSystemStore } from "@/lib/aaliyah/store"

export function LeftSidebar({
    onOpenGuidelines,
    onOpenSettings,
    onOpenDiagnostics,
    onNavigate,
    disabled,
    isConnected = true
}: {
    onOpenGuidelines?: () => void;
    onOpenSettings?: () => void;
    onOpenDiagnostics?: () => void;
    onNavigate?: (section: string) => void;
    disabled?: boolean;
    isConnected?: boolean;
}) {
    const {
        activeTriageQueue,
        setActiveTriageQueue,
        triagedCount,
        priorityCount,
        queuedCount,
        pendingApprovals,
        escalations,
        unreadQueues
    } = useSystemStore()

    const counts = {
        priority: priorityCount,
        needs_reply: queuedCount,
        approvals: pendingApprovals,
        follow_ups: escalations,
        cleaned: 0 // TODO: Add to store if needed
    }
    return (
        <aside className={cn(
            "flex flex-col w-full h-full bg-[#fcfcfc] border-r border-zinc-200/50 shadow-[2px_0_24px_rgba(0,0,0,0.02)] transition-opacity duration-300 relative"
        )}>
            {/* Ambient Background Gradient for Premium Feel */}
            <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-br from-indigo-50/50 via-white to-transparent opacity-50 pointer-events-none" />

            {/* Identity Header */}
            <div className="h-16 px-5 flex items-center gap-3 border-b border-zinc-200/50 shrink-0 relative z-10 bg-white/40 backdrop-blur-md">
                <div className="relative">
                    {/* Soft glowing ring */}
                    <div className="absolute -inset-1 rounded-xl bg-gradient-to-tr from-indigo-500/20 to-violet-500/20 blur-sm mix-blend-multiply" />
                    <div className="relative h-10 w-10 overflow-hidden rounded-[10px] bg-white flex items-center justify-center shadow-md ring-1 ring-black/5">
                        <img
                            src="/app-logo.png"
                            alt="Aaliyah Logo"
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <div className={cn(
                        "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-white shadow-sm",
                        isConnected ? "bg-emerald-500" : "bg-red-500 animate-pulse"
                    )} />
                </div>
                <div className="flex flex-col">
                    <span className="text-sm font-black tracking-tight text-zinc-900 leading-none">Aaliyah</span>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Executive Assistant</span>
                </div>
            </div>

            {/* Navigation Queues */}
            <nav className={cn(
                "flex-1 flex flex-col gap-1 p-3 pt-6 relative z-10 overflow-y-auto custom-scrollbar transition-opacity duration-300",
                disabled && "opacity-40 pointer-events-none grayscale"
            )}>
                <div className="px-3 mb-2">
                    <h4 className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase">Focus</h4>
                </div>

                <NavItem icon={Flame} label="Priority" active={activeTriageQueue === "priority"} count={counts.priority} unread={unreadQueues.includes("priority")} onClick={() => onNavigate?.("priority")} colorClass="text-rose-500" />
                <NavItem icon={MessageSquare} label="Needs Reply" active={activeTriageQueue === "needs_reply"} count={counts.needs_reply} unread={unreadQueues.includes("needs_reply")} onClick={() => onNavigate?.("needs_reply")} colorClass="text-amber-500" />
                <NavItem icon={Clock} label="Approvals" active={activeTriageQueue === "approvals"} count={counts.approvals} unread={unreadQueues.includes("approvals")} onClick={() => onNavigate?.("approvals")} colorClass="text-indigo-500" />
                <NavItem icon={AlertCircle} label="Follow-ups" active={activeTriageQueue === "follow_ups"} count={counts.follow_ups} unread={unreadQueues.includes("follow_ups")} onClick={() => onNavigate?.("follow_ups")} colorClass="text-violet-500" />

                <div className="px-3 mb-2 mt-6">
                    <h4 className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase">Archive</h4>
                </div>
                <NavItem icon={Archive} label="Cleaned" active={activeTriageQueue === "cleaned"} count={counts.cleaned} unread={unreadQueues.includes("cleaned")} onClick={() => onNavigate?.("cleaned")} colorClass="text-zinc-400" />
            </nav>

            {/* Sidebar Footer: Settings & Guidelines */}
            <div className="p-4 mt-auto relative z-10 bg-white/40 backdrop-blur-md flex flex-col gap-1">
                <button
                    onClick={(e) => {
                        e.stopPropagation()
                        onOpenGuidelines?.()
                    }}
                    className="flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-zinc-500 hover:bg-zinc-900 hover:text-white transition-all duration-300 group hover:shadow-lg hover:shadow-zinc-900/10 hover:-translate-y-0.5 active:scale-95 text-left w-full"
                >
                    <BookOpen className="h-4 w-4 text-zinc-400 group-hover:text-white transition-colors" strokeWidth={2.5} />
                    <span className="text-[13.5px] font-medium tracking-tight">Guidelines</span>
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation()
                        onOpenSettings?.()
                    }}
                    className="flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-zinc-500 hover:bg-zinc-900 hover:text-white transition-all duration-300 group hover:shadow-lg hover:shadow-zinc-900/10 hover:-translate-y-0.5 active:scale-95 text-left w-full"
                >
                    <Settings className="h-4 w-4 text-zinc-400 group-hover:text-white transition-colors" strokeWidth={2.5} />
                    <span className="text-[13.5px] font-medium tracking-tight">Settings</span>
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation()
                        onOpenDiagnostics?.()
                    }}
                    className="flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-zinc-500 hover:bg-zinc-900 hover:text-white transition-all duration-300 group hover:shadow-lg hover:shadow-zinc-900/10 hover:-translate-y-0.5 active:scale-95 text-left w-full"
                >
                    <Terminal className="h-4 w-4 text-zinc-400 group-hover:text-white transition-colors" strokeWidth={2.5} />
                    <span className="text-[13.5px] font-medium tracking-tight">Diagnostics</span>
                </button>
            </div>
        </aside>
    )
}

function NavItem({
    icon: Icon,
    label,
    count,
    active,
    onClick,
    unread,
    colorClass
}: {
    icon: any;
    label: string;
    count?: number;
    active?: boolean;
    onClick?: () => void;
    unread?: boolean;
    colorClass?: string;
}) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "flex items-center gap-3.5 px-3 py-2.5 rounded-xl transition-all duration-200 text-left group relative",
                active
                    ? "bg-white text-zinc-900 shadow-[0_2px_12px_rgba(0,0,0,0.04)] ring-1 ring-zinc-200/50"
                    : "text-zinc-600 hover:bg-zinc-100/80 hover:text-zinc-900"
            )}
        >
            <div className={cn(
                "relative flex items-center justify-center transition-colors",
                active ? "scale-110" : "group-hover:scale-110"
            )}>
                <Icon className={cn(
                    "h-4 w-4 shrink-0 transition-colors duration-200",
                    active ? colorClass : "text-zinc-400 group-hover:text-zinc-600"
                )} strokeWidth={2.5} />
                {unread && !active && (
                    <div className="absolute -top-1 -right-1 h-2 w-2 bg-rose-500 rounded-full border border-white" />
                )}
            </div>

            <span className={cn(
                "text-[13.5px] font-medium flex-1 tracking-tight",
                active ? "font-semibold" : ""
            )}>
                {label}
            </span>

            {count !== undefined && count > 0 && (
                <span className={cn(
                    "text-[10px] font-bold tabular-nums px-2 py-[2px] rounded-full flex items-center justify-center transition-all",
                    unread
                        ? "bg-rose-100 text-rose-600 border border-rose-200/50"
                        : (active ? "bg-zinc-100 text-zinc-900 border border-zinc-200/50" : "text-zinc-400 group-hover:bg-white group-hover:shadow-sm")
                )}>{count}</span>
            )}

            {/* Active Indicator Bar */}
            {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-zinc-800 rounded-r-full" />
            )}
        </button>
    )
}
