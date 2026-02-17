"use client"
import * as React from "react"
import {
    AlertOctagon,
    MessageSquare,
    CheckCircle2,
    Clock,
    Info,
    Sparkles,
    FileText
} from "lucide-react"
import { cn } from "@/lib/utils"

export function LeftSidebar({ currentSection, onNavigate, counts, hasUnread }: { currentSection?: string; onNavigate?: (section: string) => void; counts?: any; hasUnread?: (section: string) => boolean }) {
    return (
        <aside className="flex flex-col w-full h-full bg-white border-r border-zinc-100">
            {/* Identity */}
            <div className="h-20 px-4 flex items-center gap-2.5 border-b border-zinc-100 shrink-0">
                <div className="h-7 w-7 rounded-lg bg-zinc-900 flex items-center justify-center text-white text-xs font-bold">A</div>
                <div className="flex flex-col">
                    <span className="text-sm font-semibold text-zinc-900 leading-tight">Aaliyah</span>
                    <span className="text-[10px] text-zinc-400 font-medium leading-tight">workspace</span>
                </div>
            </div>

            {/* Queues */}
            <nav className="flex-1 flex flex-col gap-0.5 p-2 pt-7">
                <NavItem icon={AlertOctagon} label="Priority" active={currentSection === "priority"} count={counts?.priority} unread={hasUnread?.("priority")} onClick={() => onNavigate?.("priority")} />
                <NavItem icon={MessageSquare} label="Needs Reply" active={currentSection === "needs_reply"} count={counts?.needs_reply} unread={hasUnread?.("needs_reply")} onClick={() => onNavigate?.("needs_reply")} />
                <NavItem icon={CheckCircle2} label="Approvals" active={currentSection === "approvals"} count={counts?.approvals} unread={hasUnread?.("approvals")} onClick={() => onNavigate?.("approvals")} />
                <NavItem icon={Clock} label="Follow-ups" active={currentSection === "follow_ups"} count={counts?.follow_ups} unread={hasUnread?.("follow_ups")} onClick={() => onNavigate?.("follow_ups")} />

                <div className="h-px bg-zinc-100 my-2 mx-3" />

                <NavItem icon={Info} label="FYI" active={currentSection === "fyi"} count={counts?.fyi} unread={hasUnread?.("fyi")} onClick={() => onNavigate?.("fyi")} />
                <NavItem icon={Sparkles} label="Cleaned" active={currentSection === "cleaned"} count={counts?.cleaned} unread={hasUnread?.("cleaned")} onClick={() => onNavigate?.("cleaned")} />
                <NavItem icon={FileText} label="Drafts" active={currentSection === "drafts"} count={counts?.drafts} unread={hasUnread?.("drafts")} onClick={() => onNavigate?.("drafts")} />
            </nav>
        </aside>
    )
}

function NavItem({ icon: Icon, label, count, active, onClick, unread }: { icon: any; label: string; count?: number; active?: boolean; onClick?: () => void, unread?: boolean }) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-left group relative",
                active ? "bg-zinc-900 text-white shadow-md shadow-black/10" : "text-zinc-700 hover:bg-zinc-50"
            )}
        >
            <div className="relative">
                <Icon className={cn("h-4 w-4 shrink-0", active ? "text-white" : "text-zinc-400")} />
                {unread && !active && (
                    <div className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-red-500 rounded-full border-2 border-white" />
                )}
            </div>
            <span className="text-sm font-medium flex-1">{label}</span>
            {count !== undefined && count > 0 && (
                <span className={cn(
                    "text-[10px] font-black px-1.5 py-0.5 rounded-md flex items-center justify-center min-w-[18px] transition-all",
                    unread
                        ? "bg-red-500 text-white shadow-[0_2px_8px_rgba(239,68,68,0.3)] animate-pulse"
                        : (active ? "bg-white/20 text-white" : "bg-zinc-100 text-zinc-500")
                )}>{count}</span>
            )}
        </button>
    )
}
