"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Mail, Calendar, CheckCircle2, Loader2, X, Sparkles, Activity } from "lucide-react"
import { cn } from "@/lib/utils"
import { useSystemStore } from "@/lib/aaliyah/store"
import type { SyncProgressItem } from "@/lib/aaliyah/api"

// ─── Individual service row ───────────────────────────────────────────────────
function SyncRow({
    icon: Icon,
    label,
    item,
    delay
}: {
    icon: React.ElementType
    label: string
    item: SyncProgressItem | null
    delay: number
}) {
    const status = item?.status ?? "waiting"
    const message = item?.message ?? "Awaiting linkage..."
    const count = item?.count ?? 0

    const isDone = status === "done"
    const isSyncing = status === "syncing"

    return (
        <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay, type: "spring", stiffness: 300, damping: 24 }}
            className="group relative flex items-start gap-4 p-3.5 rounded-xl hover:bg-zinc-100/50 transition-colors"
        >
            <div className="relative flex-shrink-0 mt-0.5">
                <div className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center transition-all duration-500",
                    isDone ? "bg-emerald-50 text-emerald-600 shadow-sm"
                        : isSyncing ? "bg-indigo-50 text-indigo-600 shadow-[0_0_15px_rgba(99,102,241,0.2)]"
                            : "bg-zinc-50 text-zinc-400"
                )}>
                    {isDone ? (
                        <CheckCircle2 className="h-4 w-4" />
                    ) : isSyncing ? (
                        <Icon className="h-4 w-4 animate-pulse" />
                    ) : (
                        <Icon className="h-4 w-4 opacity-50" />
                    )}
                </div>
                {isSyncing && (
                    <motion.div
                        className="absolute inset-0 rounded-full border border-indigo-500/30"
                        animate={{ scale: [1, 1.4, 1], opacity: [1, 0, 1] }}
                        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                    />
                )}
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                    <span className="text-[13px] font-semibold text-zinc-900 tracking-tight">{label}</span>
                    <AnimatePresence mode="popLayout">
                        {count > 0 && isDone && (
                            <motion.span
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0, opacity: 0 }}
                                className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full"
                            >
                                {count.toLocaleString()}
                            </motion.span>
                        )}
                        {isSyncing && (
                            <motion.span
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="text-[9px] uppercase tracking-widest font-bold text-indigo-600 bg-indigo-100/50 px-2 py-0.5 rounded-full animate-pulse flex items-center gap-1"
                            >
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
                                Live
                            </motion.span>
                        )}
                    </AnimatePresence>
                </div>
                <p className="text-[11.5px] text-zinc-500 truncate">{message}</p>
            </div>

            {/* Subtle bottom border for separation, except last child could hide it via parent logic but we use divide-y so it's fine */}
        </motion.div>
    )
}

// ─── Progress bar ─────────────────────────────────────────────────────────────
function SyncProgressBar({ inbox, calendar }: { inbox: SyncProgressItem | null; calendar: SyncProgressItem | null }) {
    const inboxDone = inbox?.status === "done"
    const calendarDone = calendar?.status === "done"
    const progress = ((inboxDone ? 50 : inbox?.status === "syncing" ? 15 : 0) +
        (calendarDone ? 50 : calendar?.status === "syncing" ? 15 : 0))

    return (
        <div className="w-full h-1.5 bg-zinc-100/80 rounded-full overflow-hidden relative shadow-inner">
            <motion.div
                className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.8, ease: "anticipate" }}
            />
            {progress < 100 && progress > 0 && (
                <motion.div
                    className="absolute top-0 bottom-0 w-24 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                    animate={{ x: ["-100%", "400%"] }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                />
            )}
        </div>
    )
}

// ─── Main Widget ──────────────────────────────────────────────────────────────
export function SyncStatusWidget({ onDismiss }: { onDismiss?: () => void }) {
    const { syncProgress } = useSystemStore()
    const { phase, inbox, calendar } = syncProgress

    // Auto-dismiss after done for a few seconds
    React.useEffect(() => {
        if (phase === "done") {
            const t = setTimeout(() => onDismiss?.(), 5000)
            return () => clearTimeout(t)
        }
    }, [phase, onDismiss])

    const isDone = phase === "done"
    const isActive = phase !== "idle"

    if (!isActive) return null

    return (
        <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.9, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: 20, scale: 0.95, filter: "blur(4px)", transition: { duration: 0.2 } }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className={cn(
                "relative rounded-3xl border overflow-hidden shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] backdrop-blur-3xl",
                isDone
                    ? "bg-white/95 border-emerald-500/20"
                    : "bg-white/95 border-zinc-200/50"
            )}
        >
            {/* Animated Background Glow */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className={cn(
                    "absolute -max-w-full w-full h-full opacity-[0.15] transition-all duration-1000 blur-2xl",
                    isDone
                        ? "bg-[radial-gradient(circle_at_50%_0%,_#34d399,_transparent_60%)]"
                        : "bg-[radial-gradient(circle_at_50%_0%,_#6366f1,_transparent_60%)]"
                )} />
            </div>

            <div className="relative p-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-5">
                    <div className="flex items-center gap-3.5">
                        <div className={cn(
                            "relative flex items-center justify-center w-11 h-11 rounded-2xl shadow-sm border border-white/20",
                            isDone
                                ? "bg-gradient-to-br from-emerald-400 to-emerald-600 text-white"
                                : "bg-gradient-to-br from-indigo-500 to-violet-600 text-white"
                        )}>
                            {isDone ? <CheckCircle2 className="w-5 h-5 drop-shadow-sm" /> : <Sparkles className="w-5 h-5 animate-pulse drop-shadow-sm" />}

                            {/* Ping animation behind icon */}
                            {!isDone && (
                                <span className="absolute inline-flex h-full w-full rounded-2xl bg-indigo-400 opacity-40 animate-ping" />
                            )}
                        </div>
                        <div className="flex flex-col">
                            <h4 className="text-[14px] font-bold text-zinc-900 tracking-tight leading-snug">
                                {isDone ? "Knowledge Base Synced" : phase === "queued" ? "Initializing Protocol" : "Aaliyah is Syncing"}
                            </h4>
                            <p className="text-[11.5px] text-zinc-500 font-medium">
                                {isDone
                                    ? "All neural pathways active"
                                    : "Establishing secure connection..."}
                            </p>
                        </div>
                    </div>

                    {/* Dismiss Button */}
                    {true && (
                        <button
                            onClick={onDismiss}
                            className="h-7 w-7 rounded-full text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 flex items-center justify-center transition-all bg-white/50 backdrop-blur-md border border-zinc-100/50"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>

                <div className="mb-5 px-1">
                    <SyncProgressBar inbox={inbox} calendar={calendar} />
                </div>

                {/* Service rows */}
                <div className="bg-zinc-50/80 rounded-2xl p-1.5 border border-zinc-100 shadow-inner">
                    <div className="divide-y divide-zinc-200/50">
                        <SyncRow icon={Mail} label="Inbox Stream" item={inbox} delay={0.1} />
                        <SyncRow icon={Calendar} label="Calendar Events" item={calendar} delay={0.2} />
                    </div>
                </div>

                {!isDone && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="mt-4 flex items-center justify-center gap-2"
                    >
                        <Activity className="h-3.5 w-3.5 text-indigo-500 animate-[pulse_1.5s_ease-in-out_infinite]" />
                        <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest animate-pulse">
                            Deep Extraction Active
                        </span>
                    </motion.div>
                )}
            </div>
        </motion.div>
    )
}
