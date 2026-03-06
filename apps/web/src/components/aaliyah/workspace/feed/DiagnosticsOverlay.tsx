"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { AnimatePresence, motion } from "framer-motion"
import { X } from "lucide-react"

interface DiagnosticsOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    logs: string;
}

export function DiagnosticsOverlay({ isOpen, onClose, logs }: DiagnosticsOverlayProps) {
    const [isMounted, setIsMounted] = React.useState(false)

    React.useEffect(() => {
        setIsMounted(true)
    }, [])

    if (!isMounted || typeof document === 'undefined') return null

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-8 pointer-events-auto"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-[#1e1e1e] w-full max-w-5xl h-[80vh] rounded-2xl flex flex-col overflow-hidden shadow-2xl ring-1 ring-white/10"
                    >
                        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0 bg-neutral-900">
                            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                                Live Diagnostics
                            </h2>
                            <button aria-label="Close diagnostics" onClick={onClose} className="text-zinc-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-1.5 rounded-lg active:scale-95">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 bg-[#111111] font-mono text-[11px] leading-relaxed text-emerald-400/90 custom-scrollbar">
                            <pre className="whitespace-pre-wrap select-text">{logs}</pre>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    )
}
