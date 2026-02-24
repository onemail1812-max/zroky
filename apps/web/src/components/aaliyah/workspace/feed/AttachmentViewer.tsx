"use client"

import * as React from "react"
import { X, FileText, Image as ImageIcon, Table, Download, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface Attachment {
    id: string
    filename: string
    mimeType: string
    size: number
    url?: string
}

interface AttachmentViewerProps {
    attachment: Attachment
    allAttachments?: Attachment[]
    onClose: () => void
    onNavigate?: (attachment: Attachment) => void
}

export function AttachmentViewer({ attachment, allAttachments = [], onClose, onNavigate }: AttachmentViewerProps) {
    const isPdf = attachment.mimeType.includes("pdf")
    const isImage = attachment.mimeType.includes("image")
    const isSpreadsheet = attachment.mimeType.includes("spreadsheet") || attachment.mimeType.includes("excel") || attachment.mimeType.includes("csv")

    const currentIndex = allAttachments.findIndex(a => a.id === attachment.id)
    const hasPrev = currentIndex > 0
    const hasNext = currentIndex < allAttachments.length - 1

    // Close on Escape key
    React.useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose()
            if (e.key === "ArrowLeft" && hasPrev) onNavigate?.(allAttachments[currentIndex - 1])
            if (e.key === "ArrowRight" && hasNext) onNavigate?.(allAttachments[currentIndex + 1])
        }
        window.addEventListener("keydown", handleKey)
        return () => window.removeEventListener("keydown", handleKey)
    }, [onClose, hasPrev, hasNext, currentIndex, allAttachments, onNavigate])

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] flex flex-col bg-zinc-900/95 backdrop-blur-sm"
            onClick={onClose}
        >
            {/* Top Bar */}
            <div
                className="h-14 px-4 flex items-center justify-between shrink-0 bg-black/40"
                onClick={e => e.stopPropagation()}
            >
                {/* Left: File info */}
                <div className="flex items-center gap-3 text-white min-w-0">
                    <div className={cn(
                        "h-8 w-8 flex items-center justify-center rounded-lg shrink-0",
                        isPdf ? "bg-red-500/20 text-red-400" :
                            isSpreadsheet ? "bg-emerald-500/20 text-emerald-400" :
                                "bg-blue-500/20 text-blue-400"
                    )}>
                        {isPdf ? <FileText className="h-4 w-4" /> :
                            isSpreadsheet ? <Table className="h-4 w-4" /> :
                                <ImageIcon className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-[13px] font-semibold text-white truncate">{attachment.filename}</h3>
                        <p className="text-[11px] text-zinc-400">{(attachment.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                </div>

                {/* Right: Close */}
                <div className="flex items-center">
                    <button
                        onClick={onClose}
                        className="h-9 w-9 flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                        title="Close (Esc)"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>
            </div>

            {/* Main Viewer Area */}
            <div
                className="flex-1 relative flex items-center justify-center overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Left Arrow */}
                {hasPrev && (
                    <button
                        onClick={() => onNavigate?.(allAttachments[currentIndex - 1])}
                        className="absolute left-4 z-20 h-10 w-10 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </button>
                )}

                {/* Right Arrow */}
                {hasNext && (
                    <button
                        onClick={() => onNavigate?.(allAttachments[currentIndex + 1])}
                        className="absolute right-4 z-20 h-10 w-10 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors"
                    >
                        <ChevronRight className="h-5 w-5" />
                    </button>
                )}

                {/* Content */}
                <motion.div
                    key={attachment.id}
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.25 }}
                    className={cn(
                        "relative z-10",
                        isImage
                            ? "max-w-[90vw] max-h-[85vh] flex items-center justify-center"
                            : "w-[90vw] max-w-5xl h-[85vh] bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col"
                    )}
                >
                    {isSpreadsheet ? (
                        <div className="flex-1 flex flex-col overflow-hidden">
                            {/* Sticky column headers */}
                            <div className="h-9 border-b border-zinc-200 flex items-center bg-zinc-50 px-0 shrink-0">
                                <div className="w-12 shrink-0 text-[10px] font-bold text-zinc-400 text-center border-r border-zinc-200">#</div>
                                {['A', 'B', 'C', 'D', 'E', 'F'].map(col => (
                                    <div key={col} className="flex-1 text-[10px] font-bold text-zinc-400 text-center border-r border-zinc-200 last:border-r-0">{col}</div>
                                ))}
                            </div>
                            {/* Scrollable rows */}
                            <div className="flex-1 overflow-auto">
                                {Array.from({ length: 30 }, (_, i) => i + 1).map(row => (
                                    <div key={row} className="flex border-b border-zinc-100 hover:bg-blue-50/30">
                                        <div className="w-12 shrink-0 bg-zinc-50 border-r border-zinc-200 text-[10px] text-zinc-400 font-bold flex items-center justify-center py-2.5">{row}</div>
                                        {[
                                            row === 1 ? 'Category' : `Item ${row}`,
                                            row === 1 ? 'Revenue' : `$${(Math.random() * 10000).toFixed(2)}`,
                                            row === 1 ? 'Growth' : `${(Math.random() * 50).toFixed(1)}%`,
                                            row === 1 ? 'Quarter' : `Q${Math.ceil(Math.random() * 4)}`,
                                            row === 1 ? 'Region' : ['North', 'South', 'East', 'West'][Math.floor(Math.random() * 4)],
                                            row === 1 ? 'Status' : ['Active', 'Pending', 'Closed'][Math.floor(Math.random() * 3)],
                                        ].map((val, i) => (
                                            <div key={i} className={cn(
                                                "flex-1 border-r border-zinc-100 last:border-r-0 px-3 py-2.5 text-[12px] font-medium truncate",
                                                row === 1 ? "bg-zinc-50 text-zinc-600 font-bold" : "text-zinc-700"
                                            )}>
                                                {val}
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : isImage ? (
                        <div className="flex items-center justify-center">
                            <div className="bg-zinc-800 rounded-xl p-12 flex flex-col items-center gap-4 shadow-2xl">
                                <ImageIcon className="h-32 w-32 text-zinc-600" />
                                <span className="text-zinc-400 font-bold uppercase tracking-widest text-xs">Image Preview</span>
                                <span className="text-zinc-500 text-xs">1920 × 1080</span>
                            </div>
                        </div>
                    ) : (
                        /* PDF — scrollable pages */
                        <div className="flex-1 overflow-auto bg-zinc-200 p-8">
                            <div className="space-y-8 max-w-2xl mx-auto">
                                {[1, 2, 3, 4, 5].map(page => (
                                    <div key={page} className="bg-white shadow-lg border border-zinc-300 rounded-sm p-10 aspect-[1/1.4]">
                                        <div className="text-[10px] text-zinc-300 font-bold mb-6 text-right">Page {page} of 5</div>
                                        {page === 1 && <div className="h-7 w-2/3 bg-zinc-200 rounded mb-8" />}
                                        <div className="space-y-3">
                                            {Array.from({ length: 8 }).map((_, i) => (
                                                <div key={i} className={cn("h-3 bg-zinc-100 rounded", i % 3 === 2 ? "w-5/6" : i % 5 === 0 ? "w-4/5" : "w-full")} />
                                            ))}
                                            <div className="h-3 w-0" />
                                            {Array.from({ length: 5 }).map((_, i) => (
                                                <div key={`b${i}`} className={cn("h-3 bg-zinc-100 rounded", i % 2 === 0 ? "w-full" : "w-3/4")} />
                                            ))}
                                        </div>
                                        <div className="mt-auto pt-12 h-3 w-8 bg-zinc-200 rounded mx-auto" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </motion.div>
            </div>

            {/* Bottom: Page indicator */}
            {allAttachments.length > 1 && (
                <div className="h-10 flex items-center justify-center shrink-0 bg-black/40">
                    <span className="text-[12px] text-zinc-500 font-medium">
                        {currentIndex + 1} of {allAttachments.length}
                    </span>
                </div>
            )}
        </motion.div>
    )
}
