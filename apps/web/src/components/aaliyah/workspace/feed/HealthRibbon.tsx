"use client"

import * as React from "react"
import { AnimatePresence, motion } from "framer-motion"
import { AlertTriangle } from "lucide-react"

interface HealthRibbonProps {
    visible: boolean
    onOpenSettings: () => void
}

/**
 * Amber "Limited mode" banner shown when email is not connected.
 */
export function HealthRibbon({ visible, onOpenSettings }: HealthRibbonProps) {
    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden shrink-0 z-10"
                >
                    <div className="flex items-center justify-between px-6 py-2.5 bg-amber-50 border-b border-amber-100">
                        <div className="flex items-center gap-2.5">
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                            <span className="text-xs font-semibold text-amber-800">
                                Limited mode — connect your email for full functionality
                            </span>
                        </div>
                        <button
                            onClick={onOpenSettings}
                            className="px-3 py-1 bg-amber-600 text-white text-[11px] font-bold rounded-lg hover:bg-amber-700 transition-all active:scale-95"
                        >
                            Settings
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
