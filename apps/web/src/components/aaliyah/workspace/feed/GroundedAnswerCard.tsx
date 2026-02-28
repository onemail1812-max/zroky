"use client"

import * as React from "react"
import { motion, Variants } from "framer-motion"
import { FileText, Mail, CalendarRange, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

export type Evidence = {
    type: "thread" | "event"
    id: string
    provider: "google" | "microsoft" | "unknown"
    timestamp?: string
}

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 30, scale: 0.96, filter: "blur(4px)" },
    visible: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)", transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
}

export function GroundedAnswerCard({
    text,
    evidence,
    status,
    onSourceClick,
}: {
    text: string
    evidence: Evidence[]
    status: "found" | "not_found" | "clarify"
    onSourceClick: (ev: Evidence) => void
}) {
    return (
        <motion.div variants={itemVariants} className="flex justify-start w-full relative group">
            <div className="max-w-3xl w-full">
                <div className="flex items-center gap-2.5 mb-3 px-1">
                    <div className="relative flex items-center justify-center">
                        <span className={cn(
                            "absolute inset-0 rounded-full animate-ping opacity-20",
                            status === "found" ? "bg-emerald-500" : status === "clarify" ? "bg-amber-500" : "bg-zinc-500"
                        )} />
                        <span className={cn(
                            "h-2 w-2 rounded-full relative",
                            status === "found" ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" : status === "clarify" ? "bg-amber-500" : "bg-zinc-400"
                        )} />
                    </div>
                    <span className="text-[10px] font-bold tracking-[0.2em] text-zinc-500 uppercase">Grounded Response</span>
                </div>

                <div className="relative rounded-3xl border border-zinc-200/60 dark:border-zinc-800/60 bg-white/60 dark:bg-zinc-950/60 backdrop-blur-xl p-5 shadow-sm transition-all hover:bg-white/80 dark:hover:bg-zinc-950/80">
                    <div className="text-[15px] text-zinc-800 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap font-medium" data-testid="grounded-answer-text">
                        {text}
                    </div>

                    {evidence.length > 0 && (
                        <div className="mt-5 pt-4 border-t border-zinc-100 dark:border-zinc-800/80">
                            <div className="flex items-center gap-2 mb-3">
                                <FileText className="h-3.5 w-3.5 text-zinc-400" />
                                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Verified Sources</span>
                            </div>
                            <div className="flex flex-wrap gap-2.5">
                                {evidence.map((ev, idx) => (
                                    <button
                                        key={`${ev.id}-${idx}`}
                                        onClick={() => onSourceClick(ev)}
                                        className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 shadow-sm border border-zinc-200/80 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-md transition-all group/src"
                                    >
                                        {ev.type === "thread" ? (
                                            <Mail className="h-3.5 w-3.5 text-indigo-500 group-hover/src:text-indigo-600 transition-colors" />
                                        ) : (
                                            <CalendarRange className="h-3.5 w-3.5 text-rose-500 group-hover/src:text-rose-600 transition-colors" />
                                        )}
                                        <span className="text-[12px] font-semibold text-zinc-700 dark:text-zinc-300">
                                            {ev.provider === "google" ? "Gmail" : ev.provider === "microsoft" ? "Outlook" : "Calendar"}
                                        </span>
                                        <ArrowRight className="h-3 w-3 text-zinc-300 group-hover/src:text-zinc-600 group-hover/src:translate-x-0.5 transition-all" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    )
}
