"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ThreadList } from "./ThreadList"
import { EmailMessage } from "@/services/inbox.service"

interface ThreadPanelProps {
    isOpen: boolean
    activeTriageQueue: string | null
    selectedId?: string
    refreshTrigger: number
    seenDemoIds: Set<string>
    isConnected: boolean
    onSelect: (thread: EmailMessage) => void
    onConnect: () => void
}

export const ThreadPanel = React.memo(function ThreadPanel({
    isOpen,
    activeTriageQueue,
    selectedId,
    refreshTrigger,
    seenDemoIds,
    isConnected,
    onSelect,
    onConnect,
}: ThreadPanelProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 384, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 35 }}
                    className="shrink-0 border-r border-zinc-100 flex flex-col bg-white overflow-hidden"
                >
                    <div className="h-20 border-b border-zinc-100 flex items-center px-4 shrink-0">
                        <h2 className="text-sm font-bold text-zinc-900 capitalize">
                            {(activeTriageQueue || '').replace('_', ' ')}
                        </h2>
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <ThreadList
                            filter={activeTriageQueue as any}
                            selectedId={selectedId}
                            onSelect={onSelect}
                            refreshTrigger={refreshTrigger}
                            seenIds={seenDemoIds}
                            isConnected={isConnected}
                            onConnect={onConnect}
                        />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
})
