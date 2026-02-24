import React, { useEffect } from "react"
import { X, FileText, Download, Maximize2 } from "lucide-react"
import { useViewerStore } from "@/lib/aaliyah/viewerStore"
import { cn } from "@/lib/utils"
import { PdfViewer } from "./PdfViewer"
import { SheetPreview } from "./SheetPreview"
// import { ImageViewer } from "./ImageViewer"

export function DocumentViewerPanel() {
    const { isViewerOpen, activeDocument, closeViewer } = useViewerStore()

    // Close on Escape key
    useEffect(() => {
        if (!isViewerOpen) return
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") closeViewer()
        }
        window.addEventListener("keydown", handleKeyDown)
        return () => window.removeEventListener("keydown", handleKeyDown)
    }, [isViewerOpen, closeViewer])

    if (!isViewerOpen || !activeDocument) return null

    return (
        <div className="flex flex-col h-full bg-surface border-l border-borderSubtle">
            {/* Header */}
            <div className="h-14 shrink-0 flex items-center justify-between px-4 border-b border-borderSubtle bg-appBg">
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className="h-8 w-8 rounded-lg bg-surfaceElevated border border-borderSubtle flex items-center justify-center shrink-0">
                        <FileText className="h-4 w-4 text-textSecondary" />
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="text-[14px] font-medium text-textPrimary truncate">
                            {activeDocument.name}
                        </span>
                        <span className="text-[12px] text-textMuted uppercase">
                            {activeDocument.type} {activeDocument.size ? `• ${(activeDocument.size / 1024).toFixed(0)} KB` : ""}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                    <button
                        type="button"
                        className="h-8 w-8 rounded-md text-textSecondary hover:bg-surface hover:text-textPrimary flex items-center justify-center transition-colors"
                        title="Download"
                        onClick={() => window.open(activeDocument.url, '_blank')}
                    >
                        <Download className="h-4 w-4" />
                    </button>
                    <button
                        type="button"
                        className="h-8 w-8 rounded-md text-textSecondary hover:bg-surface hover:text-textPrimary flex items-center justify-center transition-colors"
                        title="View Full Screen"
                        onClick={() => window.open(activeDocument.url, '_blank')}
                    >
                        <Maximize2 className="h-4 w-4" />
                    </button>
                    <div className="w-px h-4 bg-borderSubtle mx-1" />
                    <button
                        type="button"
                        onClick={closeViewer}
                        className="h-8 w-8 rounded-md text-textSecondary hover:bg-surface hover:text-textPrimary flex items-center justify-center transition-colors"
                        title="Close Viewer"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden relative bg-appBg">
                {activeDocument.type === "pdf" && (
                    <PdfViewer document={activeDocument} />
                )}
                {activeDocument.type === "sheet" && (
                    <SheetPreview document={activeDocument} />
                )}
                {activeDocument.type === "image" && (
                    <div className="w-full h-full flex items-center justify-center p-4">
                        <img src={activeDocument.url} alt={activeDocument.name} className="max-w-full max-h-full object-contain rounded-lg shadow-sm" />
                    </div>
                )}
                {activeDocument.type === "unknown" && (
                    <div className="flex h-full items-center justify-center flex-col gap-3 text-textMuted p-6 text-center">
                        <FileText className="h-12 w-12 opacity-20" />
                        <p className="text-sm font-medium text-textSecondary">Preview not available</p>
                        <p className="text-xs">Download the file to view its contents.</p>
                    </div>
                )}
            </div>
        </div>
    )
}
