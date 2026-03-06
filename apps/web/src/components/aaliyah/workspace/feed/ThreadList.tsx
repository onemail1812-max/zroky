"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Archive,
    Star,
    Clock,
    CircleDollarSign,
    Calendar,
    MoreHorizontal,
    Reply,
    SquarePen,
    History,
    AlertCircle,
    Sparkles
} from "lucide-react"
import { cn } from "@/lib/utils"

import { EmailMessage, inboxService } from "@/services/inbox.service"
import { SkeletonEmail } from "@/components/ui/Skeleton"

// Helper for email time formatting
function formatEmailTime(dateString: string) {
    if (!dateString) return "";

    // Attempt to parse the date safely
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";

    const now = new Date();
    const isToday = date.getDate() === now.getDate() &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear();

    if (isToday) {
        // Show time for today's emails (e.g. "10:30 AM")
        return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    } else {
        // Show date for older emails (e.g. "Oct 24")
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }
}

// Disconnected / Offline State
function DisconnectedState({ onConnect }: { onConnect: () => void }) {
    return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-700 bg-zinc-50/30">
            <div className="relative mb-6">
                <div className="h-16 w-16 rounded-3xl bg-white flex items-center justify-center border border-zinc-100 shadow-sm">
                    <AlertCircle className="h-8 w-8 text-zinc-400" />
                </div>
                <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-amber-500 border-2 border-white flex items-center justify-center">
                    <Clock className="h-3 w-3 text-white" />
                </div>
            </div>
            <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-widest mb-2">Service Offline</h3>
            <p className="text-xs text-zinc-500 max-w-[220px] leading-relaxed mb-6">
                Your workspace is disconnected. I need access to your inbox to triage your priority items.
            </p>
            <button
                onClick={onConnect}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-zinc-900 text-white text-xs font-bold rounded-xl hover:bg-black transition-all active:scale-95 shadow-lg shadow-zinc-900/10"
            >
                Connect Inbox
            </button>
        </div>
    );
}

// Empty State Component
function EmptyState() {
    return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="h-16 w-16 rounded-3xl bg-zinc-50 flex items-center justify-center mb-6 border border-zinc-100">
                <Sparkles className="h-8 w-8 text-zinc-300" />
            </div>
            <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-widest mb-2">Inbox is Clean</h3>
            <p className="text-xs text-zinc-500 max-w-[200px] leading-relaxed">
                Aaliyah is monitoring your connections. New priority items will appear here automatically.
            </p>
        </div>
    );
}

export const ThreadList = React.memo(function ThreadList({
    onSelect,
    selectedId,
    filter,
    refreshTrigger,
    seenIds = new Set(),
    isConnected = true,
    onConnect
}: {
    onSelect: (email: EmailMessage) => void;
    selectedId?: string | null;
    filter?: string;
    refreshTrigger?: number;
    seenIds?: Set<string>;
    isConnected?: boolean;
    onConnect?: () => void;
}) {
    const [emails, setEmails] = React.useState<EmailMessage[]>([])
    const [loading, setLoading] = React.useState(true)

    const load = async () => {
        if (!isConnected) {
            setLoading(false);
            return;
        }
        setLoading(true)

        try {
            const res = await inboxService.getInbox(filter || "all")
            const apiEmails = res.data || []

            if (apiEmails.length > 0) {
                setEmails(apiEmails.sort((a, b) =>
                    new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
                ))
            } else {
                setEmails([])
            }
        } catch (e) {
            console.error(e)
            setEmails([])
        } finally {
            setLoading(false)
        }
    }

    React.useEffect(() => {
        load()
    }, [filter, refreshTrigger, isConnected])

    if (!isConnected) {
        return <DisconnectedState onConnect={onConnect || (() => { })} />
    }

    if (loading && emails.length === 0) {
        return (
            <div className="flex-1 animate-in">
                {[...Array(5)].map((_, i) => <SkeletonEmail key={i} />)}
            </div>
        )
    }

    if (!loading && emails.length === 0) {
        return <EmptyState />
    }

    return (
        <div className="h-full overflow-y-auto custom-scrollbar">
            {emails.map((email, idx) => {
                const isUnseen = !email.isRead;
                return (
                    <div
                        key={`${email.id}_${idx}`}
                        onClick={() => onSelect(email)}
                        className={cn(
                            "px-4 py-3 cursor-pointer transition-all border-b border-zinc-100 hover:bg-zinc-50 relative",
                            selectedId === email.id && "bg-zinc-100 border-l-2 border-l-zinc-900",
                            isUnseen && "bg-white"
                        )}
                    >
                        {isUnseen && (
                            <div className="absolute left-1 top-1/2 -translate-y-1/2 h-1.5 w-1.5 bg-blue-600 rounded-full" />
                        )}
                        {/* Row 1: Sender (bold) + Time + Provider */}
                        <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                <span className="text-sm font-bold text-zinc-900 truncate">
                                    {email.sender.name ? `${email.sender.name} (${email.sender.email})` : email.sender.email}
                                </span>
                                <div className={cn(
                                    "h-4 w-4 shrink-0 rounded-full flex items-center justify-center text-[8px] font-black text-white",
                                    email.provider === "google" ? "bg-red-500" : "bg-blue-600"
                                )}>
                                    {email.provider === "google" ? "G" : "O"}
                                </div>
                            </div>
                            <span className="text-xs text-zinc-400 ml-2 shrink-0">
                                {formatEmailTime(email.receivedAt)}
                            </span>
                        </div>

                        {/* Row 2: Subject (one line) */}
                        <div className="text-sm font-medium text-zinc-700 truncate mb-0.5">
                            {email.subject || "(No Subject)"}
                        </div>

                        {/* Row 3: Snippet (one line) */}
                        <div className="text-xs text-zinc-500 truncate mb-2">
                            {email.snippet}
                        </div>

                        {/* Row 4: Status Chips + Tags */}
                        <div className="flex flex-wrap gap-1.5">
                            {email.needsClarity && (
                                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                                    Needs Clarity
                                </span>
                            )}
                            {email.draft && (
                                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    Draft ready
                                </span>
                            )}
                            {email.draft?.status === 'pending_approval' && (
                                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded bg-amber-50 text-amber-700 border border-amber-200">
                                    Approval needed
                                </span>
                            )}
                            {email.labels?.includes("priority") && (
                                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded bg-red-50 text-red-600 border border-red-100">
                                    Urgent
                                </span>
                            )}
                            {email.labels?.includes("vip") && (
                                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded bg-purple-50 text-purple-600 border border-purple-100">
                                    VIP
                                </span>
                            )}
                        </div>
                    </div>
                )
            })}
        </div>
    )
})
