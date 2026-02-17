"use client"

import * as React from "react"
import { AnimatePresence, motion } from "framer-motion"
import Link from "next/link"
import { LeftSidebar } from "./LeftSidebar"
import { ThreadList } from "./ThreadList"
import { ThreadReader } from "./ThreadReader"
import { Search, Settings, Paperclip, SendHorizontal, BookOpen, X } from "lucide-react"
import { inboxService, EmailMessage } from "@/services/inbox.service"
import GuidelinesForm from "@/components/aaliyah/forms/GuidelinesForm"
import SettingsForm from "@/components/aaliyah/forms/SettingsForm"

export function WorkspaceLayout() {
    const [settingsOpen, setSettingsOpen] = React.useState(false)
    const [selectedThread, setSelectedThread] = React.useState<EmailMessage | null>(null)
    const [currentSection, setCurrentSection] = React.useState<string>("")
    const [queueOpen, setQueueOpen] = React.useState(false)
    const [counts, setCounts] = React.useState<Record<string, number>>({
        priority: 1,
        fyi: 1,
        needs_reply: 1
    })
    const [providerStatus, setProviderStatus] = React.useState<Record<string, string>>({})
    const [refreshTrigger, setRefreshTrigger] = React.useState(0)
    const [toasts, setToasts] = React.useState<{ id: string, message: string, type: 'info' | 'success' }[]>([])
    const [seenDemoIds, setSeenDemoIds] = React.useState<Set<string>>(new Set())

    // Initial Load & Polling
    React.useEffect(() => {
        const load = () => {
            inboxService.getCounts().then(res => {
                // Merge demo counts for UX preview
                setCounts({
                    ...res,
                    priority: (res.priority || 0) + 1,
                    fyi: (res.fyi || 0) + 1,
                    needs_reply: (res.needs_reply || 0) + 1
                })
            }).catch(console.error)
            inboxService.checkProviders().then(setProviderStatus).catch(console.error)
        }
        load()
        const interval = setInterval(load, 15000)
        return () => clearInterval(interval)
    }, [refreshTrigger])

    // Simulate real-time background updates for UX demo
    React.useEffect(() => {
        const demoToasts = ["This thread moved to Priority", "Aaliyah drafted 2 new replies", "3 new threads moved to FYI"];
        let i = 0;
        const interval = setInterval(() => {
            const id = Math.random().toString(36).substr(2, 9);
            setToasts(prev => [...prev, { id, message: demoToasts[i % 3], type: 'info' }]);
            i++;
            setTimeout(() => { setToasts(prev => prev.filter(t => t.id !== id)); }, 5000);
        }, 12000);
        return () => clearInterval(interval);
    }, [])

    // Smart Queue Selection on Mount (sets section but does NOT open panel)
    React.useEffect(() => {
        if (currentSection) return
        if (counts.priority && counts.priority > 0) {
            setCurrentSection("priority")
        } else if (counts.needs_reply && counts.needs_reply > 0) {
            setCurrentSection("needs_reply")
        } else if (counts.approvals && counts.approvals > 0) {
            setCurrentSection("approvals")
        } else if (counts.follow_ups && counts.follow_ups > 0) {
            setCurrentSection("follow_ups")
        } else {
            setCurrentSection("fyi")
        }
    }, [counts, currentSection])

    // Toggle logic for left panel clicks
    const handleNavigate = (section: string) => {
        if (queueOpen && currentSection === section) {
            // Same tab clicked while open → close
            setQueueOpen(false)
        } else {
            // Different tab or panel closed → open with new section
            setCurrentSection(section)
            setQueueOpen(true)
            // Main panel keeps showing last opened thread
        }
    }

    // Close middle panel when clicking main area
    const handleMainClick = () => {
        if (queueOpen) {
            setQueueOpen(false)
        }
    }

    const handleThreadSelect = (thread: EmailMessage) => {
        setSelectedThread(thread)
        setQueueOpen(false) // Close middle panel after selecting
        if (thread.id.startsWith('demo-')) {
            setSeenDemoIds(prev => {
                const next = new Set(prev)
                next.add(thread.id)
                return next
            })
        }
    }

    const uiCounts = React.useMemo(() => {
        const c = { ...counts }
        if (seenDemoIds.has('demo-priority-1')) c.priority = Math.max(0, (c.priority || 0) - 1)
        if (seenDemoIds.has('demo-fyi-1')) c.fyi = Math.max(0, (c.fyi || 0) - 1)
        if (seenDemoIds.has('demo-fyi-2')) c.fyi = Math.max(0, (c.fyi || 0) - 1)
        if (seenDemoIds.has('demo-reply-1')) c.needs_reply = Math.max(0, (c.needs_reply || 0) - 1)
        return c
    }, [counts, seenDemoIds])

    const hasUnread = (section: string) => {
        const count = uiCounts[section] || 0
        return count > 0
    }

    const [guidelinesOpen, setGuidelinesOpen] = React.useState(false)

    const providerLabel = selectedThread?.provider === 'google' ? 'Gmail' : 'Outlook'

    return (
        <div className="flex h-screen bg-white overflow-hidden relative">
            <style dangerouslySetInnerHTML={{
                __html: `
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 10px; }
            `}} />

            {/* Guidelines Overlay - Enterprise Single Page Design */}
            <AnimatePresence>
                {guidelinesOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="fixed inset-0 z-[100] bg-white flex flex-col"
                    >
                        <div className="flex-1 overflow-y-auto custom-scrollbar bg-white">
                            <GuidelinesForm onClose={() => setGuidelinesOpen(false)} />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Settings Overlay */}
            <AnimatePresence>
                {settingsOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black/20 backdrop-blur-sm flex items-center justify-center pointer-events-auto"
                        onClick={() => setSettingsOpen(false)}
                    >
                        <div className="w-full max-w-5xl h-auto" onClick={(e) => e.stopPropagation()}>
                            <SettingsForm onClose={() => setSettingsOpen(false)} />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 1. Left Panel: Queue List */}
            <div className="w-56 shrink-0 flex flex-col">
                <LeftSidebar
                    currentSection={currentSection}
                    onNavigate={handleNavigate}
                    counts={uiCounts}
                    hasUnread={hasUnread}
                />
            </div>

            {/* 2. Middle Panel: Thread List (toggled) */}
            <AnimatePresence>
                {queueOpen && (
                    <motion.div
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: 384, opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 400, damping: 35 }}
                        className="shrink-0 border-r border-zinc-100 flex flex-col bg-white overflow-hidden"
                    >
                        <div className="h-20 border-b border-zinc-100 flex items-center px-4 shrink-0">
                            <h2 className="text-sm font-bold text-zinc-900 capitalize">
                                {currentSection.replace('_', ' ')}
                            </h2>
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <ThreadList
                                onSelect={handleThreadSelect}
                                selectedId={selectedThread?.id}
                                filter={currentSection}
                                refreshTrigger={refreshTrigger}
                                seenIds={seenDemoIds}
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 3. Main Panel: Conversation Workspace */}
            <main className="flex-1 flex flex-col bg-white" onClick={handleMainClick}>
                {/* Header — always visible, single line */}
                <header className="h-20 border-b border-zinc-100 flex items-center justify-between px-6 shrink-0">
                    <div className="flex items-center gap-2 text-sm min-w-0 flex-1 overflow-hidden">
                        {selectedThread ? (
                            <>
                                <span className="font-bold text-zinc-900 truncate">{selectedThread.subject || "(No Subject)"}</span>
                                <span className="h-1 w-1 rounded-full bg-zinc-300 shrink-0" />
                                <span className="text-zinc-400 shrink-0">Source: {providerLabel}</span>
                                <span className="h-1 w-1 rounded-full bg-zinc-300 shrink-0" />
                                <span className="text-zinc-400 truncate">{selectedThread.sender.name ? `${selectedThread.sender.name} (${selectedThread.sender.email})` : selectedThread.sender.email}</span>
                                {selectedThread.draft && (
                                    <>
                                        <span className="h-1 w-1 rounded-full bg-zinc-300 shrink-0" />
                                        <span className="text-emerald-600 font-semibold shrink-0">Draft ready</span>
                                    </>
                                )}
                            </>
                        ) : (
                            <span className="text-sm text-zinc-300">Aaliyah Workspace</span>
                        )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-4">
                        <button
                            onClick={(e) => { e.stopPropagation(); setGuidelinesOpen(true); }}
                            className="h-8 px-3 flex items-center gap-1.5 rounded-lg border border-black/15 hover:bg-zinc-900 hover:text-white text-zinc-500 transition-colors text-xs font-medium"
                        >
                            <BookOpen className="h-3.5 w-3.5" />
                            Configuration
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); setSettingsOpen(true); }}
                            className="h-8 px-3 flex items-center gap-1.5 rounded-lg border border-black/15 hover:bg-zinc-900 hover:text-white text-zinc-500 transition-colors text-xs font-medium"
                        >
                            <Settings className="h-3.5 w-3.5" />
                            Settings
                        </button>
                    </div>
                </header>

                {/* Content */}
                {selectedThread ? (
                    <div className="flex-1 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <ThreadReader thread={selectedThread} />
                    </div>
                ) : (
                    <div className="flex-1" />
                )}

                {/* Chat Input Bar — always visible at bottom */}
                <div className="shrink-0 border-t border-zinc-100 px-6 py-3 bg-white">
                    <div className="flex items-center gap-2 max-w-3xl mx-auto w-full bg-zinc-50 rounded-xl px-3 py-2 border border-black/20 transition-all">
                        <button className="h-8 w-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors shrink-0">
                            <Paperclip className="h-4 w-4" />
                        </button>
                        <input
                            type="text"
                            placeholder="Reply or ask Aaliyah..."
                            style={{ border: 'none', outline: 'none', boxShadow: 'none' }}
                            className="flex-1 bg-transparent text-sm text-zinc-900 placeholder:text-zinc-400 py-1"
                        />
                        <button className="h-8 w-8 flex items-center justify-center rounded-lg bg-zinc-900 text-white hover:bg-black transition-colors shrink-0">
                            <SendHorizontal className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </main>

            {/* Toasts */}
            <div className="fixed bottom-24 right-8 flex flex-col gap-2 z-50 pointer-events-none">
                <AnimatePresence>
                    {toasts.map(toast => (
                        <motion.div
                            key={toast.id}
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-zinc-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-white/10 min-w-[280px]"
                        >
                            <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                            <span className="text-[13px] font-medium">{toast.message}</span>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div >
    )
}
