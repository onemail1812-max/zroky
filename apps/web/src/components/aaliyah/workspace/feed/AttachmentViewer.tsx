"use client"

import * as React from "react"
import { X, FileText, Image as ImageIcon, Table, Download, ExternalLink, ChevronLeft, ChevronRight, Loader2, AlertCircle } from "lucide-react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import * as XLSX from "xlsx"
import toast from "react-hot-toast"
import { handleUnauthorized } from "@/lib/aaliyah/api"

interface Attachment {
    id: string
    filename: string
    mimeType: string
    size: number
    url?: string
}

function SpreadsheetRenderer({ url, filename }: { url?: string, filename: string }) {
    const [data, setData] = React.useState<any[][]>([])
    const [error, setError] = React.useState<string | null>(null)
    const [loading, setLoading] = React.useState(true)

    React.useEffect(() => {
        if (!url) {
            setError("No file URL provided.")
            setLoading(false)
            return
        }

        async function fetchAndParse() {
            try {
                const response = await fetch(url as string)
                if (response.status === 401) { handleUnauthorized(); return }
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)

                const arrayBuffer = await response.arrayBuffer()
                const workbook = XLSX.read(arrayBuffer, { type: 'array' })

                // Get first sheet
                const firstSheetName = workbook.SheetNames[0]
                const worksheet = workbook.Sheets[firstSheetName]

                // Convert to array of arrays (handling up to 100 rows for performance)
                const jsonData = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 })
                setData(jsonData.slice(0, 100))
            } catch (e: any) {
                console.error("Spreadsheet rendering error:", e)
                setError(e.message || "Failed to parse spreadsheet.")
            } finally {
                setLoading(false)
            }
        }

        fetchAndParse()
    }, [url])

    if (loading) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 bg-zinc-50/50">
                <Loader2 className="h-8 w-8 animate-spin mb-4 text-emerald-500" />
                <p className="text-sm font-medium">Parsing {filename}...</p>
            </div>
        )
    }

    if (error || data.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 bg-zinc-50/50">
                <AlertCircle className="h-10 w-10 mb-4 text-red-400" />
                <p className="text-sm font-medium text-red-500">{error || "Spreadsheet is empty or could not be parsed."}</p>
                <a href={url} download className="mt-4 px-4 py-2 bg-emerald-500 text-white text-xs font-semibold rounded shadow hover:bg-emerald-600 transition">
                    Download File Instead
                </a>
            </div>
        )
    }

    // Determine max columns
    const maxCols = Math.max(...data.map(row => row.length))
    const colLetters = Array.from({ length: maxCols }, (_, i) => {
        let name = ''
        let temp = i
        while (temp >= 0) {
            name = String.fromCharCode((temp % 26) + 65) + name
            temp = Math.floor(temp / 26) - 1
        }
        return name
    })

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-white">
            {/* Sticky column headers */}
            <div className="h-9 border-b border-zinc-200 flex items-center bg-zinc-50 pl-0 shrink-0 sticky top-0 z-10 w-fit min-w-full shadow-sm">
                <div className="w-12 shrink-0 text-[10px] font-bold text-zinc-400 text-center border-r border-zinc-200 sticky left-0 bg-zinc-100 z-20 flex items-center justify-center h-full shadow-[1px_0_0_0_#e4e4e7]">#</div>
                {colLetters.map(col => (
                    <div key={col} className="w-32 shrink-0 text-[10px] font-bold text-zinc-500 text-center border-r border-zinc-200 last:border-r-0 flex items-center justify-center h-full">
                        {col}
                    </div>
                ))}
            </div>

            {/* Scrollable rows */}
            <div className="flex-1 overflow-auto w-full">
                <div className="w-fit min-w-full pb-8">
                    {data.map((row, rowIndex) => (
                        <div key={rowIndex} className="flex border-b border-zinc-100 hover:bg-emerald-50/40 relative">
                            {/* Row number sticky left */}
                            <div className="w-12 shrink-0 bg-zinc-50/80 border-r border-zinc-200 text-[10px] text-zinc-400 font-bold flex items-center justify-center py-2 sticky left-0 z-10 shadow-[1px_0_0_0_#e4e4e7] backdrop-blur-sm">
                                {rowIndex + 1}
                            </div>

                            {/* Cells */}
                            {Array.from({ length: maxCols }).map((_, colIndex) => {
                                const val = row[colIndex]
                                const isHeaderRow = rowIndex === 0
                                return (
                                    <div
                                        key={colIndex}
                                        className={cn(
                                            "w-32 shrink-0 border-r border-zinc-100 last:border-r-0 px-3 py-2 text-[12px] truncate transition-colors",
                                            isHeaderRow ? "bg-zinc-50/50 text-zinc-700 font-bold shadow-[0_1px_0_0_#e4e4e7]" : "text-zinc-600 hover:bg-white",
                                            val === undefined || val === null || val === "" ? "text-transparent" : ""
                                        )}
                                        title={String(val || '')}
                                    >
                                        {val !== undefined && val !== null ? String(val) : '-'}
                                    </div>
                                )
                            })}
                        </div>
                    ))}
                    {data.length === 100 && (
                        <div className="py-4 text-center text-xs text-zinc-400 italic border-t border-zinc-100">
                            Showing first 100 rows. Download to view full file.
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
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
                        aria-label="Previous attachment"
                        onClick={() => onNavigate?.(allAttachments[currentIndex - 1])}
                        className="absolute left-4 z-20 h-10 w-10 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </button>
                )}

                {/* Right Arrow */}
                {hasNext && (
                    <button
                        aria-label="Next attachment"
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
                        <SpreadsheetRenderer url={attachment.url} filename={attachment.filename} />
                    ) : isImage ? (
                        <div className="flex items-center justify-center p-4 h-full w-full">
                            {attachment.url ? (
                                <img
                                    src={attachment.url}
                                    alt={attachment.filename}
                                    className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
                                />
                            ) : (
                                <div className="bg-zinc-800 rounded-xl p-12 flex flex-col items-center gap-4 shadow-2xl">
                                    <ImageIcon className="h-32 w-32 text-zinc-600" />
                                    <span className="text-zinc-400 font-bold uppercase tracking-widest text-xs">Image Currently Unavailable</span>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* PDF — render via iframe if URL exists */
                        <div className="flex-1 w-full h-full bg-zinc-200 flex items-center justify-center">
                            {attachment.url ? (
                                <iframe
                                    src={attachment.url}
                                    className="w-full h-full border-0"
                                    title={attachment.filename}
                                />
                            ) : (
                                <div className="space-y-8 max-w-2xl mx-auto p-8 w-full">
                                    <div className="bg-white shadow-lg border border-zinc-300 rounded-sm p-10 aspect-[1/1.4] flex flex-col items-center justify-center text-center">
                                        <div className="text-zinc-400 mb-6">
                                            <FileText className="h-16 w-16 mx-auto mb-4 opacity-70 text-red-500" />
                                            <p className="text-[15px] font-bold text-zinc-700">{attachment.filename}</p>
                                            <p className="text-[13px] font-medium mt-1">PDF viewer requires an active network connection.</p>
                                        </div>
                                        <button
                                            onClick={async () => {
                                                try {
                                                    const token = localStorage.getItem('auth_token') || localStorage.getItem('__session') || ''
                                                    const wsId = localStorage.getItem('tenant_id') || 'default'
                                                    const downloadUrl = `/api/v1/inbox/${attachment.id}/attachment`
                                                    const res = await fetch(downloadUrl, {
                                                        headers: {
                                                            'Authorization': `Bearer ${token}`,
                                                            'x-workspace-id': wsId,
                                                        }
                                                    })
                                                    if (res.status === 401) { handleUnauthorized(); return }
                                                    if (!res.ok) throw new Error(`Download failed: ${res.status}`)
                                                    const blob = await res.blob()
                                                    const blobUrl = URL.createObjectURL(blob)
                                                    const a = document.createElement('a')
                                                    a.href = blobUrl
                                                    a.download = attachment.filename
                                                    document.body.appendChild(a)
                                                    a.click()
                                                    document.body.removeChild(a)
                                                    URL.revokeObjectURL(blobUrl)
                                                    toast.success(`Downloaded ${attachment.filename}`)
                                                } catch (e) {
                                                    console.error("Download failed", e)
                                                    toast.error("Download failed. File may not be available.")
                                                }
                                            }}
                                            className="px-6 py-2.5 bg-zinc-900 text-white rounded-xl text-sm font-semibold hover:bg-black transition shadow-md flex items-center gap-2"
                                        >
                                            <Download className="h-4 w-4" />
                                            Download File
                                        </button>
                                    </div>
                                </div>
                            )}
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
