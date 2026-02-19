"use client"

import * as React from "react"
import { AnimatePresence, motion } from "framer-motion"
import Link from "next/link"
import { LeftSidebar } from "./LeftSidebar"
import { ThreadList } from "./ThreadList"
import { ThreadReader } from "./ThreadReader"
import { Search, Settings, Paperclip, SendHorizontal, BookOpen, X, ArrowRight } from "lucide-react"
import { inboxService, EmailMessage } from "@/services/inbox.service"
import GuidelinesForm from "@/components/aaliyah/forms/GuidelinesForm"
import SettingsForm from "@/components/aaliyah/forms/SettingsForm"
import { CardFeed, type FeedItem, type Evidence } from "../main/CardFeed"
import { sendChat, getThreadDetails, getOnboardingStatus, runPreflight, getBriefing } from "@/lib/aaliyah/api"
import { useSystemStore } from "@/lib/aaliyah/store"
import { BrainCircuit, Loader2 } from "lucide-react"

// ── Onboarding Gate Screen ──────────────────────────────────────────
function OnboardingGate({ firstName }: { firstName: string | null }) {
    const name = firstName || "there"

    return (
        <div className="flex h-screen w-full bg-white overflow-hidden font-sans">
            {/* Left: Hero Image Section */}
            <div className="relative w-1/2 h-full hidden lg:block bg-zinc-50">
                <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
                    <motion.div
                        initial={{ scale: 1.1, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 1.2, ease: "easeOut" }}
                        className="relative w-full h-full"
                    >
                        {/* High-fidelity character render */}
                        <img
                            src="/Onboarding/aaliyah-onboarding.png"
                            alt="Aaliyah System Interface"
                            className="w-full h-full object-cover object-top"
                        />
                        {/* Minimal functional gradient for text legibility */}
                        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-90" />
                    </motion.div>
                </div>


            </div>

            {/* Right: Interaction Section */}
            <div className="w-full lg:w-1/2 h-full flex items-center justify-center p-8 relative">
                {/* Mobile Background (if on small screen) */}
                <div className="absolute inset-0 lg:hidden z-0">
                    <img src="/Onboarding/aaliyah-onboarding.jpg" className="w-full h-full object-cover opacity-20 blur-sm" />
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm" />
                </div>

                <div className="max-w-md w-full relative z-10 flex flex-col justify-center h-full">
                    {/* Ambient Glow */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-zinc-100/50 rounded-full blur-[80px] -z-10 pointer-events-none" />
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                    >
                        <h1 className="text-7xl lg:text-8xl font-black tracking-tighter mb-8 leading-[0.9]">
                            <span className="bg-clip-text text-transparent bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-500">
                                Hello.
                            </span>
                        </h1>

                        <div className="space-y-6 max-w-sm">
                            <p className="text-zinc-600 text-xl font-medium leading-relaxed">
                                I’m Aaliyah — your Executive Assistant. I manage your inbox, calendar, and communications using your rules, your voice, and your approval.
                            </p>

                            <p className="text-zinc-400 text-sm font-semibold tracking-wide flex items-center gap-2">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Let’s configure my core protocols in under 2 minutes.
                            </p>
                        </div>

                        <div className="mt-12 space-y-8">
                            <a
                                href="/aaliyahonboarding"
                                className="group relative flex items-center justify-between px-8 py-5 bg-zinc-900 hover:bg-black text-white rounded-[20px] transition-all duration-300 shadow-xl hover:shadow-2xl hover:shadow-zinc-900/20 hover:-translate-y-1 w-full"
                            >
                                <span className="text-lg font-bold tracking-tight z-10">Initialize System</span>
                                <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-all duration-300 z-10">
                                    <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-0.5" />
                                </div>

                                {/* Button Glow */}
                                <div className="absolute inset-0 rounded-[20px] ring-1 ring-white/10 pointer-events-none" />
                            </a>

                            <div className="flex items-center justify-center gap-6 opacity-60 hover:opacity-100 transition-opacity duration-500">
                                {["Secure Enclave", "Human-Verified", "24/7 Active"].map((badge) => (
                                    <span key={badge} className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                                        {badge}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    )
}

// ── Workspace Unlocked Message ──────────────────────────────────────
function mkWelcomeBackItem(firstName: string | null, health: any): FeedItem {
    const name = firstName || "there"
    const isOk = health?.email_accessible === true

    const text = isOk
        ? `Done, ${name} ✅\nI'm now syncing your inbox and preparing drafts. You'll see updates here.`
        : `Protocols ready, ${name}. However, your email is not yet connected. Please authorize Gmail or Outlook in Settings > Integrations to begin.`;

    return {
        id: `welcome_${Date.now()}`,
        type: "response",
        title: "Aaliyah",
        text: text,
        tone: isOk ? "success" : "normal" as any,
    }
}

// ── Main Layout ─────────────────────────────────────────────────────
export function WorkspaceLayout() {
    // Onboarding gate state
    const [onboardingChecked, setOnboardingChecked] = React.useState(false)
    const [onboardingComplete, setOnboardingComplete] = React.useState(false)
    const [firstName, setFirstName] = React.useState<string | null>(null)

    // Workspace state
    const [settingsOpen, setSettingsOpen] = React.useState(false)
    const [selectedThread, setSelectedThread] = React.useState<EmailMessage | null>(null)
    const [currentSection, setCurrentSection] = React.useState<string>("")
    const [queueOpen, setQueueOpen] = React.useState(false)
    const [counts, setCounts] = React.useState<Record<string, number>>({
        priority: 0,
        fyi: 0,
        needs_reply: 0
    })
    const [providerStatus, setProviderStatus] = React.useState<Record<string, string>>({})
    const [refreshTrigger, setRefreshTrigger] = React.useState(0)
    const [toasts, setToasts] = React.useState<{ id: string, message: string, type: 'info' | 'success' }[]>([])
    const [seenDemoIds, setSeenDemoIds] = React.useState<Set<string>>(new Set())
    const [chatHistory, setChatHistory] = React.useState<FeedItem[]>([])
    const [composerValue, setComposerValue] = React.useState("")
    const [isSubmitting, setIsSubmitting] = React.useState(false)
    const [workingStatus, setWorkingStatus] = React.useState<string | null>(null)
    const [isPreflightRunning, setIsPreflightRunning] = React.useState(false)

    const {
        connectionHealth,
        fetchHealth,
        isBackendConnected,
        triggerSync
    } = useSystemStore()

    // ── Daily Preflight Gate ─────────────────────────────────────────
    const runMorningProtocols = React.useCallback(async () => {
        if (isPreflightRunning) return
        setIsPreflightRunning(true)
        setWorkingStatus("Running morning preflight...")

        try {
            // 1. Health check is already handled by fetchHealth in loadCounts or manually here
            const health = await fetchHealth()

            // Re-read health from store or check direct result
            // (Assuming fetchHealth updates connectionHealth in store)

            // 2. Run Preflight Backend Gate
            const preflight = await runPreflight()

            if (preflight.status === 'OK') {
                setWorkingStatus("Syncing inbox & briefings...")

                // 3. Trigger Sync
                await triggerSync()

                // 4. Fetch Briefing
                const briefing = await getBriefing()
                if (briefing?.content) {
                    setChatHistory(prev => [
                        ...prev,
                        {
                            id: `briefing_${Date.now()}`,
                            type: "response",
                            title: "Morning Briefing",
                            text: briefing.content,
                            tone: "normal"
                        }
                    ])
                }
                setWorkingStatus(null)
            } else {
                setWorkingStatus("Connection required")
            }
        } catch (err) {
            console.error("Preflight failed", err)
            setWorkingStatus("Preflight failed")
        } finally {
            setIsPreflightRunning(false)
        }
    }, [fetchHealth, triggerSync])

    // ── Check onboarding on mount ────────────────────────────────────
    React.useEffect(() => {
        // optimistically check local storage to prevent flicker
        if (typeof window !== "undefined" && window.localStorage.getItem("aaliyah_onboarding_completed") === "true") {
            setOnboardingComplete(true)
        }

        console.log("Checking onboarding status...");
        getOnboardingStatus()
            .then((res) => {
                console.log("Onboarding Response:", res);
                setFirstName(res.first_name)
                // Case-insensitive check
                if (String(res.onboarding_status).toLowerCase() === "completed") {
                    setOnboardingComplete(true)
                } else {
                    console.warn("Status pending/other:", res.onboarding_status);
                    // DEBUG: Show why we are showing gate
                    // alert(`Debug: Status is '${res.onboarding_status}', expected 'completed'.`)
                }
                setOnboardingChecked(true)
            })
            .catch((err) => {
                console.error("Status check failed:", err);
                // alert("Debug: API Check Failed: " + err.message);
                // If the call fails (e.g. no auth), assume pending but log it
                setOnboardingChecked(true)
            })
    }, [])

    // Show welcome-back message once workspace unlocks
    React.useEffect(() => {
        if (onboardingComplete && onboardingChecked && chatHistory.length === 0 && connectionHealth !== null) {
            setChatHistory([mkWelcomeBackItem(firstName, connectionHealth)])

            // Truth Gating: Only run morning protocols if email is healthy
            if (connectionHealth.email_accessible) {
                runMorningProtocols()
            }
        }
    }, [onboardingComplete, onboardingChecked, connectionHealth, runMorningProtocols])



    // ══════════════════════════════════════════════════════════════════
    //  FULL WORKSPACE (only accessible after onboarding)
    // ══════════════════════════════════════════════════════════════════

    const handleSend = async () => {
        const message = composerValue.trim()
        if (!message || isSubmitting) return

        setComposerValue("")
        setIsSubmitting(true)
        setWorkingStatus("Searching accounts...")

        const userCmd: FeedItem = {
            id: `cmd_${Date.now()}`,
            type: "user-command",
            text: message,
            timestamp: new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date())
        }
        setChatHistory(prev => [...prev, userCmd])
        setSelectedThread(null)

        try {
            setTimeout(() => setWorkingStatus("Reading top results..."), 800)

            const result = await sendChat(message)
            setWorkingStatus("Answer ready")
            setTimeout(() => setWorkingStatus(null), 1000)

            setChatHistory(prev => {
                const groundedItem: FeedItem = {
                    id: `ans_${Date.now()}`,
                    type: "grounded-answer",
                    text: result.answer_text || result.reply || result.answer || "I processed your request but couldn't generate a text response.",
                    evidence: result.evidence || [],
                    status: result.status || "found"
                }

                const newHistory = [...prev, groundedItem]

                // Check for health report
                if (result.tool_result?.health) {
                    newHistory.push({
                        id: `health_${Date.now()}`,
                        type: "health-report",
                        health: result.tool_result.health
                    })
                }

                return newHistory
            })

        } catch (error) {
            console.error(error)
            const errItem: FeedItem = {
                id: `err_${Date.now()}`,
                type: "response",
                title: "Brain Error",
                text: "I'm having trouble connecting to my brain right now.",
                tone: "error"
            }
            setChatHistory(prev => [...prev, errItem])
            setWorkingStatus(null)
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleSourceClick = async (evidence: Evidence) => {
        if (evidence.type === 'thread') {
            setWorkingStatus(`Opening ${evidence.provider === 'google' ? 'Gmail' : 'Outlook'}...`)
            try {
                const threadRes = await getThreadDetails(evidence.id, evidence.provider)
                if (threadRes) {
                    const adapted: EmailMessage = {
                        id: threadRes.id || evidence.id,
                        provider: evidence.provider as 'google' | 'microsoft',
                        subject: threadRes.subject || "Search Result",
                        sender: {
                            name: threadRes.participants?.[0] || "Unknown",
                            email: threadRes.participants?.[0] || "unknown@domain.com"
                        },
                        snippet: threadRes.messages?.[0]?.snippet || "",
                        bodyCleaned: threadRes.latest_reply_text || threadRes.messages?.[0]?.body || "",
                        receivedAt: threadRes.metadata?.last_message_at || new Date().toISOString(),
                        isRead: true,
                        isPrimaryAccount: true,
                        labels: [],
                    }
                    setSelectedThread(adapted)
                }
            } catch (error) {
                console.error("Deep read failed", error)
            } finally {
                setWorkingStatus(null)
            }
        } else {
            alert(`Opening calendar event: ${evidence.id}`)
        }
    }

    // Initial Load & Polling
    const loadCounts = React.useCallback(() => {
        // Truth Gating: only load counts if email is accessible
        if (connectionHealth?.email_accessible) {
            inboxService.getCounts().then(res => {
                setCounts(res)
            }).catch(console.error)
        }
        fetchHealth().catch(console.error)
    }, [refreshTrigger, fetchHealth, connectionHealth?.email_accessible])

    // eslint-disable-next-line react-hooks/exhaustive-deps
    React.useEffect(() => {
        loadCounts()
        const interval = setInterval(loadCounts, 15000)
        return () => clearInterval(interval)
    }, [refreshTrigger])

    // Smart Queue Selection on Mount
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

    const handleNavigate = (section: string) => {
        if (queueOpen && currentSection === section) {
            setQueueOpen(false)
        } else {
            setCurrentSection(section)
            setQueueOpen(true)
        }
    }

    const handleMainClick = () => {
        if (queueOpen) {
            setQueueOpen(false)
        }
    }

    const handleThreadSelect = (thread: EmailMessage) => {
        setSelectedThread(thread)
        setQueueOpen(false)
        if (thread.id.startsWith('demo-')) {
            setSeenDemoIds(prev => {
                const next = new Set(prev)
                next.add(thread.id)
                return next
            })
        }
    }

    const uiCounts = counts

    const hasUnread = (section: string) => {
        const count = uiCounts[section] || 0
        return count > 0
    }

    const [guidelinesOpen, setGuidelinesOpen] = React.useState(false)

    const providerLabel = selectedThread?.provider === 'google' ? 'Gmail' : 'Outlook'

    const feedScrollRef = React.useRef<HTMLDivElement>(null)
    React.useEffect(() => {
        if (!feedScrollRef.current) return
        feedScrollRef.current.scrollTo({ top: feedScrollRef.current.scrollHeight, behavior: "smooth" })
    }, [chatHistory])

    // ── If still checking, show skeleton ──────────────────────────────
    if (!onboardingChecked) {
        return (
            <div className="flex h-screen bg-white items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-zinc-100 animate-pulse" />
                    <div className="h-3 w-32 rounded-full bg-zinc-100 animate-pulse" />
                </div>
            </div>
        )
    }

    // ── Onboarding gate ───────────────────────────────────────────────
    if (!onboardingComplete) {
        return <OnboardingGate firstName={firstName} />
    }

    return (
        <div className="flex h-screen bg-white overflow-hidden relative">
            <style dangerouslySetInnerHTML={{
                __html: `
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 10px; }
            `}} />

            {/* Guidelines Overlay */}
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
                    disabled={!connectionHealth?.email_accessible}
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
                {/* Header */}
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

                {/* Connection Health Banner */}
                {connectionHealth && !connectionHealth.email_accessible && onboardingComplete && (
                    <div className="bg-amber-50 border-b border-amber-100 px-6 py-2 flex items-center justify-between" data-testid="connection-health-banner">
                        <div className="flex items-center gap-2">
                            <div className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                            <span className="text-[11px] font-medium text-amber-800" data-testid="connection-health-message">Email connection is currently inactive. System is in read-only mode.</span>
                        </div>
                        <Link
                            href="/aaliyahonboarding"
                            className="text-[10px] font-bold uppercase tracking-wider text-amber-900 hover:underline"
                            data-testid="authorize-email-cta"
                        >
                            Authorize Email
                        </Link>
                    </div>
                )}

                {/* Content */}
                {selectedThread ? (
                    <div className="flex-1 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <ThreadReader thread={selectedThread} />
                    </div>
                ) : (
                    <div ref={feedScrollRef} className="flex-1 overflow-y-auto px-6 py-8 custom-scrollbar" onClick={(e) => e.stopPropagation()}>
                        <div className="max-w-4xl mx-auto">
                            <CardFeed
                                items={chatHistory}
                                onOpenIntelligence={() => { }}
                                onSourceClick={handleSourceClick}
                            />
                            {chatHistory.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center pt-20 text-center">
                                    <div className="h-16 w-16 rounded-full bg-zinc-50 border border-zinc-100 flex items-center justify-center mb-6">
                                        <BrainCircuit className="h-8 w-8 text-zinc-200" />
                                    </div>
                                    <h2 className="text-lg font-bold text-zinc-900 mb-2">Aaliyah Intelligence</h2>
                                    <p className="text-sm text-zinc-400 max-w-sm">
                                        Ask me to search your emails, check your calendar, or manage your commitments.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Chat Input Bar */}
                <div className="shrink-0 border-t border-zinc-100 px-6 py-3 bg-white">
                    <div className="flex items-center gap-2 max-w-3xl mx-auto w-full relative">
                        <AnimatePresence>
                            {workingStatus && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    className="absolute -top-12 left-0 right-0 flex justify-center pointer-events-none"
                                    data-testid="working-status-indicator"
                                >
                                    <div className="bg-zinc-900 text-white text-[10px] font-bold uppercase tracking-widest px-4 py-1.5 rounded-full flex items-center gap-2 shadow-2xl border border-white/10">
                                        <BrainCircuit className="h-3 w-3 animate-pulse text-purple-400" />
                                        <span data-testid="working-status-text">{workingStatus}</span>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                        <div className="flex flex-1 items-center gap-2 bg-zinc-50 rounded-xl px-3 py-2 border border-black/20 focus-within:ring-2 focus-within:ring-zinc-900/5 transition-all">
                            <button className="h-8 w-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors shrink-0">
                                <Paperclip className="h-4 w-4" />
                            </button>
                            <input
                                type="text"
                                placeholder={connectionHealth?.email_accessible ? "Reply or ask Aaliyah..." : "Authorize email to enable chat..."}
                                style={{ border: 'none', outline: 'none', boxShadow: 'none' }}
                                className="flex-1 bg-transparent text-sm text-zinc-900 placeholder:text-zinc-400 py-1"
                                value={composerValue}
                                onChange={(e) => setComposerValue(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && !isSubmitting && handleSend()}
                                disabled={isSubmitting || !connectionHealth?.email_accessible}
                                data-testid="chat-composer-input"
                            />
                            <button
                                onClick={handleSend}
                                disabled={isSubmitting || !composerValue.trim() || !connectionHealth?.email_accessible}
                                className="h-8 w-8 flex items-center justify-center rounded-lg bg-zinc-900 text-white hover:bg-black transition-colors shrink-0 disabled:opacity-50"
                            >
                                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
                            </button>
                        </div>
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
