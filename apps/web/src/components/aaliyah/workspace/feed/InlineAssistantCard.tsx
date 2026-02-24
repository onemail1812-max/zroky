"use client"

import * as React from "react"
import { Send, Edit, Trash2, Sparkles, Loader2, Paperclip, FileText, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { AnimatePresence, motion } from "framer-motion"

interface AttachedFile {
    id: string
    name: string
    type: string
}

const MOCK_RECENT_FILES: AttachedFile[] = [
    { id: "f1", name: "Q3_Report_Final.pdf", type: "pdf" },
    { id: "f2", name: "Project_Timeline.xlsx", type: "excel" },
    { id: "f3", name: "Contract_Draft_v2.docx", type: "word" },
]

interface InlineAssistantCardProps {
    draft: {
        body: string
        subject?: string
        reasoning?: string
        intent?: string
        status?: string
    }
    onSend: () => void
    onEdit: () => void
    onDiscard: () => void
    isSending?: boolean
}

export function InlineAssistantCard({ draft, onSend, onEdit, onDiscard, isSending }: InlineAssistantCardProps) {
    const [isEditing, setIsEditing] = React.useState(false)
    const [editedBody, setEditedBody] = React.useState(draft.body)

    // Attachment State
    const [attachedFiles, setAttachedFiles] = React.useState<AttachedFile[]>([])
    const [isDragging, setIsDragging] = React.useState(false)
    const [showPicker, setShowPicker] = React.useState(false)

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
            const newAttachments = files.map(file => ({
                id: `drop_${Date.now()}_${file.name}`,
                name: file.name,
                type: file.type || "file"
            }))

            attachFiles(newAttachments)
        }
    }

    // -- Attachment Logic --
    const attachFiles = (files: AttachedFile[]) => {
        setAttachedFiles(prev => [...prev, ...files])

        // Auto-modify draft text
        setEditedBody(prev => {
            const appendText = "\n\nAttached, I've added the file you requested."
            if (!prev.includes("Attached, I've added")) {
                return prev + appendText
            }
            return prev
        })
        setShowPicker(false)
    }

    const removeAttachment = (id: string) => {
        setAttachedFiles(prev => prev.filter(f => f.id !== id))
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
                <div className="h-7 w-7 rounded-full bg-zinc-900 flex items-center justify-center ring-2 ring-zinc-100">
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
                        <p className="text-[12px] text-zinc-500 font-medium italic leading-relaxed">
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
                            className="w-full text-[15px] leading-[1.8] text-zinc-900 font-medium bg-white border border-zinc-200 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 transition-all resize-none min-h-[120px]"
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
                                        className="h-5 w-5 rounded-md hover:bg-zinc-100 flex items-center justify-center text-zinc-400 hover:text-red-500 transition-colors ml-1"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="px-6 py-4 bg-white border-t border-zinc-100 flex items-center justify-between relative">
                    <div className="flex items-center gap-1">
                        <button
                            onClick={onDiscard}
                            className="h-9 px-4 text-[13px] font-medium text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all flex items-center gap-2"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                            Discard
                        </button>

                        <div className="w-px h-4 bg-zinc-200 mx-2" />

                        {/* Recent Files Popover Trigger */}
                        <div className="relative">
                            <button
                                onClick={() => setShowPicker(!showPicker)}
                                className={cn(
                                    "h-9 px-3 rounded-xl transition-all flex items-center gap-2 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50",
                                    showPicker && "bg-zinc-100 text-zinc-900"
                                )}
                            >
                                <Paperclip className="h-4 w-4" />
                            </button>

                            {/* Modern Recent Files Popover */}
                            <AnimatePresence>
                                {showPicker && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        transition={{ duration: 0.15 }}
                                        className="absolute bottom-full left-0 mb-3 w-64 bg-white rounded-2xl shadow-2xl border border-zinc-100 overflow-hidden z-50 flex flex-col"
                                    >
                                        <div className="px-4 py-3 border-b border-zinc-100 bg-zinc-50/50">
                                            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Suggested Context</span>
                                        </div>
                                        <div className="p-2 space-y-1">
                                            {MOCK_RECENT_FILES.map(file => (
                                                <button
                                                    key={file.id}
                                                    onClick={() => attachFiles([file])}
                                                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-zinc-50 rounded-xl transition-colors text-left group"
                                                >
                                                    <div className="h-8 w-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-400 group-hover:text-zinc-600 transition-colors shrink-0">
                                                        <FileText className="h-4 w-4" />
                                                    </div>
                                                    <div className="flex flex-col truncate">
                                                        <span className="text-[13px] font-semibold text-zinc-700 truncate">{file.name}</span>
                                                        <span className="text-[10px] text-zinc-400 font-medium capitalize">{file.type} Document</span>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                        <div className="px-4 py-3 border-t border-zinc-100 bg-zinc-50/50 flex items-center justify-center">
                                            <span className="text-[11px] font-semibold text-zinc-400 hover:text-zinc-900 cursor-pointer transition-colors">Browse all files</span>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {isEditing ? (
                            <button
                                onClick={handleSave}
                                className="h-9 px-5 text-[13px] font-semibold text-zinc-700 bg-zinc-100 border border-zinc-200 hover:bg-zinc-200 rounded-xl transition-all"
                            >
                                Done Editing
                            </button>
                        ) : (
                            <button
                                onClick={handleEdit}
                                className="h-9 px-4 text-[13px] font-semibold text-zinc-600 bg-white border border-zinc-200 hover:text-zinc-900 hover:bg-zinc-50 rounded-xl transition-all flex items-center gap-2"
                            >
                                <Edit className="h-3.5 w-3.5" />
                                Edit
                            </button>
                        )}

                        <button
                            onClick={onSend}
                            disabled={isSending}
                            className={cn(
                                "h-9 px-6 text-[13px] font-semibold text-white rounded-xl transition-all flex items-center gap-2 shadow-sm",
                                isSending
                                    ? "bg-zinc-400 cursor-not-allowed"
                                    : "bg-zinc-900 hover:bg-black"
                            )}
                        >
                            {isSending ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                                <Send className="h-3.5 w-3.5" />
                            )}
                            {isSending ? "Sending..." : "Send Reply"}
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
    )
}
