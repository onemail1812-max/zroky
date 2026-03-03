"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown, ChevronUp, Mail, Archive, Trash2, Loader2, Sparkles, FileText, Image as ImageIcon, Table, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"
import type { EmailMessage } from "@/services/inbox.service"
import { inboxService } from "@/services/inbox.service"
import { ChatMessage } from "./ChatMessage"
import type { ChatMessage as ChatMessageType } from "@/lib/aaliyah/useAaliyahChat"

// ── Types ──────────────────────────────────────────────────────────────

interface ThreadConversationProps {
    thread: EmailMessage
    messages: ChatMessageType[]
    isLoading: boolean
    emailId?: string | null
    onAttachmentClick?: (attachment: any) => void
    onAction?: (action: 'archived' | 'deleted') => void
    onEmailChat?: (emailId: string | null) => void
}

// ── Email Context Header ───────────────────────────────────────────────

function EmailContextHeader({
    thread,
    onAttachmentClick,
    onAction,
    onEmailChat,
    isActiveChat
}: {
    thread: EmailMessage
    onAttachmentClick?: (attachment: any) => void
    onAction?: (action: 'archived' | 'deleted') => void
    onEmailChat?: (emailId: string | null) => void
    isActiveChat?: boolean
}) {
    const [isExpanded, setIsExpanded] = React.useState(false)
    const [fullBody, setFullBody] = React.useState<string | null>(null)
    const [bodyLoading, setBodyLoading] = React.useState(false)
    const [actionLoading, setActionLoading] = React.useState<'archive' | 'delete' | null>(null)

    // Fetch full body when expanded
    React.useEffect(() => {
        if (isExpanded && !fullBody) {
            setBodyLoading(true)
            inboxService.getEmailBody(thread.id)
                .then(body => setFullBody(body || null))
                .catch(() => setFullBody(null))
                .finally(() => setBodyLoading(false))
        }
    }, [isExpanded, thread.id, fullBody])

    // Reset on thread change
    React.useEffect(() => {
        setFullBody(null)
        setIsExpanded(false)
    }, [thread.id])

    const handleArchive = async () => {
        setActionLoading('archive')
        try {
            await inboxService.archiveEmail(thread.id)
            onAction?.('archived')
        } catch {
            // Error logged via telemetry
        } finally {
            setActionLoading(null)
        }
    }

    const handleDelete = async () => {
        setActionLoading('delete')
        try {
            await inboxService.deleteEmail(thread.id)
            onAction?.('deleted')
        } catch {
            // Error logged via telemetry
        } finally {
            setActionLoading(null)
        }
    }

    const senderInitial = (thread.sender.name || thread.sender.email || "?")[0].toUpperCase()
    const hasAttachments = thread.attachments && thread.attachments.length > 0

    return (
        <div className="shrink-0 border-b border-zinc-100 bg-white">
            {/* ── Compact Email Context Bar ── */}
            <div className="px-6 py-4">
                <div className="flex items-start gap-4">
                    {/* Sender Avatar */}
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center text-white text-[14px] font-semibold shrink-0 shadow-sm ring-2 ring-white mt-0.5">
                        {senderInitial}
                    </div>

                    {/* Email Info */}
                    <div className="flex-1 min-w-0">
                        {/* Row 1: Sender + Actions */}
                        <div className="flex items-center justify-between gap-3 mb-1">
                            <div className="flex items-center gap-2 min-w-0">
                                <span className="text-[14px] font-semibold text-zinc-900">
                                    {thread.sender.name || thread.sender.email.split('@')[0]}
                                </span>
                                <span className="text-[11px] text-zinc-400 font-normal hidden sm:inline">
                                    {new Date(thread.receivedAt).toLocaleString('en-US', {
                                        month: 'short', day: 'numeric',
                                        hour: 'numeric', minute: '2-digit', hour12: true
                                    })}
                                </span>
                                <span className="text-[10px] text-zinc-300 capitalize hidden sm:inline">
                                    via {thread.provider}
                                </span>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-0.5 shrink-0">
                                <button
                                    onClick={() => onEmailChat?.(isActiveChat ? null : thread.id)}
                                    className={cn(
                                        "p-1.5 rounded-lg transition-all",
                                        isActiveChat
                                            ? "text-purple-600 bg-purple-50 ring-1 ring-purple-100"
                                            : "text-zinc-400 hover:text-zinc-700 hover:bg-zinc-50"
                                    )}
                                    title={isActiveChat ? "Exit email-specific chat" : "Chat about this specific email"}
                                >
                                    <Sparkles className={cn("h-4 w-4", isActiveChat && "animate-pulse")} />
                                </button>

                                <button
                                    onClick={() => setIsExpanded(!isExpanded)}
                                    className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-50 rounded-lg transition-all"
                                    title={isExpanded ? "Collapse email" : "View full email"}
                                >
                                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                </button>

                                <button
                                    onClick={handleArchive}
                                    disabled={actionLoading !== null}
                                    className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-50 rounded-lg transition-all disabled:opacity-50"
                                    title="Archive"
                                >
                                    {actionLoading === 'archive' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
                                </button>

                                <button
                                    onClick={handleDelete}
                                    disabled={actionLoading !== null}
                                    className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50"
                                    title="Delete"
                                >
                                    {actionLoading === 'delete' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Row 2: Full Subject (no truncation) */}
                        <h2 className="text-[15px] font-bold text-zinc-900 tracking-tight leading-snug">
                            {thread.subject || "(No Subject)"}
                        </h2>

                        {/* Snippet Preview (always visible) */}
                        {!isExpanded && (
                            <p className="text-[13px] text-zinc-500 leading-relaxed mt-1.5 line-clamp-2">
                                {thread.snippet || thread.bodyCleaned?.slice(0, 200)}
                            </p>
                        )}
                    </div>
                </div>

                {/* Attachment Chips (compact, always visible if attachments exist) */}
                {hasAttachments && !isExpanded && (
                    <div className="flex items-center gap-2 mt-3 ml-14 overflow-x-auto">
                        {thread.attachments!.map(att => {
                            const isPdf = att.mimeType.includes("pdf")
                            const isImage = att.mimeType.includes("image")
                            return (
                                <button
                                    key={att.id}
                                    onClick={() => onAttachmentClick?.(att)}
                                    className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-50 border border-zinc-100 rounded-lg text-[11px] font-semibold text-zinc-600 hover:bg-zinc-100 hover:border-zinc-200 transition-all shrink-0"
                                >
                                    {isPdf ? <FileText className="h-3 w-3 text-red-500" /> :
                                        isImage ? <ImageIcon className="h-3 w-3 text-blue-500" /> :
                                            <Table className="h-3 w-3 text-emerald-500" />}
                                    <span className="truncate max-w-[120px]">{att.filename}</span>
                                </button>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* ── Expanded Email Body ── */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden"
                    >
                        <div className="px-6 pb-5 border-t border-zinc-50">
                            {/* Full Email Body */}
                            <div className="mt-4 text-[14px] text-zinc-700 leading-[1.8] max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                                {bodyLoading ? (
                                    <div className="space-y-3 animate-pulse">
                                        <div className="h-3 bg-zinc-100 rounded w-3/4" />
                                        <div className="h-3 bg-zinc-100 rounded w-full" />
                                        <div className="h-3 bg-zinc-100 rounded w-5/6" />
                                    </div>
                                ) : (
                                    <p className="whitespace-pre-wrap">
                                        {fullBody || thread.bodyCleaned || thread.snippet}
                                    </p>
                                )}
                            </div>

                            {/* Attachments (expanded view) */}
                            {hasAttachments && (
                                <div className="mt-4 pt-4 border-t border-zinc-100">
                                    <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-3">
                                        Attachments ({thread.attachments!.length})
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        {thread.attachments!.map(att => {
                                            const isPdf = att.mimeType.includes("pdf")
                                            const isImage = att.mimeType.includes("image")
                                            const isSpreadsheet = att.mimeType.includes("spreadsheet") || att.mimeType.includes("excel")
                                            return (
                                                <button
                                                    key={att.id}
                                                    onClick={() => onAttachmentClick?.(att)}
                                                    className="group flex items-center gap-2.5 p-2.5 pr-4 bg-white border border-zinc-200 rounded-xl hover:border-zinc-300 hover:shadow-sm transition-all text-left"
                                                >
                                                    <div className={cn(
                                                        "h-8 w-8 flex items-center justify-center rounded-lg",
                                                        isPdf ? "bg-red-50 text-red-600" :
                                                            isSpreadsheet ? "bg-emerald-50 text-emerald-600" :
                                                                "bg-blue-50 text-blue-600"
                                                    )}>
                                                        {isPdf ? <FileText className="h-4 w-4" /> :
                                                            isSpreadsheet ? <Table className="h-4 w-4" /> :
                                                                <ImageIcon className="h-4 w-4" />}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[12px] font-semibold text-zinc-700 group-hover:text-zinc-900 line-clamp-1 max-w-[160px]">
                                                            {att.filename}
                                                        </span>
                                                        <span className="text-[10px] text-zinc-400">
                                                            {(att.size / 1024 / 1024).toFixed(1)} MB
                                                        </span>
                                                    </div>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

// ── Main Component ─────────────────────────────────────────────────────

export function ThreadConversation({
    thread,
    messages,
    isLoading,
    emailId,
    onAttachmentClick,
    onAction,
    onEmailChat
}: ThreadConversationProps) {
    const scrollRef = React.useRef<HTMLDivElement>(null)

    // Auto-scroll to bottom when new messages arrive
    React.useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({
                top: scrollRef.current.scrollHeight,
                behavior: "smooth"
            })
        }
    }, [messages])

    // Filter messages:
    // 1. If emailId is set: show messages exactly for that email.
    // 2. If emailId is null: show thread-level messages (matching threadId + no emailId).
    const threadMessages = React.useMemo(() => {
        return messages.filter(m => {
            if (emailId) {
                // Focus: only show messages for this specific email
                return m.emailId === emailId;
            }

            // Default: show thread-level context
            if (m.threadId === thread.id && !m.emailId) return true;

            // Basic fallback for proactive/global
            if (!m.threadId && !m.emailId) return true;

            return false;
        })
    }, [messages, thread.id, emailId])

    const hasMessages = threadMessages.length > 0

    return (
        <div className="flex flex-col h-full">
            {/* ── Email Context Header (Collapsible) ── */}
            <EmailContextHeader
                thread={thread}
                onAttachmentClick={onAttachmentClick}
                onAction={onAction}
                onEmailChat={onEmailChat}
                isActiveChat={emailId === thread.id}
            />

            {/* ── Conversation Feed ── */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto custom-scrollbar"
                style={{ overscrollBehavior: 'contain' }}
            >
                <div className="min-h-full flex flex-col justify-end">
                    {/* Thread-scoped messages */}
                    <div className="flex-1 flex flex-col">
                        {!hasMessages && (
                            <div className="flex-1 flex items-center justify-center py-12">
                                <div className="text-center">
                                    <div className="mx-auto h-12 w-12 rounded-2xl bg-zinc-50 border border-zinc-100 flex items-center justify-center mb-4">
                                        <Sparkles className="h-5 w-5 text-zinc-300" />
                                    </div>
                                    <p className="text-[13px] text-zinc-400 font-medium max-w-[260px] leading-relaxed">
                                        {emailId
                                            ? `This is a private chat about this specific email. Aaliyah's context is focused here.`
                                            : `This is your conversation with Aaliyah about this thread. Ask anything or wait for her analysis.`}
                                    </p>
                                </div>
                            </div>
                        )}

                        {threadMessages.map((m) => (
                            <div key={m.id} className="max-w-5xl mx-auto px-4 md:px-8 w-full shrink-0">
                                <ChatMessage
                                    role={m.role as any}
                                    content={m.content}
                                    type={m.type}
                                    payload={m.payload}
                                />
                            </div>
                        ))}
                    </div>

                    {/* Typing Indicator */}
                    <div className="pb-28 px-4 md:px-8 max-w-5xl mx-auto w-full shrink-0 mt-auto">
                        {isLoading && threadMessages.length > 0 && threadMessages[threadMessages.length - 1]?.role === 'user' && (
                            <ChatMessage
                                role="assistant"
                                content="..."
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
