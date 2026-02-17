"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { X, Clock, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { EmailMessage } from "@/services/inbox.service"

// Mock data for Waiting On threads (could be filtered from main list in real app)
// Clearing mock data to avoid type issues for now, in real app this is passed as props or fetched
const WAITING_THREADS: EmailMessage[] = []

export function WaitingOnPanel({ open, onClose, onSelect }: { open: boolean; onClose: () => void; onSelect: (thread: EmailMessage) => void }) {
    if (!open) return null

    return (
        <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed top-0 right-0 h-full w-[380px] bg-white dark:bg-zinc-950 shadow-2xl z-40 border-l border-zinc-200 dark:border-zinc-800 flex flex-col"
        >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 shrink-0 bg-zinc-50/50 dark:bg-zinc-900/50 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 flex items-center justify-center border border-zinc-200 dark:border-zinc-700">
                        <Clock className="h-3.5 w-3.5" />
                    </div>
                    <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Waiting On</h2>
                    <span className="text-xs font-semibold text-zinc-500 ml-1 bg-zinc-100 dark:bg-zinc-800 px-1.5 rounded-md border border-zinc-200 dark:border-zinc-700">{WAITING_THREADS.length}</span>
                </div>
                <button
                    onClick={onClose}
                    className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {WAITING_THREADS.map((thread) => (
                    <div
                        key={thread.id}
                        onClick={() => onSelect(thread)}
                        className="group p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 hover:bg-zinc-50 dark:hover:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all cursor-pointer shadow-sm hover:shadow"
                    >
                        <div className="flex items-start justify-between mb-1">
                            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{thread.sender.name || thread.sender.email}</span>
                            <span className="text-[10px] text-zinc-500 font-semibold bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                                {new Date(thread.receivedAt).toLocaleDateString()}
                            </span>
                        </div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1 mb-2 font-medium">
                            {thread.subject}
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="text-[10px] text-zinc-400 font-medium flex items-center gap-1">
                                No reply
                            </div>
                            <ArrowRight className="h-3 w-3 text-zinc-300 group-hover:text-black dark:group-hover:text-white transition-colors" />
                        </div>
                    </div>
                ))}
            </div>

            {/* Hint Footer */}
            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 text-center">
                <p className="text-[10px] text-zinc-400">
                    Auto-reminders active for 2 threads.
                </p>
            </div>
        </motion.div>
    )
}
