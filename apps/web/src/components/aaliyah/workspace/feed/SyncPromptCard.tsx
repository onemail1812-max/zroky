"use client"

import * as React from "react"
import { motion, Variants } from "framer-motion"
import { Zap, Loader2, Server } from "lucide-react"
import { cn } from "@/lib/utils"

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 30, scale: 0.96, filter: "blur(4px)" },
    visible: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)", transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
}

export function SyncPromptCard({ onSync }: { onSync: () => void }) {
    const [syncing, setSyncing] = React.useState(false)

    const handleSync = async () => {
        setSyncing(true)
        try {
            if (onSync) await onSync()
            window.dispatchEvent(new CustomEvent('aaliyah_chat_input', {
                detail: { text: "Initialize data pipeline and sync my accounts." }
            }))
        } catch (error) {
            console.error("Sync failed:", error)
        } finally {
            setTimeout(() => setSyncing(false), 1000)
        }
    }

    return (
        <motion.div variants={itemVariants} className="flex justify-start w-full relative">
            <div className="max-w-2xl w-full">
                <div className="flex items-center gap-2 mb-3 px-1">
                    <div className="h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
                    <span className="text-[10px] font-bold tracking-[0.2em] text-zinc-500 uppercase">System Offline</span>
                </div>

                <div className="relative rounded-3xl border border-zinc-200/60 dark:border-zinc-800/60 bg-white/60 dark:bg-zinc-950/60 backdrop-blur-xl p-6 md:p-8 shadow-sm">
                    <div className="flex flex-col md:flex-row items-center md:items-start gap-6 text-center md:text-left">
                        <div className="h-16 w-16 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 flex items-center justify-center shrink-0">
                            <Zap className={cn("h-7 w-7 text-amber-500", syncing && "animate-pulse")} />
                        </div>

                        <div className="flex-1">
                            <h2 className="text-[20px] font-black text-zinc-900 dark:text-zinc-100 mb-2 leading-tight">
                                Data pipeline established. Awaiting initial extraction.
                            </h2>
                            <p className="text-[14px] text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium mb-6">
                                Connect your accounts to securely stream the last 7 days of inbox data and 14 days of calendar mapping into the core matrix.
                            </p>

                            <button
                                onClick={handleSync}
                                disabled={syncing}
                                className={cn(
                                    "inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl text-[13px] font-bold uppercase tracking-widest transition-all duration-300 shadow-xl w-full md:w-auto justify-center",
                                    syncing
                                        ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed shadow-none"
                                        : "bg-amber-500 hover:bg-amber-400 text-white hover:scale-105 hover:shadow-amber-500/25 active:scale-95"
                                )}
                            >
                                {syncing ? (
                                    <><Loader2 className="h-4 w-4 animate-spin" /> ESTABLISHING LINK...</>
                                ) : (
                                    <><Server className="h-4 w-4" /> INITIATE SYNC SEQUENCE</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    )
}
