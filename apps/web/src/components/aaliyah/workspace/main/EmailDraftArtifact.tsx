"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Mail, Sparkles, Zap, Edit, Info, ShieldAlert, Loader2, Save, X, Bot, ChevronUp, ChevronDown, Paperclip, Send, Plus
} from "lucide-react"
import { cn } from "@/lib/utils"
import { updateDraft } from "@/lib/aaliyah/api"
import { useViewerStore } from "@/lib/aaliyah/viewerStore"
import { EmailEditor } from "./EmailEditor"

export type Attachment = {
    id: string
    filename: string
    mime_type: string
    size: number
}

export type DraftArtifact = {
    to: string
    subject: string
    body: string
    attachments?: Attachment[]
    reasoning?: string
}

const itemVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.96, filter: "blur(4px)" },
    visible: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)", transition: { type: "spring", stiffness: 300, damping: 24 } }
}

export function EmailDraftArtifact({
    emailId,
    draft,
    onChange,
    onOpenDocument,
    onSend,
}: {
    emailId: string
    draft: DraftArtifact
    onChange?: (draft: DraftArtifact) => void
    onOpenDocument?: () => void
    onSend?: () => void
}) {
    const [isEditing, setIsEditing] = React.useState(false)
    const [localDraft, setLocalDraft] = React.useState(draft)
    const [isSaving, setIsSaving] = React.useState(false)
    const [sendError, setSendError] = React.useState<string | null>(null)
    const [isSending, setIsSending] = React.useState(false)
    const [isReasoningOpen, setIsReasoningOpen] = React.useState(true)
    const fileInputRef = React.useRef<HTMLInputElement>(null)

    const { openDocument } = useViewerStore()

    React.useEffect(() => {
        if (!isEditing) {
            setLocalDraft(draft)
            setSendError(null)
        }
    }, [draft, isEditing])

    React.useEffect(() => {
        if (!isEditing) return

        const timer = setTimeout(async () => {
            setIsSaving(true)
            try {
                await updateDraft(emailId, localDraft)
                onChange?.(localDraft)
            } catch (e) { }
            finally { setIsSaving(false) }
        }, 2500)

        return () => clearTimeout(timer)
    }, [localDraft, isEditing, emailId, onChange])

    const handleSave = async () => {
        setIsSaving(true)
        try {
            await updateDraft(emailId, localDraft)
            onChange?.(localDraft)
            setIsEditing(false)
        } catch (e) {
            setSendError("Failed to save changes.")
        } finally {
            setIsSaving(false)
        }
    }

    const handleCancel = () => {
        setLocalDraft(draft)
        setIsEditing(false)
        setSendError(null)
    }

    const handleRemoveAttachment = (id: string) => {
        const updated = {
            ...localDraft,
            attachments: localDraft.attachments?.filter(a => a.id !== id)
        }
        setLocalDraft(updated)
    }

    const handleAddAttachment = () => {
        fileInputRef.current?.click()
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const newAttachment: Attachment = {
            id: `local-${Date.now()}`,
            filename: file.name,
            mime_type: file.type,
            size: file.size
        }

        setLocalDraft(prev => ({
            ...prev,
            attachments: [...(prev.attachments || []), newAttachment]
        }))
        e.target.value = ""
    }

    const handleApproveAndSend = async () => {
        setIsSending(true)
        setSendError(null)
        try {
            if (onSend) await onSend()
        } catch (e: any) {
            setSendError(e.message || "Execution blocked. System error occurred.")
        } finally {
            setIsSending(false)
        }
    }

    const [showOriginal, setShowOriginal] = React.useState(false)
    const [originalContent, setOriginalContent] = React.useState<string | null>(null)
    const [isLoadingOriginal, setIsLoadingOriginal] = React.useState(false)

    const toggleOriginal = async () => {
        if (!showOriginal && !originalContent) {
            setIsLoadingOriginal(true)
            try {
                const { inboxService } = await import("@/services/inbox.service")
                const body = await inboxService.getEmailBody(emailId)
                setOriginalContent(body)
            } catch (e) { }
            finally { setIsLoadingOriginal(false) }
        }
        setShowOriginal(!showOriginal)
    }

    return (
        <motion.div
            variants={itemVariants}
            layout
            className={cn(
                "group relative flex flex-col rounded-[32px] border overflow-hidden transition-all duration-500",
                isEditing
                    ? "border-indigo-500/40 bg-white dark:bg-zinc-950 shadow-[0_20px_60px_-15px_rgba(99,102,241,0.15)] ring-4 ring-indigo-500/5 z-10"
                    : "border-zinc-200/60 dark:border-zinc-800/60 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-3xl shadow-2xl shadow-zinc-200/20 dark:shadow-black/20 hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-3xl"
            )}
        >
            <motion.div layout="position" className="relative flex items-center justify-between px-7 py-5 bg-gradient-to-b from-zinc-50/80 to-transparent dark:from-zinc-900/50 dark:to-transparent border-b border-zinc-100 dark:border-zinc-800/80">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm border border-indigo-100/50 dark:border-indigo-500/20">
                        {showOriginal ? <Mail className="h-5 w-5" /> : <Sparkles className="h-5 w-5" strokeWidth={2} />}
                    </div>
                    <div>
                        <h3 className="text-[15px] font-black tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                            {showOriginal ? "Original Incoming Email" : isEditing ? "Modifying Draft" : "Prepared Communication"}
                            {(isEditing || isLoadingOriginal) && <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />}
                        </h3>
                        <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
                            {showOriginal ? <Mail className="h-3 w-3" /> : <Zap className="h-3 w-3 text-amber-500" />}
                            {showOriginal ? "VERIFICATION MODE" : "EXECUTIVE ACTION"}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {!isEditing && (
                        <button
                            onClick={toggleOriginal}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all border shadow-sm",
                                showOriginal
                                    ? "bg-black dark:bg-white text-white dark:text-black border-black"
                                    : "bg-white dark:bg-zinc-900 text-zinc-600 border-zinc-200 hover:border-zinc-400"
                            )}
                        >
                            <Info className="h-3.5 w-3.5" />
                            {showOriginal ? "Back to Draft" : "Show Original"}
                        </button>
                    )}

                    {!isEditing && !showOriginal && (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="group/btn flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-bold bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 shadow-sm hover:border-zinc-300 dark:hover:border-zinc-700 transition-all hover:bg-zinc-50 dark:hover:bg-zinc-800"
                        >
                            <Edit className="h-3.5 w-3.5 text-zinc-400 group-hover/btn:text-indigo-500 transition-colors" /> Override
                        </button>
                    )}

                    {isEditing && (
                        <div className="flex gap-2">
                            <button
                                onClick={handleCancel}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-bold text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="flex items-center gap-2 px-5 py-2 rounded-xl text-[12px] font-bold bg-indigo-500 text-white shadow-md hover:bg-indigo-600 disabled:opacity-50 transition-all"
                            >
                                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                                {isSaving ? "Saving" : "Lock Draft"}
                            </button>
                        </div>
                    )}
                </div>
            </motion.div>

            {draft.reasoning && !isEditing && (
                <div className="border-b border-zinc-100 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/50">
                    <button
                        onClick={() => setIsReasoningOpen(!isReasoningOpen)}
                        className="w-full flex items-center justify-between px-7 py-3 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-colors"
                    >
                        <div className="flex items-center gap-2.5">
                            <div className="h-6 w-6 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0">
                                <Bot className="h-3.5 w-3.5" />
                            </div>
                            <span className="text-[12px] font-bold text-zinc-700 dark:text-zinc-300 tracking-tight">Aaliyah's Logic Trace</span>
                        </div>
                        {isReasoningOpen ? <ChevronUp className="h-4 w-4 text-zinc-400" /> : <ChevronDown className="h-4 w-4 text-zinc-400" />}
                    </button>
                    <AnimatePresence>
                        {isReasoningOpen && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="px-7 pb-4 pt-1">
                                    <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 text-[13px] font-medium text-zinc-600 dark:text-zinc-400 leading-relaxed shadow-inner">
                                        {draft.reasoning}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}

            <motion.div layout="position" className="p-7">
                {sendError && (
                    <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-2xl flex items-start gap-3">
                        <ShieldAlert className="h-5 w-5 text-rose-500 shrink-0" />
                        <div className="text-[13px] text-rose-700 dark:text-rose-400 font-semibold">{sendError}</div>
                    </div>
                )}

                <div className="space-y-4 mb-6 relative">
                    <div className="relative flex items-center">
                        <div className="w-20 shrink-0 text-[11px] font-bold uppercase tracking-widest text-zinc-400">To:</div>
                        {isEditing ? (
                            <input
                                value={localDraft.to}
                                onChange={(e) => setLocalDraft({ ...localDraft, to: e.target.value })}
                                className="flex-1 min-w-0 bg-transparent border-b border-zinc-200 dark:border-zinc-800 focus:border-indigo-500 pb-1 text-[15px] font-medium text-zinc-800 dark:text-zinc-200 outline-none transition-colors"
                                placeholder="Target email coordinates"
                            />
                        ) : (
                            <div className="flex-1 min-w-0 text-[15px] font-semibold text-zinc-800 dark:text-zinc-200 pb-1">
                                {draft.to}
                            </div>
                        )}
                    </div>

                    <div className="relative flex items-center">
                        <div className="w-20 shrink-0 text-[11px] font-bold uppercase tracking-widest text-zinc-400">Subject:</div>
                        {isEditing ? (
                            <input
                                value={localDraft.subject}
                                onChange={(e) => setLocalDraft({ ...localDraft, subject: e.target.value })}
                                className="flex-1 min-w-0 bg-transparent border-b border-zinc-200 dark:border-zinc-800 focus:border-indigo-500 pb-1 text-[15px] font-semibold text-zinc-900 dark:text-white outline-none transition-colors"
                                placeholder="Directive subject"
                            />
                        ) : (
                            <div className="flex-1 min-w-0 text-[15px] font-bold text-zinc-900 dark:text-white pb-1">
                                {draft.subject}
                            </div>
                        )}
                    </div>
                </div>

                <div className="min-h-[200px] mb-8">
                    {showOriginal ? (
                        <div className="prose prose-sm max-w-none dark:prose-invert text-[14px] leading-relaxed text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap">
                            {isLoadingOriginal ? (
                                <div className="flex items-center gap-2 text-zinc-400 italic">
                                    <Loader2 className="h-4 w-4 animate-spin" /> Verifying source material...
                                </div>
                            ) : originalContent || "No source content found."}
                        </div>
                    ) : (
                        <EmailEditor
                            content={isEditing ? localDraft.body : draft.body}
                            onChange={(html) => setLocalDraft({ ...localDraft, body: html })}
                            editable={isEditing}
                        />
                    )}
                </div>

                <div className="flex flex-col gap-5 pt-6 border-t border-zinc-100 dark:border-zinc-800">
                    {(localDraft.attachments?.length ?? 0) > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {localDraft.attachments?.map((att) => (
                                <div key={att.id} className="group/att flex items-center gap-2.5 px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 transition-all hover:border-zinc-300">
                                    <Paperclip className="h-3.5 w-3.5 text-zinc-400" />
                                    <span className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400">{att.filename}</span>
                                    <button
                                        onClick={() => openDocument({ id: att.id, name: att.filename, url: "" })}
                                        className="text-[10px] font-black text-indigo-500 uppercase tracking-tighter opacity-0 group-hover/att:opacity-100 transition-opacity"
                                    >
                                        View
                                    </button>
                                    {isEditing && (
                                        <button
                                            onClick={() => handleRemoveAttachment(att.id)}
                                            className="text-zinc-400 hover:text-rose-500 transition-colors"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex items-center justify-between gap-4">
                        {isEditing && (
                            <button
                                onClick={handleAddAttachment}
                                className="flex items-center gap-2 px-4 py-2 rounded-full border border-dashed border-zinc-300 dark:border-zinc-700 text-[12px] font-bold text-zinc-500 hover:border-indigo-500 hover:text-indigo-500 transition-all"
                            >
                                <Plus className="h-4 w-4" /> Add Enclosure
                            </button>
                        )}
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            onChange={handleFileChange}
                        />

                        <div className="flex items-center gap-3 ml-auto">
                            {isEditing ? (
                                <div className="text-[11px] font-bold text-zinc-400 italic">
                                    Changes locked upon "Lock Draft"
                                </div>
                            ) : (
                                <>
                                    <button
                                        onClick={() => { }} // Placeholder for "Save to Templates"
                                        className="flex items-center gap-2 px-4 py-2 rounded-full text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 text-[12px] font-bold transition-colors"
                                    >
                                        Save as Template
                                    </button>
                                    <button
                                        onClick={handleApproveAndSend}
                                        disabled={isSending || showOriginal}
                                        className={cn(
                                            "flex items-center gap-3 px-8 py-3 rounded-full text-[13px] font-black tracking-tight text-white shadow-xl transition-all active:scale-95 disabled:opacity-50",
                                            "bg-gradient-to-r from-zinc-900 to-black dark:from-white dark:to-zinc-100 dark:text-black shadow-zinc-900/20",
                                            "hover:shadow-2xl hover:shadow-black/10 dark:hover:shadow-white/10"
                                        )}
                                    >
                                        {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 fill-white dark:fill-black" />}
                                        {isSending ? "AUTHORIZING..." : "EXECUTE & SEND"}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    )
}
