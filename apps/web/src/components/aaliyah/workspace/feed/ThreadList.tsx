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

// Helper for relative time
function timeAgo(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = (now.getTime() - date.getTime()) / 1000;
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString();
}

// Demo threads for testing
const DEMO_THREADS: Record<string, EmailMessage[]> = {
    priority: [{
        id: "demo-priority-1",
        provider: "google",
        sender: { name: "Rahul Sharma", email: "rahul@techcorp.com" },
        subject: "Q4 Revenue Report — Urgent Review Required",
        snippet: "Hi, please review the attached Q4 revenue report before our board meeting tomorrow. The numbers need your sign-off before we...",
        bodyCleaned: "Hi,\n\nPlease review the attached Q4 revenue report before our board meeting tomorrow morning.\n\nThe numbers need your sign-off before we can finalize the presentation. Key highlights:\n\n• Revenue up 23% YoY\n• EBITDA margins improved to 18.5%\n• Three new enterprise clients onboarded\n\nLet me know if you have any questions.\n\nBest,\nRahul Sharma\nHead of Finance, TechCorp",
        receivedAt: new Date(Date.now() - 25 * 60000).toISOString(),
        isRead: false,
        isPrimaryAccount: true,
        labels: ["priority", "vip"],
        draft: {
            id: "demo-draft-1",
            subject: "Re: Q4 Revenue Report — Urgent Review Required",
            body: "Hi Rahul,\n\nThank you for sharing the Q4 report. The numbers look strong. I'll review the detailed breakdown and provide my sign-off by end of day.\n\nRegards",
            status: "ready",
            reasoning: "High-priority financial review from VIP sender. Drafted a concise acknowledgment."
        }
    }],
    needs_reply: [{
        id: "demo-reply-1",
        provider: "google",
        sender: { name: "Sarah Jenkins", email: "sarah.j@designpartners.co" },
        subject: "Project Aaliyah — UI Feedback & Next Steps",
        snippet: "The latest mockups look fantastic. I've shared some specific feedback regarding the sidebar transitions and the mobile responsiveness...",
        bodyCleaned: "The latest mockups look fantastic. I've shared some specific feedback regarding the sidebar transitions and the mobile responsiveness. We're on track for the Friday deadline.\n\nCould you also confirm the availability for a quick sync on Thursday morning?\n\nBest,\nSarah",
        receivedAt: new Date(Date.now() - 45 * 60000).toISOString(),
        isRead: false,
        isPrimaryAccount: true,
        labels: ["needs_reply"],
        draft: {
            id: "demo-draft-2",
            subject: "Re: Project Aaliyah — UI Feedback & Next Steps",
            body: "Hi Sarah,\n\nGlad you liked the mockups! Thursday morning works for a sync. Does 10:00 AM work for you?\n\nBest regards",
            status: "ready",
            reasoning: "Scheduling request and feedback follow-up."
        }
    }],
    fyi: [{
        id: "demo-fyi-1",
        provider: "microsoft",
        sender: { name: "Microsoft 365", email: "notifications@microsoft.com" },
        subject: "Your Weekly Productivity Summary",
        snippet: "Here's your weekly productivity summary. You attended 12 meetings, sent 47 emails, and collaborated on 8 documents this week...",
        bodyCleaned: "Here's your weekly productivity summary:\n\n📊 This Week's Highlights:\n• 12 meetings attended (3 less than last week)\n• 47 emails sent\n• 8 documents collaborated on\n• Focus time: 14 hours\n\nYour most active day was Wednesday with 21 emails sent.\n\nKeep up the great work!\n— Microsoft 365 Team",
        receivedAt: new Date(Date.now() - 3 * 3600000).toISOString(),
        isRead: true,
        isPrimaryAccount: true,
        labels: ["fyi"],
    }]
}

export function ThreadList({ onSelect, selectedId, filter, refreshTrigger, seenIds = new Set() }: { onSelect: (email: EmailMessage) => void; selectedId?: string | null; filter?: string; refreshTrigger?: number; seenIds?: Set<string> }) {
    const [emails, setEmails] = React.useState<EmailMessage[]>([])
    const [loading, setLoading] = React.useState(true)

    const load = async () => {
        setLoading(true)
        // Set demo threads instantly for UX testing
        const demos = filter && DEMO_THREADS[filter] ? DEMO_THREADS[filter] : []
        setEmails(demos)

        try {
            const res = await inboxService.getInbox(filter || "all")
            const apiEmails = res.data || []

            // Combine and sort by date
            setEmails([...demos, ...apiEmails].sort((a, b) =>
                new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
            ))
        } catch (e) {
            console.error(e)
            // Keep demos if API fails
            if (demos.length > 0) setEmails(demos)
        } finally {
            setLoading(false)
        }
    }

    React.useEffect(() => {
        load()
    }, [filter, refreshTrigger])

    if (loading && emails.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center p-8">
                <div className="h-6 w-6 border-2 border-zinc-900 border-t-transparent animate-spin rounded-full opacity-10" />
            </div>
        )
    }

    return (
        <div className="flex-1 overflow-y-auto">
            {emails.map((email) => {
                const isUnseen = email.id.startsWith('demo-') ? !seenIds.has(email.id) : !email.isRead;
                return (
                    <div
                        key={email.id}
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
                                {timeAgo(email.receivedAt)}
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
}
