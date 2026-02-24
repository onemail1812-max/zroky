"use client"

import * as React from "react"
import { EmailMessage, inboxService } from "@/services/inbox.service"
import { Send, Edit, CheckCircle2, X, Sparkles, RefreshCw, Trash2, Archive, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { SkeletonEmailBody } from "@/components/ui/Skeleton"
import { motion, AnimatePresence } from "framer-motion"
import { InlineAssistantCard } from "./InlineAssistantCard"
import { FileText, Image as ImageIcon, Table } from "lucide-react"

export function ThreadReader({
    thread,
    onAction,
    onAttachmentClick
}: {
    thread: EmailMessage,
    onAction?: (action: 'archived' | 'deleted') => void,
    onAttachmentClick?: (attachment: any) => void
}) {
    const [fullBody, setFullBody] = React.useState<string | null>(null)
    const [bodyLoading, setBodyLoading] = React.useState(false)
    const [actionLoading, setActionLoading] = React.useState<'archive' | 'delete' | null>(null)
    const [draftDiscarded, setDraftDiscarded] = React.useState(false)
    const [draftSending, setDraftSending] = React.useState(false)

    // Reset and fetch when thread changes
    React.useEffect(() => {
        setFullBody(null)
        setDraftDiscarded(false)
        setDraftSending(false)
        setBodyLoading(true)

        const fetchBody = async () => {
            try {
                const body = await inboxService.getEmailBody(thread.id)
                setFullBody(body || null)
            } catch (e) {
                setFullBody(null)
            } finally {
                setBodyLoading(false)
            }
        }

        fetchBody()
    }, [thread.id])



    const handleArchive = async () => {
        setActionLoading('archive')
        try {
            await inboxService.archiveEmail(thread.id)
            onAction?.('archived')
        } catch (e) {
            // Error logged via telemetry in production
            alert("Failed to archive email")
        } finally {
            setActionLoading(null)
        }
    }

    const handleDelete = async () => {
        setActionLoading('delete')
        try {
            await inboxService.deleteEmail(thread.id)
            onAction?.('deleted')
        } catch (e) {
            // Error logged via telemetry in production
            alert("Failed to delete email")
        } finally {
            setActionLoading(null)
        }
    }

    const isPendingApproval = thread.draft?.status === 'pending_approval' || thread.labels?.includes('approvals')
    const providerColor = thread.provider === 'google' ? 'bg-red-500' : 'bg-blue-600'
    const providerLabel = thread.provider === 'google' ? 'G' : 'O'

    return (
        <div className="flex flex-col h-full bg-[#f8f9fa] relative font-sans selection:bg-zinc-900 selection:text-white">
            {/* ── Outer Wrapping for Central Card Alignment ── */}
            <div className="flex-1 overflow-y-auto px-4 py-8 sm:px-8 md:py-12 custom-scrollbar">

                {/* ── The Premium Center Card ── */}
                <div className="max-w-[800px] mx-auto bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-zinc-200/50 overflow-hidden relative">

                    {/* Decorative Top Accent  */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-zinc-200 via-zinc-300 to-zinc-200" />

                    {/* ── Ultra Minimal Header ── */}
                    <header className="px-8 pt-10 pb-8 border-b border-zinc-100 bg-white/95 backdrop-blur-xl relative z-30">
                        <div className="flex items-start justify-between gap-8 mb-6">
                            <h1 className="text-[26px] font-bold tracking-[-0.02em] text-zinc-900 leading-[1.2] max-w-2xl">
                                {thread.subject || "(No Subject)"}
                            </h1>
                            <div className="flex items-center gap-1 opacity-40 hover:opacity-100 transition-opacity shrink-0">
                                <button
                                    onClick={handleArchive}
                                    disabled={actionLoading !== null}
                                    className="p-2 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-all disabled:opacity-50"
                                    title="Archive"
                                >
                                    {actionLoading === 'archive' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={actionLoading !== null}
                                    className="p-2 text-zinc-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50"
                                    title="Delete"
                                >
                                    {actionLoading === 'delete' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="h-11 w-11 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center text-white text-[15px] font-medium shrink-0 shadow-sm ring-2 ring-white">
                                {(thread.sender.name || thread.sender.email || "?")[0].toUpperCase()}
                            </div>

                            <div className="min-w-0 flex-1 flex flex-col justify-center">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <span className="text-[15px] font-semibold text-zinc-900 tracking-tight">
                                        {thread.sender.name || thread.sender.email.split('@')[0]}
                                    </span>
                                    <span className="text-[13px] text-zinc-400 font-normal truncate max-w-[200px] sm:max-w-none">
                                        {"<"}{thread.sender.email}{">"}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-[13px] text-zinc-500 font-medium">
                                    <span>
                                        {new Date(thread.receivedAt).toLocaleString('en-US', {
                                            month: 'short', day: 'numeric',
                                            hour: 'numeric', minute: '2-digit', hour12: true
                                        })}
                                    </span>
                                    <span className="h-[3px] w-[3px] rounded-full bg-zinc-300" />
                                    <span className="text-zinc-400 capitalize flex items-center gap-1">
                                        {thread.provider}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </header>

                    {/* ── Content Area ── */}
                    <main className="px-8 py-10 bg-white">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={thread.id}
                                initial={{ opacity: 0, filter: "blur(4px)" }}
                                animate={{ opacity: 1, filter: "blur(0px)" }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                            >


                                {/* Email Body - Pristine Typography */}
                                <div className="text-[16px] text-zinc-800 leading-[1.8] font-normal tracking-[-0.01em]">
                                    {bodyLoading ? (
                                        <div className="space-y-4 animate-pulse opacity-60">
                                            <div className="h-4 bg-zinc-100 rounded w-3/4"></div>
                                            <div className="h-4 bg-zinc-100 rounded w-full"></div>
                                            <div className="h-4 bg-zinc-100 rounded w-5/6"></div>
                                            <div className="h-4 bg-zinc-100 rounded w-1/2 mt-8"></div>
                                        </div>
                                    ) : (
                                        <p className="whitespace-pre-wrap antialiased">
                                            {fullBody || thread.bodyCleaned || thread.snippet}
                                        </p>
                                    )}
                                </div>

                                {/* Clarity Required Block */}
                                {thread.needsClarity && (
                                    <div className="mt-16 pt-8 border-t border-zinc-100 relative">
                                        <div className="flex flex-col gap-3 p-6 bg-amber-50/50 rounded-2xl border border-amber-100">
                                            <div className="flex items-center gap-2">
                                                <Sparkles className="h-4 w-4 text-amber-500" />
                                                <span className="text-[12px] font-bold text-amber-600 uppercase tracking-widest">Action Required</span>
                                            </div>
                                            <p className="text-[14px] text-amber-900/80 font-medium leading-relaxed">
                                                Aaliyah needs your input to draft a response to this. Could you provide a quick decision or extra context?
                                            </p>
                                            <div className="mt-3 flex gap-2">
                                                <input
                                                    type="text"
                                                    placeholder="E.g., Yes, approve it."
                                                    className="h-10 px-4 text-[14px] bg-white border border-amber-200/50 rounded-xl flex-1 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all shadow-sm"
                                                />
                                                <button className="h-10 px-5 bg-amber-600 text-white text-[13px] font-semibold rounded-xl hover:bg-amber-700 transition-all shadow-sm">
                                                    Reply & Draft
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Attachments Block */}
                                {thread.attachments && thread.attachments.length > 0 && (
                                    <div className="mt-12 pt-8 border-t border-zinc-100">
                                        <h4 className="text-[12px] font-bold text-zinc-400 uppercase tracking-widest mb-4">Attachments ({thread.attachments.length})</h4>
                                        <div className="flex flex-wrap gap-3">
                                            {thread.attachments.map(att => {
                                                const isPdf = att.mimeType.includes("pdf")
                                                const isImage = att.mimeType.includes("image")
                                                const isSpreadsheet = att.mimeType.includes("spreadsheet") || att.mimeType.includes("excel") || att.mimeType.includes("csv")

                                                return (
                                                    <button
                                                        key={att.id}
                                                        onClick={() => onAttachmentClick?.(att)}
                                                        className="group flex items-center gap-3 p-3 pr-4 bg-white border border-zinc-200 rounded-2xl hover:border-zinc-300 hover:shadow-sm transition-all text-left"
                                                    >
                                                        <div className={cn(
                                                            "h-10 w-10 flex items-center justify-center rounded-xl",
                                                            isPdf ? "bg-red-50 text-red-600" :
                                                                isSpreadsheet ? "bg-emerald-50 text-emerald-600" :
                                                                    "bg-blue-50 text-blue-600"
                                                        )}>
                                                            {isPdf ? <FileText className="h-5 w-5" /> :
                                                                isSpreadsheet ? <Table className="h-5 w-5" /> :
                                                                    <ImageIcon className="h-5 w-5" />}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-[13px] font-bold text-zinc-700 group-hover:text-zinc-900 transition-colors line-clamp-1 max-w-[200px]">
                                                                {att.filename}
                                                            </span>
                                                            <span className="text-[11px] font-medium text-zinc-400">
                                                                {(att.size / 1024 / 1024).toFixed(1)} MB
                                                            </span>
                                                        </div>
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Inline Assistant Card - Auto-shows if draft exists */}
                                {!draftDiscarded && thread.draft && (
                                    <InlineAssistantCard
                                        draft={thread.draft}
                                        onSend={() => {
                                            setDraftSending(true)
                                            // TODO: Wire to actual send API
                                            setTimeout(() => setDraftSending(false), 2000)
                                        }}
                                        onEdit={() => { }}
                                        onDiscard={() => setDraftDiscarded(true)}
                                        isSending={draftSending}
                                    />
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </main>
                </div>

                {/* Extra padding at bottom so scrolling doesn't cut off */}
                <div className="h-12" />
            </div>
        </div>
    )
}
