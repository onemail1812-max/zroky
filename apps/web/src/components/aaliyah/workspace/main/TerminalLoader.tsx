"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

const STREAM_MESSAGES = [
    "Establishing secure connection to providers...",
    "Bypassing generic filters...",
    "Extracting high-priority context...",
    "Analyzing relationship graphs...",
    "Identifying action items and approvals...",
    "Structuring Aaliyah Neural Matrix...",
    "Finalizing inbox decryption..."
]

export function TerminalLoader({ progress = 0 }: { progress?: number }) {
    const [msgIndex, setMsgIndex] = React.useState(0)
    const [elapsed, setElapsed] = React.useState(0)

    React.useEffect(() => {
        const interval = setInterval(() => {
            setElapsed(prev => prev + 0.1)
        }, 100)
        return () => clearInterval(interval)
    }, [])

    React.useEffect(() => {
        // Change message every 1.5 to 2.5 seconds
        const msgs = STREAM_MESSAGES.length
        const interval = setInterval(() => {
            setMsgIndex(i => (i + 1) % msgs)
        }, 2200)
        return () => clearInterval(interval)
    }, [])

    return (
        <div className="flex flex-col items-center justify-center p-8 w-full max-w-md mx-auto h-full min-h-[400px]">
            {/* The Ring */}
            <div className="relative flex items-center justify-center mb-12">
                {/* Outer Glow */}
                <motion.div
                    className="absolute inset-0 rounded-full bg-indigo-500/10 blur-2xl"
                    animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                    transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                />

                {/* SVG Ring */}
                <svg className="w-32 h-32 -rotate-90" viewBox="0 0 100 100">
                    <circle
                        cx="50"
                        cy="50"
                        r="46"
                        className="stroke-zinc-100 fill-none"
                        strokeWidth="2"
                    />
                    <motion.circle
                        cx="50"
                        cy="50"
                        r="46"
                        className="stroke-indigo-500 fill-none drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        initial={{ strokeDasharray: "0 289" }}
                        animate={{ strokeDasharray: `${(progress / 100) * 289} 289` }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                    />
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <motion.div
                        className="text-2xl font-black text-zinc-900 tracking-tighter"
                        animate={{ opacity: [1, 0.7, 1] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                    >
                        {Math.round(progress)}%
                    </motion.div>
                </div>
            </div>

            {/* Terminal Stream */}
            <div className="w-full bg-zinc-50 border border-zinc-200/60 rounded-2xl p-4 shadow-inner relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500/20" />

                <div className="flex items-center gap-3 mb-3">
                    <div className="flex gap-1.5">
                        <div className="h-2 w-2 rounded-full bg-zinc-300" />
                        <div className="h-2 w-2 rounded-full bg-zinc-300" />
                        <div className="h-2 w-2 rounded-full bg-zinc-300" />
                    </div>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Aaliyah Boot Sequence</span>
                </div>

                <div className="font-mono text-[12px] text-zinc-600 leading-relaxed min-h-[60px] flex flex-col justify-end">
                    <AnimatePresence mode="popLayout">
                        <motion.div
                            key={msgIndex}
                            initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
                            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                            exit={{ opacity: 0, y: -10, filter: "blur(4px)", position: "absolute" }}
                            transition={{ duration: 0.4 }}
                            className="flex items-start gap-2"
                        >
                            <span className="text-zinc-400 shrink-0">[{elapsed.toFixed(1)}s]</span>
                            <span className="text-indigo-600 font-medium">{STREAM_MESSAGES[msgIndex]}</span>
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Subtle animated cursor line */}
                <motion.div
                    className="h-[1px] w-4 bg-indigo-500 mt-2"
                    animate={{ opacity: [1, 0] }}
                    transition={{ repeat: Infinity, duration: 0.8 }}
                />
            </div>
        </div>
    )
}
