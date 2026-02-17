import * as React from "react"
import {
    Mail,
    Calendar,
    Clock,
    AlertCircle,
    CheckCircle2,
    XCircle,
    Edit3,
    MoreHorizontal,
    FileText,
    Sparkles,
    ArrowRight,
    Paperclip,
    ExternalLink,
    Zap
} from "lucide-react"
import { cn } from "@/lib/utils"
import { EmailMessage } from "@/services/inbox.service"

// --- 1. Context Header Card ---
export function ContextCard({ thread }: { thread: EmailMessage }) {
    const isPriority = thread.labels?.includes("priority")
    const Icon = Mail
    const source = thread.provider === 'google' ? "Gmail" : "Outlook"
    const sourceInit = thread.provider === 'google' ? "G" : "O"

    return (
        <div className="flex items-center justify-between p-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-20 shadow-sm">
            <div className="flex items-center gap-3 overflow-hidden">
                <div className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-white font-bold text-xs border ${thread.provider === 'google' ? 'bg-red-500 border-red-600' : 'bg-blue-600 border-blue-700'}`}>
                    {sourceInit}
                </div>
                <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Source</span>
                        <span className={cn(
                            "text-[10px] px-2 py-0.5 rounded-full font-semibold border transition-colors bg-zinc-100 text-zinc-900 border-zinc-200"
                        )}>
                            {source}
                        </span>
                    </div>
                    <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">{thread.subject || "(No Subject)"}</h2>
                </div>
            </div>
        </div>
    )
}

// --- 2. Snapshot Card ---
export function SnapshotCard({ thread }: { thread: EmailMessage }) {
    const senderName = thread.sender.name || thread.sender.email
    return (
        <div className="p-6 bg-white dark:bg-zinc-900/50 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-[0_2px_12px_rgba(0,0,0,0.02)] relative overflow-hidden group">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 text-xs font-bold border border-zinc-200 dark:border-zinc-700">
                        {senderName[0]}
                    </div>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                                {thread.sender.name ? `${thread.sender.name} (${thread.sender.email})` : thread.sender.email}
                            </span>
                            <div className={cn(
                                "h-3.5 w-3.5 rounded-full flex items-center justify-center text-[7px] font-black text-white shrink-0",
                                thread.provider === "google" ? "bg-red-500" : "bg-blue-600"
                            )}>
                                {thread.provider === "google" ? "G" : "O"}
                            </div>
                        </div>
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{new Date(thread.receivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                </div>
            </div>

            {/* Content Summary */}
            <div className="space-y-3 text-[14px] text-zinc-600 dark:text-zinc-300 leading-relaxed font-medium">
                <p>
                    {thread.snippet}
                </p>
                {thread.draft?.reasoning && (
                    <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100 text-[11px] font-bold text-zinc-500 uppercase tracking-wide">
                        Aaliyah Context: {thread.draft.reasoning}
                    </div>
                )}
            </div>
        </div>
    )
}

// --- 3. Action Card Wrappers ---

function ActionCardContainer({ title, children, statusColor = "zinc" }: { title: string, children: React.ReactNode, statusColor?: "zinc" | "red" | "blue" | "amber" }) {
    // We ignore statusColor and enforce strict monochrome for high-end feel
    const containerStyle = "border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30"

    return (
        <div className={cn("mx-6 p-1 rounded-2xl border shadow-sm", containerStyle)}>
            <div className="bg-white dark:bg-zinc-950 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-zinc-900 dark:text-zinc-100" />
                        <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-widest">{title}</span>
                    </div>
                </div>
                <div className="p-5">
                    {children}
                </div>
            </div>
        </div>
    )
}

// 3.1 Draft Ready Card
export function DraftReadyCard() {
    return (
        <ActionCardContainer title="Draft Reply Ready">
            <div className="space-y-4">
                <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-lg text-sm font-serif text-zinc-800 dark:text-zinc-200 leading-relaxed border border-zinc-100 dark:border-zinc-800">
                    <p>Hi Sarah,</p>
                    <p className="mt-2">Thanks for the update. The growth metrics look solid, but let's double-check the churn definition in section 3.</p>
                    <p className="mt-2">I'll review the PDF internally and get back to you by EOD.</p>
                    <p className="mt-4 text-zinc-400">Best,</p>
                </div>

                {/* Tone Filter */}
                <div className="flex gap-2">
                    {["Short", "Normal", "Friendly", "Firm"].map((tone, i) => (
                        <button key={tone} className={cn(
                            "px-3 py-1 text-[10px] font-medium rounded-full border transition-colors",
                            i === 1 ? "bg-zinc-100 text-zinc-900 border-zinc-300" : "text-zinc-500 border-zinc-200 hover:bg-zinc-50"
                        )}>
                            {tone}
                        </button>
                    ))}
                </div>

                {/* Trust Line */}
                <div className="flex items-center gap-2 text-[10px] text-zinc-400">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    <span>Based on: Email thread + Core Docs</span>
                </div>

                <div className="flex gap-3 pt-2">
                    <button className="flex-1 bg-black dark:bg-white text-white dark:text-black h-10 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 shadow-md hover:scale-[1.02] transition-transform">
                        <CheckCircle2 className="h-4 w-4" />
                        Approve & Send
                    </button>
                    <button className="px-4 h-10 border border-zinc-200 dark:border-zinc-800 rounded-lg font-medium text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors">
                        Edit
                    </button>
                    <button className="px-4 h-10 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
                        <XCircle className="h-5 w-5" />
                    </button>
                </div>
            </div>
        </ActionCardContainer>
    )
}

// 3.2 Approval Needed Card
export function ApprovalNeededCard() {
    return (
        <ActionCardContainer title="Approval Needed">
            <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-zinc-900 dark:text-zinc-100" />
                    <div>
                        <span className="font-bold">Attention:</span> Pricing terms mentioned. High risk content.
                    </div>
                </div>

                <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-lg text-sm font-serif text-zinc-800 dark:text-zinc-200 leading-relaxed border border-zinc-100 dark:border-zinc-800">
                    <p>Hi Team,</p>
                    <p className="mt-2">Approved. The pricing terms are consistent with our Q3 strategy.</p>
                </div>

                <div className="flex gap-3 pt-2">
                    <button className="flex-1 bg-black dark:bg-white text-white dark:text-black h-10 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 shadow-md hover:scale-[1.02] transition-transform">
                        <Zap className="h-4 w-4 fill-white dark:fill-black" />
                        Approve & Send
                    </button>
                    <button className="px-4 h-10 border border-zinc-200 dark:border-zinc-800 rounded-lg font-medium text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors">
                        Edit
                    </button>
                </div>
            </div>
        </ActionCardContainer>
    )
}

// 3.3 Follow-up Due Card
export function FollowUpDueCard() {
    return (
        <ActionCardContainer title="Follow-up Due">
            <div className="space-y-4">
                <div className="p-3 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-zinc-500" />
                    <span className="font-semibold">No reply since 3 days.</span> Follow-up recommended.
                </div>

                <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-lg text-sm font-serif text-zinc-800 dark:text-zinc-200 leading-relaxed border border-zinc-100 dark:border-zinc-800">
                    <p>Hi Michael,</p>
                    <p className="mt-2">Just bumping this to top of inbox. Did you get a chance to review the hiring plan?</p>
                    <p className="mt-4 text-zinc-400">Best,</p>
                </div>

                <div className="flex gap-3 pt-2">
                    <button className="flex-1 bg-black dark:bg-white text-white dark:text-black h-10 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 shadow-md hover:scale-[1.02] transition-transform">
                        <Mail className="h-4 w-4" />
                        Send Follow-up
                    </button>
                    <button className="px-4 h-10 border border-zinc-200 dark:border-zinc-800 rounded-lg font-medium text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Snooze 2d
                    </button>
                    <button className="px-4 h-10 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors" title="Mark as Done">
                        <CheckCircle2 className="h-5 w-5" />
                    </button>
                </div>
            </div>
        </ActionCardContainer>
    )
}

// 3.4 Slots Ready Card
export function SlotsReadyCard() {
    return (
        <ActionCardContainer title="Scheduling Assistant">
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Request detected: 30min sync</span>
                    <span className="text-xs text-zinc-900 dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-2 py-1 rounded-full font-semibold">No conflicts</span>
                </div>

                <div className="space-y-2">
                    {["Tue 10:00 AM", "Tue 2:00 PM", "Wed 11:30 AM"].map(slot => (
                        <div key={slot} className="flex items-center gap-3 p-3 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:border-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all cursor-pointer bg-white dark:bg-zinc-900">
                            <div className="h-4 w-4 rounded-full border border-zinc-300" />
                            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{slot}</span>
                            <span className="ml-auto text-xs text-zinc-400">PST</span>
                        </div>
                    ))}
                </div>

                <button className="w-full bg-black dark:bg-white text-white dark:text-black h-10 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 shadow-md">
                    <Calendar className="h-4 w-4" />
                    Send Proposed Slots
                </button>
            </div>
        </ActionCardContainer>
    )
}
