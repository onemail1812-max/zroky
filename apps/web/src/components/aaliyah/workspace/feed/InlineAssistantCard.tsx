"use client"

import * as React from "react"
import { Send, Edit, Trash2, Sparkles, Loader2, Paperclip, FileText, X, AlertCircle, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { AnimatePresence, motion } from "framer-motion"

interface AttachedFile {
    id: string
    name: string
    type: string
    file?: File  // Actual File object for upload
}

export interface InlineAssistantCardProps {
    draft: {
        body: string
        subject?: string
        reasoning?: string
        intent?: string
        status?: string
        error?: string
    }
    onSend: (attachments?: File[]) => Promise<void> | void
    onEdit: () => void
    onDiscard: () => void
    onRetry?: () => void
    isSending?: boolean
    isGenerating?: boolean
}

export function InlineAssistantCard({ draft, onSend, onEdit, onDiscard, onRetry, isSending, isGenerating }: InlineAssistantCardProps) {
    const [isEditing, setIsEditing] = React.useState(false)
    const [editedBody, setEditedBody] = React.useState(draft.body)
    const [showSuccess, setShowSuccess] = React.useState(false)

    // Attachment State
    const [attachedFiles, setAttachedFiles] = React.useState<AttachedFile[]>([])
    const [isDragging, setIsDragging] = React.useState(false)

    React.useEffect(() => {
        setEditedBody(draft.body)
        setIsEditing(false)
        setAttachedFiles([])
    }, [draft.body])

    const handleEdit = () => {
        setIsEditing(true)
        onEdit()
    }

    const handleSave = () => {
        setIsEditing(false)
    }

    const handleSendAction = async () => {
        const realFiles = attachedFiles.map(a => a.file).filter(Boolean) as File[]
        try {
            await onSend(realFiles.length > 0 ? realFiles : undefined)
            setShowSuccess(true)
            // Parent handles unmounting usually, but let's keep success state visible briefly
        } catch (error) {
            console.error("Failed to send:", error)
        }
    }

    // -- Drag & Drop Handlers --
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(true)
    }

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(false)
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(false)

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const files = Array.from(e.dataTransfer.files)
            const newAttachments = files.map(f => ({
                id: `drop_${Date.now()}_${f.name}`,
                name: f.name,
                type: f.type || "file",
                file: f
            }))

            attachFiles(newAttachments)
        }
    }

    // -- Attachment Logic --
    const attachFiles = (files: AttachedFile[]) => {
        setAttachedFiles(prev => [...prev, ...files])
    }

    const removeAttachment = (id: string) => {
        setAttachedFiles(prev => prev.filter(f => f.id !== id))
    }

    // Error State Boundary
    if (draft.error || draft.status === "error") {
        return (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 p-4 rounded-2xl bg-red-50/50 border border-red-100 flex items-start gap-4 cursor-pointer hover:bg-red-50 transition-colors"
                onClick={onRetry}
            >
                <div className="h-10 w-10 shrink-0 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                    <AlertCircle className="h-5 w-5" />
                </div>
                <div className="flex-1 pt-0.5">
                    <h4 className="text-[14px] font-semibold text-red-900 leading-none mb-1.5">Draft couldn't be generated</h4>
                    <p className="text-[13px] text-red-700/80 font-medium leading-relaxed">
                        {draft.error || "Aaliyah encountered an issue while generating this draft. Tap to retry."}
                    </p>
                </div>
                <button
                    onClick={(e) => { e.stopPropagation(); onDiscard(); }}
                    className="h-8 w-8 rounded-full hover:bg-red-100 flex items-center justify-center text-red-400 hover:text-red-600 transition-colors"
                >
                    <X className="h-4 w-4" />
                </button>
            </motion.div>
        )
    }

    // Loading State Boundary
    if (isGenerating || draft.status === "generating") {
        return (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 p-5 rounded-2xl bg-zinc-50 border border-zinc-200/50 flex items-center gap-4"
            >
                <div className="h-10 w-10 shrink-0 rounded-full bg-white shadow-sm ring-1 ring-black/5 flex items-center justify-center text-indigo-500">
                    <Loader2 className="h-5 w-5 animate-spin" />
                </div>
                <div>
                    <h4 className="text-[14px] font-semibold text-zinc-900 leading-none mb-1">Aaliyah is thinking...</h4>
                    <p className="text-[13px] text-zinc-500 font-medium">Generating a bespoke reply based on your style guidelines.</p>
                </div>
            </motion.div>
        )
    }

    // Success Checkmark State overlay
    if (showSuccess) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-6 h-32 rounded-2xl bg-emerald-50/50 border border-emerald-100 flex flex-col items-center justify-center gap-3"
            >
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600"
                >
                    <CheckCircle2 className="h-6 w-6" />
                </motion.div>
                <span className="text-emerald-900 font-semibold tracking-tight">Sent Successfully</span>
            </motion.div>
        )
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
            className="mt-12 pt-8 border-t border-zinc-100"
        >
            {/* Header */}
            <div className="flex items-center gap-3 mb-5 pl-1">
                <div className="h-7 w-7 rounded-full bg-zinc-900 flex items-center justify-center ring-2 ring-zinc-100 shadow-sm">
                    <Sparkles className="h-3.5 w-3.5 text-white" />
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold text-zinc-900 tracking-tight">
                        Aaliyah
                    </span>
                    <span className="text-[11px] text-zinc-400 font-medium">
                        drafted a reply
                    </span>
                </div>
            </div>

            {/* Draft Card - Dropzone Container */}
            <div
                className="rounded-2xl border border-zinc-200/80 bg-zinc-50/50 overflow-visible relative"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                {/* Drag Overlay */}
                <AnimatePresence>
                    {isDragging && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 z-50 bg-blue-50/90 backdrop-blur-sm border-2 border-dashed border-blue-400 rounded-2xl flex flex-col items-center justify-center"
                        >
                            <div className="h-12 w-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-3">
                                <Paperclip className="h-6 w-6" />
                            </div>
                            <span className="text-blue-900 font-bold tracking-tight">Drop files to attach</span>
                            <span className="text-blue-600 font-medium text-[13px] mt-1">Aaliyah will update the draft automatically</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Reasoning/Intent bar */}
                {draft.reasoning && (
                    <div className="px-6 py-3 bg-zinc-100/50 border-b border-zinc-200/50">
                        <p className="text-[12px] text-zinc-600 font-medium italic leading-relaxed">
                            {draft.reasoning}
                        </p>
                    </div>
                )}

                {/* Draft body */}
                <div className="px-6 py-5">
                    {isEditing ? (
                        <textarea
                            value={editedBody}
                            onChange={(e) => setEditedBody(e.target.value)}
                            className="w-full text-[15px] leading-[1.8] text-zinc-900 font-medium bg-white border border-zinc-200 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all resize-none min-h-[120px]"
                            rows={6}
                            autoFocus
                        />
                    ) : (
                        <div className="text-[15px] leading-[1.8] text-zinc-800 font-medium whitespace-pre-wrap">
                            {editedBody}
                        </div>
                    )}
                </div>

                {/* Attachments Display Area */}
                {attachedFiles.length > 0 && (
                    <div className="px-6 pb-5 pt-1 flex flex-wrap gap-2">
                        <AnimatePresence>
                            {attachedFiles.map(file => (
                                <motion.div
                                    key={file.id}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className="flex items-center gap-2 bg-white border border-zinc-200 px-3 py-1.5 rounded-lg shadow-sm"
                                >
                                    <FileText className="h-3.5 w-3.5 text-zinc-400" />
                                    <span className="text-[12px] font-semibold text-zinc-700 truncate max-w-[150px]">{file.name}</span>
                                    <button
                                        onClick={() => removeAttachment(file.id)}
                                        className="h-5 w-5 rounded-md hover:bg-red-50 flex items-center justify-center text-zinc-400 hover:text-red-500 transition-colors ml-1"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="px-4 py-3 bg-white border-t border-zinc-100 flex items-center justify-between relative rounded-b-2xl">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onDiscard}
                            className="h-9 w-9 flex items-center justify-center text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                            aria-label="Discard Draft"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>

                        <div className="w-px h-4 bg-zinc-200 mx-1" />

                        {/* File Attachment Trigger */}
                        <div className="relative">
                            <input
                                type="file"
                                id="assistant-card-file-input"
                                className="hidden"
                                multiple
                                onChange={(e) => {
                                    if (e.target.files) {
                                        const files = Array.from(e.target.files).map(f => ({
                                            id: `upload_${Date.now()}_${f.name}`,
                                            name: f.name,
                                            type: f.type || "file",
                                            file: f
                                        }))
                                        attachFiles(files)
                                        // Reset input so the same file can be selected again
                                        e.target.value = ''
                                    }
                                }}
                            />
                            <button
                                onClick={() => document.getElementById('assistant-card-file-input')?.click()}
                                className="h-9 w-9 flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-xl transition-colors"
                                aria-label="Attach file"
                            >
                                <Paperclip className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {isEditing ? (
                            <button
                                onClick={handleSave}
                                className="h-9 px-4 text-[13px] font-semibold text-zinc-700 bg-zinc-100 border border-zinc-200/50 hover:bg-zinc-200 rounded-xl transition-all"
                            >
                                Done
                            </button>
                        ) : (
                            <button
                                onClick={handleEdit}
                                className="h-9 px-4 text-[13px] font-semibold text-zinc-600 bg-white border border-zinc-200 hover:text-zinc-900 hover:bg-zinc-50 hover:border-zinc-300 rounded-xl transition-all flex items-center gap-2 shadow-sm shadow-black/5"
                            >
                                <Edit className="h-3.5 w-3.5" />
                                Edit
                            </button>
                        )}

                        <button
                            onClick={handleSendAction}
                            disabled={isSending}
                            className={cn(
                                "h-9 px-5 text-[13px] font-semibold text-white rounded-xl transition-all flex items-center gap-2 shadow-sm shadow-black/10 origin-right min-w-[124px] justify-center",
                                isSending
                                    ? "bg-zinc-900/50 cursor-not-allowed scale-95"
                                    : "bg-zinc-900 hover:bg-black hover:scale-[1.02] active:scale-95"
                            )}
                        >
                            <AnimatePresence mode="popLayout">
                                {isSending ? (
                                    <motion.div
                                        key="loading"
                                        initial={{ opacity: 0, scale: 0.5, y: -10 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.5, y: 10 }}
                                        className="absolute"
                                    >
                                        <Loader2 className="h-4 w-4 animate-spin text-white" />
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="content"
                                        initial={{ opacity: 0, scale: 0.5, y: 10 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.5, y: -10 }}
                                        className="flex items-center gap-2"
                                    >
                                        <Send className="h-3.5 w-3.5 text-white/90" />
                                        Send Reply
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
    )
}
