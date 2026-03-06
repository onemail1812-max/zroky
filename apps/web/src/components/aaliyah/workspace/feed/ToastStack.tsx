"use client"

import * as React from "react"
import { AnimatePresence, motion } from "framer-motion"

export interface Toast {
    id: string
    message: string
    type: 'info' | 'success'
}

interface ToastStackProps {
    toasts: Toast[]
}

/**
 * Fixed-position toast notification stack.
 */
export function ToastStack({ toasts }: ToastStackProps) {
    return (
        <div className="fixed bottom-24 right-8 flex flex-col gap-2 z-50 pointer-events-none">
            <AnimatePresence>
                {toasts.map(t => (
                    <motion.div
                        key={t.id}
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-zinc-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-white/10 min-w-[280px]"
                    >
                        <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                        <span className="text-[13px] font-medium">{t.message}</span>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    )
}
