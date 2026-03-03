"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { AnimatePresence, motion } from "framer-motion"
import Link from "next/link"
import { LeftSidebar } from "./LeftSidebar"
import { ThreadList } from "./ThreadList"
import { ThreadReader } from "./ThreadReader"
import { ThreadConversation } from "./ThreadConversation"
import { Search, Settings, Paperclip, SendHorizontal, BookOpen, X, ArrowRight, CornerUpLeft } from "lucide-react"
import { inboxService, EmailMessage } from "@/services/inbox.service"
import GuidelinesForm from "@/components/aaliyah/forms/GuidelinesForm"
import SettingsForm from "@/components/aaliyah/forms/SettingsForm"
import OnboardingWizard from "@/components/aaliyah/forms/OnboardingWizard"
import { CardFeed, type FeedItem, type Evidence, type CardAction } from "../main/CardFeed"
import { getThreadDetails, getOnboardingStatus, runPreflight, aaliyahApi, sendDraft, updateDraft, readLocalStorage, WORKSPACE_KEYS, triggerHistoricalSync } from "@/lib/aaliyah/api"
import { useSystemStore } from "@/lib/aaliyah/store"
import { BrainCircuit, Loader2, WifiOff, ShieldAlert, AlertTriangle } from "lucide-react"
import { getConnectionMessage } from "@/lib/aaliyah/connection-messages"
import { cn } from "@/lib/utils"
import { SyncStatusWidget } from "./SyncStatusWidget"
import { AttachmentViewer } from "./AttachmentViewer"
import { useAaliyahChat } from "@/lib/aaliyah/useAaliyahChat"
import { ChatMessage } from "./ChatMessage"
import { ChatInput } from "./ChatInput"

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
    constructor(props: { children: React.ReactNode }) { super(props); this.state = { hasError: false }; }
    static getDerivedStateFromError(error: any) { return { hasError: true }; }
    componentDidCatch(error: any, errorInfo: any) {
        if (process.env.NODE_ENV !== 'production') {
            console.error("Uncaught error:", error, errorInfo);
        }
    }
    render() {
        if (this.state.hasError) {
            return <div className="p-8 text-zinc-900 font-sans h-screen flex items-center justify-center flex-col">
                <AlertTriangle className="h-12 w-12 text-zinc-300 mb-4" />
                <h2 className="text-xl font-bold">Something went wrong</h2>
                <p className="text-zinc-500 mt-2 cursor-pointer border px-4 py-2 rounded-lg hover:bg-zinc-50" onClick={() => window.location.reload()}>Reload Mission Control</p>
            </div>;
        }
        return this.props.children;
    }
}

// ── Workspace Unlocked Message (Stateless) ─────────────────────────
function mkWelcomeBackItem(
    firstName: string | null,
    health: any,
    triagedCount: number,
    priorityCount: number, // Added priorityCount
    onSync: () => void,
    onboardingDone: boolean,
    onStartOnboarding?: () => void
): FeedItem {
    const name = firstName || "there"
    const isOk = health?.email_accessible === true

    // ✅ Check onboarding FIRST — new users always see a greeting
    if (!onboardingDone) {
        return {
            id: `welcome_onboarding_${Date.now()}`,
            type: "response",
            title: "Aaliyah",
            text: `Hey ${name}. I'm **Aaliyah** — your executive assistant.\n\nI handle your inbox, meetings, and follow-ups, so you can focus on what actually matters. I work quietly in the background, using your rules and your voice.\n\nLet's get me configured. It takes under 2 minutes.`,
            tone: "normal" as any,
        }
    }

    // Onboarded + connected → time-aware greeting
    const hour = new Date().getHours()
    const timeGreeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"

    // Email NOT connected → show limited mode greeting (only for already-onboarded users)
    if (!isOk) {
        return {
            id: `welcome_health_${Date.now()}`,
            type: "response",
            title: "Aaliyah",
            text: `${timeGreeting}, ${name}. I'm active but in **limited mode** right now.\n\nI can't access your inbox, calendar, or send messages because no email account is connected. Head to **Settings** to connect your Gmail or Outlook.\n\nIn the meantime, feel free to ask me anything — how I work, what I can do for you, or help planning your workflow.`,
            tone: "normal" as any,
        }
    }

    let message = ""
    if (priorityCount > 0) {
        message = `${timeGreeting}, ${name}. You have **${priorityCount}** high-priority item${priorityCount === 1 ? "" : "s"} waiting. I've also triaged ${triagedCount} other messages today. Want a briefing?`
    } else if (triagedCount > 0) {
        message = `${timeGreeting}, ${name}. No urgent items, but I've triaged ${triagedCount} message${triagedCount === 1 ? "" : "s"} recently. Your inbox is healthy.`
    } else {
        message = `${timeGreeting}, ${name}. Your workspace is ready and your inbox is clear. Ask me anything.`
    }

    return {
        id: `welcome_${Date.now()}`,
        type: "response",
        title: "Aaliyah",
        text: message,
        tone: "normal" as any,
    }
}

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
                                className="group relative flex items-center justify-between px-8 py-6 bg-zinc-900 hover:bg-black text-white rounded-[24px] transition-all duration-500 shadow-2xl hover:shadow-zinc-900/30 hover:-translate-y-1.5 w-full overflow-hidden"
                            >
                                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                                <div className="flex flex-col items-start z-10 text-left">
                                    <span className="text-xl font-black tracking-tight">Begin My Onboarding</span>
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 group-hover:text-zinc-300 transition-colors">Initialize Executive Protocols</span>
                                </div>

                                <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center group-hover:bg-white text-white group-hover:text-black transition-all duration-500 z-10 shadow-inner">
                                    <ArrowRight className="h-6 w-6 transition-transform duration-500 group-hover:translate-x-1" />
                                </div>

                                {/* Animated Glow */}
                                <div className="absolute -inset-full bg-gradient-to-r from-transparent via-white/5 to-transparent rotate-45 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out" />
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

// ── Health Gate Screen ──────────────────────────────────────────────
function HealthGate({ health, onRetry }: { health: any, onRetry: () => void }) {
    const msg = getConnectionMessage(health.email_health, "Email")
    const Icon = msg.badge === 'error' ? ShieldAlert : msg.badge === 'warning' ? AlertTriangle : WifiOff

    return (
        <div className="flex h-screen w-full bg-white items-center justify-center p-8 z-[200]" data-testid="health-gate">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-md w-full text-center"
            >
                <div className={cn(
                    "mx-auto h-16 w-16 rounded-3xl flex items-center justify-center mb-8",
                    msg.badge === 'error' ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"
                )}>
                    <Icon className="h-8 w-8" />
                </div>

                <h2 className="text-3xl font-black text-zinc-900 tracking-tight mb-4 leading-tight" data-testid="health-gate-title">
                    {msg.title}
                </h2>
                <p className="text-zinc-500 text-lg font-medium mb-10 leading-relaxed" data-testid="health-gate-description">
                    {msg.description}
                </p>

                <div className="space-y-4">
                    {msg.ctaAction === 'connect' || msg.ctaAction === 'reconnect' ? (
                        <a
                            href="/brain"
                            className="flex items-center justify-center w-full px-8 py-4 bg-zinc-900 text-white rounded-[20px] font-bold text-lg hover:bg-black transition-all shadow-xl"
                            data-testid="health-gate-cta"
                        >
                            {msg.ctaLabel || "Reconnect Now"}
                        </a>
                    ) : (
                        <button
                            onClick={onRetry}
                            className="flex items-center justify-center w-full px-8 py-4 bg-zinc-900 text-white rounded-[20px] font-bold text-lg hover:bg-black transition-all shadow-xl"
                            data-testid="health-gate-cta"
                        >
                            {msg.ctaLabel || "Retry Connection"}
                        </button>
                    )}

                    <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest pt-4">
                        System Gate Active — Protocols Halted
                    </p>
                </div>
            </motion.div>
        </div>
    )
}

// ── Main Layout ─────────────────────────────────────────────────────
function WorkspaceLayoutInner() {
    // Onboarding gate state
    const [onboardingChecked, setOnboardingChecked] = React.useState(false)
    const [onboardingComplete, setOnboardingComplete] = React.useState(false)
    const [firstName, setFirstName] = React.useState<string | null>(null)

    // Workspace state
    const [settingsOpen, setSettingsOpen] = React.useState(false)
    const [guidelinesOpen, setGuidelinesOpen] = React.useState(false)
    const [onboardingOpen, setOnboardingOpen] = React.useState(false)
    const [diagnosticsOpen, setDiagnosticsOpen] = React.useState(false)
    const [diagnosticsLogs, setDiagnosticsLogs] = React.useState<string>("Loading logs...")
    const [composeOpen, setComposeOpen] = React.useState(false) // Added composeOpen state
    const [activeAttachment, setActiveAttachment] = React.useState<any | null>(null)
    const [activeEmailId, setActiveEmailId] = React.useState<string | null>(null)
    const [queueOpen, setQueueOpen] = React.useState(false)
    const [providerStatus, setProviderStatus] = React.useState<Record<string, string>>({})
    const [refreshTrigger, setRefreshTrigger] = React.useState(0)
    const [toasts, setToasts] = React.useState<{ id: string, message: string, type: 'info' | 'success' }[]>([])
    const [seenDemoIds, setSeenDemoIds] = React.useState<Set<string>>(new Set())
    const [workingStatus, setWorkingStatus] = React.useState<string | null>(null)
    const [isPreflightRunning, setIsPreflightRunning] = React.useState(false)

    // Custom Aaliyah Chat hook (clean SSE, no external deps)
    const { messages, input, setInput, isLoading, sendMessage, setMessages } = useAaliyahChat({
        api: "/assist/chat",
        threadId: useSystemStore(state => state.threadSelection?.id),
        emailId: activeEmailId,
    })

    const {
        connectionHealth,
        fetchHealth,
        isBackendConnected,
        threadSelection,
        setThreadSelection,
        activeTriageQueue,
        setActiveTriageQueue,
        triggerSync,
        triggerInitialSync,
        syncProgress,
        triagedCount,
        priorityCount,
        fetchStatus,
        syncError,
        isSyncing,
        resetSyncError,
        activeView,
        setActiveView
    } = useSystemStore()

    const [showSyncWidget, setShowSyncWidget] = React.useState(false)
    const [lastSyncedAt, setLastSyncedAt] = React.useState<Date | null>(null)
    const [syncTick, setSyncTick] = React.useState(0) // force re-render for relative time
    const [isMounted, setIsMounted] = React.useState(false)

    React.useEffect(() => {
        setIsMounted(true)
    }, [])

    // ── Preflight Gate ───────────────
    const runPreflightProtocol = React.useCallback(async () => {
        if (isPreflightRunning) return
        setIsPreflightRunning(true)
        setWorkingStatus("Checking system status...")

        try {
            await triggerSync()
            setWorkingStatus(null)
        } catch (err) {
            if (process.env.NODE_ENV !== 'production') console.error("Preflight failed", err)
            setWorkingStatus("⚠ Status check failed.")
            setTimeout(() => setWorkingStatus(null), 5000)
        } finally {
            setIsPreflightRunning(false)
        }
    }, [triggerSync])

    // ── OAuth Completion Listener ───────────────────────────────────
    React.useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type === "oauth_complete") {
                // OAuth complete
                if (event.data.success) {
                    // ✅ Step 1: Instant confirmation (0–1s)
                    const provider = event.data.provider || "Email"
                    const providerLabel = provider === "google" ? "Gmail" : provider === "microsoft" ? "Outlook" : provider
                    const instantCard = {
                        id: `oauth_confirm_${Date.now()}`,
                        role: "assistant" as const,
                        content: `✅ ${providerLabel} connected.\n\nStarting your first sync — inbox and calendar data will appear here as it arrives. You don't need to wait.`,
                    }
                    setMessages(prev => [...prev, instantCard])

                    // ✅ Step 2: Fire-and-return: queue jobs + start polling
                    setShowSyncWidget(true)
                    triggerInitialSync().catch((err: any) => {
                        if (process.env.NODE_ENV !== 'production') console.warn("[WorkspaceLayout] OAuth triggerInitialSync failed:", err?.message)
                    })

                    // Refresh health (non-blocking)
                    fetchHealth().catch(() => { })
                } else {
                    setWorkingStatus(`Connection failed: ${event.data.error || 'Unknown'}`)
                    setTimeout(() => setWorkingStatus(null), 5000)
                }
            }
        }
        window.addEventListener("message", handleMessage)
        return () => window.removeEventListener("message", handleMessage)
    }, [triggerInitialSync, fetchHealth])

    // ── SSE Live Stream (with exponential backoff reconnection) ─────
    const { setIsLiveOffline } = useSystemStore()
    React.useEffect(() => {
        if (!onboardingComplete || !onboardingChecked) return

        let controller: AbortController | null = null
        let alive = true
        let retryDelay = 1000 // Start at 1s
        const MAX_RETRY_DELAY = 30000 // Cap at 30s
        let retryTimer: ReturnType<typeof setTimeout> | null = null

        const scheduleRetry = () => {
            if (!alive) return
            if (process.env.NODE_ENV !== 'production') console.log(`[SSE] Reconnecting in ${retryDelay / 1000}s...`)
            retryTimer = setTimeout(() => {
                if (alive) connect()
            }, retryDelay)
            retryDelay = Math.min(retryDelay * 2, MAX_RETRY_DELAY)
        }

        const connect = async () => {
            if (!alive) return
            try {
                const { getLiveToken } = await import("@/lib/aaliyah/api")
                const token = await getLiveToken()
                if (!alive) return

                const { fetchEventSource } = await import("@microsoft/fetch-event-source")
                controller = new AbortController()

                await fetchEventSource(`/aaliyah/live/stream`, {
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${token}` },
                    signal: controller.signal,
                    openWhenHidden: true,
                    onopen: async (res) => {
                        if (res.ok && res.status === 200) {
                            setIsLiveOffline(false)
                            retryDelay = 1000 // Reset backoff on successful connect
                        } else if (res.status >= 400 && res.status < 500 && res.status !== 429) {
                            setIsLiveOffline(true)
                            throw new Error("Client error")
                        }
                    },
                    onerror: (err) => {
                        setIsLiveOffline(true)
                        // Return undefined to let fetchEventSource close,
                        // then we schedule our own retry with backoff
                        throw err
                    },
                    onmessage: (event) => {
                        try {
                            const data = JSON.parse(event.data)

                            // Handle proactive assistant messages (Conversational Voice)
                            if (data.type === "assistant_message") {
                                const msgThreadId = data.payload?.thread_id;
                                const activeThreadId = useSystemStore.getState().threadSelection?.id;

                                // Render if it matches the active thread, OR if the user is in the Global Inbox (Master Console)
                                if (!activeThreadId || msgThreadId === activeThreadId) {
                                    const assistantMsg = {
                                        id: `proactive_${Date.now()}`,
                                        role: "assistant" as const,
                                        content: data.message || data.payload?.text || "",
                                        threadId: msgThreadId
                                    }
                                    setMessages(prev => [...prev, assistantMsg])
                                }
                            }

                            // Handle update events
                            if (data.type === "update" || data.type === "thread_updated" || data.type === "thread_moved" || data.type === "sync_complete") {
                                // SSE Update
                                setRefreshTrigger(t => t + 1)
                                fetchHealth().catch(() => { })
                            }

                            // Handle two-way sync deletion
                            if (data.type === "message_deleted") {
                                // Remote deletion detection
                                setRefreshTrigger(t => t + 1)
                                if (typeof window !== "undefined" && data.payload?.message_id) {
                                    window.dispatchEvent(new CustomEvent('aaliyah_message_deleted', {
                                        detail: { id: data.payload.message_id }
                                    }))
                                }
                            }

                            // Handle instant count updates
                            if (data.type === "counts_update") {
                                useSystemStore.getState().updateCountsFromPayload(data.payload)
                            }
                            // Handle live email arrival (slide-in)
                            if (data.type === "new_email_arrival") {
                                const arrivalItem = {
                                    id: `arrival_${data.payload.id}_${Date.now()}`,
                                    role: "assistant" as const,
                                    type: "email_action",
                                    payload: {
                                        sender: data.payload.sender_name || data.payload.sender,
                                        subject: data.payload.subject,
                                        snippet: data.payload.snippet,
                                        priority: "New",
                                        actions: data.payload.actions,
                                    },
                                }
                                setMessages(prev => [...prev, arrivalItem])
                            }

                            // Handle auto-followup nudges
                            if (data.type === "followup_nudge") {
                                const nudgeItem = {
                                    id: `nudge_${data.payload.thread_id}_${Date.now()}`,
                                    role: "assistant" as const,
                                    content: `📌 **Follow-up needed**: "${data.payload.subject || 'No subject'}" from ${data.payload.sender || 'Unknown'} hasn't received a reply. Want me to draft a nudge?`,
                                    threadId: data.payload.thread_id,
                                }
                                setMessages(prev => [...prev, nudgeItem])
                            }

                            // Handle draft ready (instant injection)
                            if (data.type === "draft_ready") {
                                const draftItem = {
                                    id: `draft_${data.payload?.email_id || Date.now()}_${Date.now()}`,
                                    role: "assistant" as const,
                                    type: "email_action",
                                    payload: {
                                        action: "draft_ready",
                                        email_id: data.payload?.email_id,
                                        subject: data.payload?.subject,
                                        draft: data.payload?.draft,
                                        sender: data.payload?.sender,
                                    },
                                    threadId: data.payload?.thread_id,
                                }
                                setMessages(prev => [...prev, draftItem])
                            }

                            // Add to action logs if message exists
                            if (data.message && data.type !== "assistant_message" && data.type !== "new_email_arrival" && data.type !== "counts_update") {
                                useSystemStore.getState().addLog(data.type, data.message)
                            }
                        } catch (e) {
                            // ignore malformed json
                        }
                    }
                })
            } catch (err) {
                if (process.env.NODE_ENV !== 'production') console.error("[SSE] Connection failed:", err)
                if (alive) {
                    setIsLiveOffline(true)
                    scheduleRetry()
                }
            }
        }

        connect()
        return () => {
            alive = false
            if (retryTimer) clearTimeout(retryTimer)
            if (controller) controller.abort()
        }
    }, [onboardingComplete, onboardingChecked, setIsLiveOffline, fetchHealth])

    // ── Check onboarding on mount ────────────────────────────────────
    React.useEffect(() => {
        // Check localStorage immediately — returning users unlock instantly
        const localDone = typeof window !== "undefined" && window.localStorage.getItem("aaliyah_onboarding_completed") === "true"
        if (localDone) {
            setOnboardingComplete(true)
            setOnboardingChecked(true)  // skip loading screen right away
            fetchHealth().catch(() => { })
            return
        }

        // Safety timeout: if API hangs, unblock after 2s
        const timer = setTimeout(() => {
            setOnboardingChecked(true)
        }, 2000)

        getOnboardingStatus()
            .then((res) => {
                clearTimeout(timer)
                setFirstName(res.first_name)
                if (String(res.onboarding_status).toLowerCase() === "completed") {
                    setOnboardingComplete(true)
                    if (typeof window !== "undefined") {
                        window.localStorage.setItem("aaliyah_onboarding_completed", "true")
                    }
                } else {
                    setOnboardingComplete(false)
                }
                setOnboardingChecked(true)
                fetchHealth().catch(() => { })
            })
            .catch((err) => {
                clearTimeout(timer)
                if (process.env.NODE_ENV !== 'production') console.error("Onboarding check failed:", err)
                setOnboardingComplete(false)
                setOnboardingChecked(true)
                fetchHealth().catch(() => { })
            })

        return () => clearTimeout(timer)
    }, [])

    // Show welcome message once onboarding check is done AND health is known
    React.useEffect(() => {
        // If we haven't checked health yet, wait (unless onboarding is not done)
        if (!onboardingChecked) return
        if (onboardingComplete && connectionHealth === null) return

        // ✅ Always ensure the first message is the LATEST greeting (overwrites stale cached versions)
        const firstMessageId = messages.length > 0 ? String(messages[0].id) : ""
        const isFirstMessageGreeting = firstMessageId.startsWith("welcome_")

        if (messages.length === 0 || isFirstMessageGreeting) {
            const syncHandler = () => {
                setShowSyncWidget(true)
                triggerInitialSync().catch((err: any) => {
                    console.warn("[WorkspaceLayout] triggerInitialSync failed silently:", err?.message)
                })
            }

            // At this point health is either known or we are in onboarding (where health doesn't gate the greeting)
            const effectiveHealth = connectionHealth ?? { email_accessible: false, email_health: 'unknown', calendar_accessible: false }
            const welcome = mkWelcomeBackItem(firstName, effectiveHealth, triagedCount, priorityCount, syncHandler, onboardingComplete, () => setOnboardingOpen(true))

            const newGreeting = {
                id: welcome.id,
                role: "assistant" as const,
                content: (welcome as any).text || "",
            }

            if (isFirstMessageGreeting) {
                // Replace ONLY the first message if it's a greeting, preserve rest of history
                setMessages(prev => [newGreeting, ...prev.slice(1)])
            } else {
                setMessages([newGreeting])
            }

            // Truth Gating: Only run preflight if email is healthy AND data exists
            if (effectiveHealth?.email_accessible && triagedCount > 0) {
                runPreflightProtocol()
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [onboardingChecked, connectionHealth, onboardingComplete])

    // Detect when a user newly connects an account, so Aaliyah can announce it
    const prevHealthRef = React.useRef<any>(null)
    React.useEffect(() => {
        if (!connectionHealth) return;

        const isFreshConnect = typeof window !== 'undefined' && window.localStorage.getItem('oauth_result') === 'success';

        if (isFreshConnect && connectionHealth.email_accessible) {
            window.localStorage.removeItem('oauth_result');
            setMessages(msgs => [
                ...msgs,
                {
                    id: crypto.randomUUID(),
                    role: "assistant",
                    content: "Connection successful! \n\nI have securely synced with your workspace. My full suite of capabilities—including inbox management, drafting, and calendar orchestration—is now fully unlocked and ready to use."
                }
            ]);
        } else {
            const prev = prevHealthRef.current;
            const wasDisconnected = prev && !prev.email_accessible;
            const isNowConnected = connectionHealth.email_accessible;

            // If we transitioned from known-disconnected to connected without reload (e.g popup flow)
            if (wasDisconnected && isNowConnected) {
                setMessages(msgs => [
                    ...msgs,
                    {
                        id: crypto.randomUUID(),
                        role: "assistant",
                        content: "Connection successful! \n\nI have securely synced with your workspace. My full suite of capabilities—including inbox management, drafting, and calendar orchestration—is now fully unlocked and ready to use."
                    }
                ]);
            }
        }

        prevHealthRef.current = connectionHealth;
    }, [connectionHealth]);

    // ── STATELESS REFRESH: just re-fetch thread list periodically ──────
    const REFRESH_INTERVAL_MS = 30 * 1000 // 30 seconds
    const emailAccessible = connectionHealth?.email_accessible ?? false

    React.useEffect(() => {
        if (!emailAccessible) return
        setRefreshTrigger(t => t + 1)
        setLastSyncedAt(new Date())
    }, [emailAccessible]) // Removed redundant interval polling; SSE handles real-time updates now.

    // ── Tick every 60s to update "Last synced X ago" relative time ────────
    React.useEffect(() => {
        const t = setInterval(() => setSyncTick(n => n + 1), 60_000)
        return () => clearInterval(t)
    }, [])

    // ── Proactive Recovery: Heartbeat Monitor (Poll health every 60s) ──────
    React.useEffect(() => {
        const checkHealth = async () => {
            const prevHeaderOk = connectionHealth?.email_accessible ?? true
            const newHealth = await fetchHealth()

            // If health just dropped from OK to FALSE during session
            if (prevHeaderOk && newHealth && !newHealth.email_accessible) {
                setMessages(prev => [...prev, {
                    id: `service_interrupt_${Date.now()}`,
                    role: "assistant",
                    content: "### ⚠️ Service Interrupt\nI've lost my connection to your workspace data. I cannot handle your inbox or meetings until this is resolved.\n\nPlease head to **Settings** to reconnect your account.",
                }])
                setToasts(prev => [...prev, { id: Date.now().toString(), message: "Aaliyah: Connection lost.", type: 'info' }])
            }
        }

        const h = setInterval(checkHealth, 60_000)
        return () => clearInterval(h)
    }, [fetchHealth, connectionHealth?.email_accessible, setMessages])

    // ══════════════════════════════════════════════════════════════════
    //  FULL WORKSPACE (only accessible after onboarding)
    // ══════════════════════════════════════════════════════════════════

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
                    setThreadSelection(adapted)
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

    const handleCardAction = async (action: CardAction, itemId: string) => {
        setWorkingStatus(`Executing ${action.label}...`)
        try {
            if (action.type === "link") {
                window.open(action.payload?.url, "_blank")
            } else if (action.type === "callback") {
                // To be implemented: POST /aaliyah/actions/execute
                const response = await aaliyahApi.post(`/actions/execute`, {
                    item_id: itemId,
                    action: action
                })
                setMessages(prev => [...prev, {
                    id: `receipt_${Date.now()}`,
                    role: "assistant",
                    content: response.data.message || `Action "${action.label}" executed successfully.`
                }])
            } else if (action.type === "snooze") {
                setMessages(prev => [...prev, {
                    id: `snooze_${Date.now()}`,
                    role: "assistant",
                    content: `Thread snoozed as requested. I'll remind you later.`
                }])
            }
        } catch (error) {
            console.error("Action execution failed", error)
            setMessages(prev => [...prev, {
                id: `error_${Date.now()}`,
                role: "assistant",
                content: `Sorry, I couldn't execute that action: ${error instanceof Error ? error.message : 'Unknown error'}`
            }])
        } finally {
            setWorkingStatus(null)
        }
    }

    // Initial Load (stateless: always try to load)
    const loadCounts = React.useCallback(() => {
        fetchStatus()
        fetchHealth().catch((err) => { if (process.env.NODE_ENV !== 'production') console.error(err) })
    }, [fetchStatus, fetchHealth])

    // eslint-disable-next-line react-hooks/exhaustive-deps
    React.useEffect(() => {
        loadCounts()
        // Removed redundant 15s counts polling; SSE counts_update handles this in real-time.
    }, [refreshTrigger])

    // Smart Queue Selection on Mount - Disabled per user request
    React.useEffect(() => {
        // We no longer auto-select a queue. It stays empty until clicked.
        if (activeTriageQueue === "all" && triagedCount === -1) {
            // Keeping logic structure
            setActiveTriageQueue("priority")
        }
    }, [triagedCount, activeTriageQueue, setActiveTriageQueue])

    const handleNavigate = React.useCallback((section: any) => {
        if (queueOpen && activeTriageQueue === section) {
            setQueueOpen(false)
        } else {
            setActiveTriageQueue(section)
            setQueueOpen(true)
        }
    }, [queueOpen, activeTriageQueue, setActiveTriageQueue])

    const handleMainClick = React.useCallback(() => {
        if (queueOpen) {
            setQueueOpen(false)
        }
    }, [queueOpen])

    const handleThreadSelect = React.useCallback((thread: EmailMessage) => {
        setThreadSelection(thread)
        setActiveAttachment(null) // Reset attachment when thread changes
        setQueueOpen(false)
        if (thread.id.startsWith('demo-')) {
            setSeenDemoIds(prev => {
                const next = new Set(prev)
                next.add(thread.id)
                return next
            })
        }
    }, [setThreadSelection])

    // Auto-close thread if it gets deleted remotely
    React.useEffect(() => {
        const handleRemoteDelete = ((e: CustomEvent) => {
            if (threadSelection && threadSelection.id === e.detail?.id) {
                // Thread closed due to remote deletion
                setThreadSelection(null)
                useSystemStore.getState().addLog("thread_deleted", "Thread was deleted from the remote inbox")
            }
        }) as EventListener

        window.addEventListener('aaliyah_message_deleted', handleRemoteDelete)
        return () => window.removeEventListener('aaliyah_message_deleted', handleRemoteDelete)
    }, [threadSelection, setThreadSelection])

    const uiCounts: Record<string, number> = {
        priority: priorityCount,
        needs_reply: useSystemStore(state => state.queuedCount),
        approvals: useSystemStore(state => state.pendingApprovals),
        follow_ups: useSystemStore(state => state.escalations),
    }

    const hasUnread = React.useCallback((section: string) => {
        const count = uiCounts[section] || 0
        return count > 0
    }, [uiCounts])



    const providerLabel = threadSelection?.provider === 'google' ? 'Gmail' : 'Outlook'

    const feedScrollRef = React.useRef<HTMLDivElement>(null)
    React.useEffect(() => {
        if (!feedScrollRef.current) return
        feedScrollRef.current.scrollTo({ top: feedScrollRef.current.scrollHeight, behavior: "smooth" })
    }, [messages])

    // Auto-clear Toasts logic using standard non-overlapping timer behavior
    React.useEffect(() => {
        if (toasts.length > 0) {
            const timer = setTimeout(() => {
                setToasts(prev => prev.slice(1));
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [toasts]);

    // ── If still checking, show skeleton ──────────────────────────────
    if (!onboardingChecked) {
        return (
            <div className="flex h-screen bg-white items-center justify-center font-sans select-none">
                <style dangerouslySetInnerHTML={{
                    __html: `
                    @keyframes ball-bounce {
                        0%, 100% { transform: translateY(0) scale(1); }
                        25% { transform: translateY(-32px) scale(0.92, 1.08); }
                        50% { transform: translateY(0) scale(1.12, 0.88); }
                        75% { transform: translateY(-12px) scale(0.96, 1.04); }
                    }
                    @keyframes shadow-scale {
                        0%, 100% { transform: scaleX(1); opacity: 0.25; }
                        25% { transform: scaleX(0.5); opacity: 0.08; }
                        50% { transform: scaleX(1.3); opacity: 0.35; }
                        75% { transform: scaleX(0.7); opacity: 0.12; }
                    }
                    @keyframes container-fade {
                        from { opacity: 0; transform: scale(0.9); }
                        to { opacity: 1; transform: scale(1); }
                    }
                    .zk-loader { animation: container-fade 0.4s ease-out forwards; }
                    .zk-ball {
                        width: 16px; height: 16px;
                        background: #18181b;
                        border-radius: 50%;
                        animation: ball-bounce 1.2s ease-in-out infinite;
                    }
                    .zk-ball:nth-child(2) { animation-delay: 0.12s; }
                    .zk-ball:nth-child(3) { animation-delay: 0.24s; }
                    .zk-shadow {
                        width: 16px; height: 4px;
                        border-radius: 50%;
                        background: radial-gradient(ellipse, rgba(0,0,0,0.2), transparent 70%);
                        animation: shadow-scale 1.2s ease-in-out infinite;
                    }
                    .zk-shadow:nth-child(2) { animation-delay: 0.12s; }
                    .zk-shadow:nth-child(3) { animation-delay: 0.24s; }
                `}} />
                <div className="zk-loader flex flex-col items-center">
                    <div className="flex gap-3">
                        <div className="zk-ball" />
                        <div className="zk-ball" />
                        <div className="zk-ball" />
                    </div>
                    <div className="flex gap-3 mt-2">
                        <div className="zk-shadow" />
                        <div className="zk-shadow" />
                        <div className="zk-shadow" />
                    </div>
                </div>
            </div>
        )
    }

    // Workspace always renders — onboarding is a modal triggered from chat

    return (
        <div className="flex h-screen bg-white overflow-hidden relative">
            <style dangerouslySetInnerHTML={{
                __html: `
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 10px; }
            `}} />


            {/* 1. Left Panel: Queue List */}
            <div className="w-56 shrink-0 flex flex-col">
                <LeftSidebar
                    onOpenGuidelines={() => setGuidelinesOpen(true)}
                    onOpenSettings={() => setSettingsOpen(true)}
                    onNavigate={handleNavigate}
                    disabled={!connectionHealth?.email_accessible}
                    isConnected={connectionHealth?.email_accessible ?? false}
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
                                {(activeTriageQueue || '').replace('_', ' ')}
                            </h2>
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <ThreadList
                                filter={activeTriageQueue}
                                selectedId={threadSelection?.id}
                                onSelect={handleThreadSelect}
                                refreshTrigger={refreshTrigger}
                                seenIds={seenDemoIds}
                                isConnected={connectionHealth?.email_accessible ?? false}
                                onConnect={() => setSettingsOpen(true)}
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 3. Main Panel: Conversation Workspace */}
            <main className="flex-1 h-full min-w-0 flex flex-col bg-white overflow-hidden relative" onClick={handleMainClick}>
                {/* Header */}
                <header className="h-16 border-b border-borderSubtle bg-white/80 backdrop-blur-xl flex items-center justify-between px-6 shrink-0 z-10 sticky top-0 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                    <div className="flex items-center gap-3 text-sm min-w-0 flex-1 overflow-hidden">
                        {threadSelection && (
                            <div className="flex items-center gap-3">
                                <button
                                    className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50 rounded-lg transition-colors border border-zinc-100"
                                    onClick={() => {
                                        setThreadSelection(null)
                                        setActiveAttachment(null)
                                    }}
                                >
                                    <CornerUpLeft className="h-4 w-4" />
                                </button>
                                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em]">Message Detail</span>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-4 shrink-0 px-2">
                        {/* Right side header content removed per user request */}
                    </div>
                </header>

                {/* Health Ribbon — Persistent disconnected banner */}
                <AnimatePresence>
                    {connectionHealth !== null && !connectionHealth?.email_accessible && (
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
                                    onClick={() => setSettingsOpen(true)}
                                    className="px-3 py-1 bg-amber-600 text-white text-[11px] font-bold rounded-lg hover:bg-amber-700 transition-all active:scale-95"
                                >
                                    Settings
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Content */}
                {threadSelection ? (
                    <div className="flex-1 w-full relative flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        <ThreadConversation
                            thread={threadSelection}
                            messages={messages}
                            isLoading={isLoading}
                            emailId={activeEmailId}
                            onAttachmentClick={(att) => setActiveAttachment(att)}
                            onAction={(action) => {
                                setThreadSelection(null)
                                setActiveAttachment(null)
                                setActiveEmailId(null)
                                setRefreshTrigger(t => t + 1)
                            }}
                            onEmailChat={(id) => setActiveEmailId(id)}
                        />
                    </div>
                ) : (
                    <div className="flex-1 h-full w-full relative flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>

                        {/* Native Scrollable Feed */}
                        <div
                            ref={feedScrollRef}
                            className="flex-1 w-full overflow-y-auto custom-scrollbar relative z-10"
                            style={{ overscrollBehavior: 'contain' }}
                        >
                            <div className="min-h-full flex flex-col justify-end">
                                {/* Header content (Sync Widget & Onboarding) */}
                                <div className="max-w-5xl mx-auto pt-8 px-4 md:px-8 space-y-4 w-full shrink-0">
                                    <AnimatePresence>
                                        {showSyncWidget && syncProgress.phase !== "idle" && (
                                            <SyncStatusWidget
                                                onDismiss={() => {
                                                    setShowSyncWidget(false)
                                                }}
                                            />
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* Message List */}
                                <div className="flex-1 flex flex-col">
                                    {messages.map((m) => (
                                        <div key={m.id} className="max-w-5xl mx-auto px-4 md:px-8 w-full shrink-0">
                                            <ChatMessage
                                                role={m.role as any}
                                                content={m.content}
                                                type={m.type}
                                                payload={m.payload}
                                            />
                                        </div>
                                    ))}
                                    {/* Begin Setup Button — directly below the greeting */}
                                    {!onboardingComplete && (
                                        <div className="max-w-5xl mx-auto px-4 md:px-8 w-full shrink-0 mt-2">
                                            <div className="flex w-full gap-3 pl-11">
                                                <button
                                                    onClick={() => setOnboardingOpen(true)}
                                                    className="px-6 py-3 bg-zinc-900 text-white rounded-2xl text-sm font-bold hover:bg-black transition-all active:scale-95 shadow-lg hover:shadow-zinc-900/20 flex items-center gap-2"
                                                >
                                                    Begin Setup
                                                    <ArrowRight className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Footer (Typing Indicator) */}
                                <div className="pb-32 px-4 md:px-8 max-w-5xl mx-auto w-full shrink-0 mt-auto">
                                    {isLoading && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
                                        <ChatMessage
                                            role="assistant"
                                            content="..."
                                        />
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Empty State / Disconnected Guide */}
                        {messages.length === 0 && syncProgress.phase === "idle" && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 z-0">
                                {connectionHealth !== null && !connectionHealth?.email_accessible ? (
                                    /* ── Enterprise Disconnected Guide ─────────────────── */
                                    <motion.div
                                        initial={{ opacity: 0, y: 16 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.6, ease: "easeOut" }}
                                        className="max-w-lg w-full pointer-events-auto"
                                    >
                                        {/* Shield Icon */}
                                        <div className="mx-auto h-16 w-16 rounded-2xl bg-zinc-100 border border-zinc-200 flex items-center justify-center mb-6">
                                            <ShieldAlert className="h-8 w-8 text-zinc-400" />
                                        </div>

                                        <h2 className="text-2xl font-black text-zinc-900 tracking-tight mb-2">
                                            I need access to your workspace
                                        </h2>
                                        <p className="text-sm text-zinc-500 max-w-md mx-auto leading-relaxed mb-8">
                                            Connect your email so I can manage your inbox, triage priority threads,
                                            draft replies in your voice, and keep your calendar organized.
                                        </p>

                                        {/* Provider Cards */}
                                        <div className="grid grid-cols-2 gap-3 mb-8 max-w-sm mx-auto">
                                            {/* Gmail Card */}
                                            <button
                                                onClick={async () => {
                                                    try {
                                                        const { connectorService } = await import("@/services/connector.service");
                                                        const { authUrl } = await connectorService.getAuthUrl({ provider: "google", serviceType: "both" });
                                                        window.location.href = authUrl;
                                                    } catch (err) {
                                                        setSettingsOpen(true);
                                                    }
                                                }}
                                                className="group flex flex-col items-center gap-3 p-5 bg-white border border-zinc-200 rounded-2xl hover:border-zinc-400 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 active:scale-95"
                                            >
                                                <div className="h-10 w-10 rounded-xl bg-red-50 flex items-center justify-center">
                                                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
                                                        <path d="M22 6L12 13L2 6" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                        <rect x="2" y="4" width="20" height="16" rx="3" stroke="#DC2626" strokeWidth="2" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <span className="text-sm font-bold text-zinc-900 block">Gmail</span>
                                                    <span className="text-[10px] text-zinc-400 font-medium">Google Workspace</span>
                                                </div>
                                            </button>

                                            {/* Outlook Card */}
                                            <button
                                                onClick={async () => {
                                                    try {
                                                        const { connectorService } = await import("@/services/connector.service");
                                                        const { authUrl } = await connectorService.getAuthUrl({ provider: "microsoft", serviceType: "both" });
                                                        window.location.href = authUrl;
                                                    } catch (err) {
                                                        setSettingsOpen(true);
                                                    }
                                                }}
                                                className="group flex flex-col items-center gap-3 p-5 bg-white border border-zinc-200 rounded-2xl hover:border-zinc-400 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 active:scale-95"
                                            >
                                                <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center">
                                                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
                                                        <path d="M22 6L12 13L2 6" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                        <rect x="2" y="4" width="20" height="16" rx="3" stroke="#2563EB" strokeWidth="2" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <span className="text-sm font-bold text-zinc-900 block">Outlook</span>
                                                    <span className="text-[10px] text-zinc-400 font-medium">Microsoft 365</span>
                                                </div>
                                            </button>
                                        </div>

                                        {/* Trust Line */}
                                        <p className="text-[11px] text-zinc-400 font-medium flex items-center justify-center gap-1.5">
                                            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                            </svg>
                                            Your data stays encrypted. I only access what you authorize.
                                        </p>
                                    </motion.div>
                                ) : (
                                    <div className="pointer-events-auto">
                                        <div className="h-16 w-16 rounded-full bg-zinc-50 border border-zinc-100 flex items-center justify-center mb-6 mx-auto">
                                            <BrainCircuit className="h-8 w-8 text-zinc-300" />
                                        </div>
                                        <h2 className="text-lg font-bold text-zinc-900 mb-2">Aaliyah Intelligence</h2>
                                        <p className="text-sm text-zinc-400 max-w-sm mx-auto">
                                            Ask me to search your emails, check your calendar, or manage your commitments.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Chat Input Bar - Always rendered at the bottom of the main panel */}
                <div className="shrink-0 border-t border-zinc-100 px-6 py-4 bg-white relative z-20">
                    <div className="max-w-3xl mx-auto w-full">
                        <ChatInput
                            value={input}
                            onChange={(val) => setInput(val)}
                            onSubmit={(e, attachments) => sendMessage(undefined, attachments)}
                            isLoading={isLoading}
                            placeholder={
                                threadSelection
                                    ? (activeEmailId ? "Ask about this email..." : `Reply about "${threadSelection.subject?.slice(0, 40)}"...`)
                                    : syncProgress.phase !== "idle"
                                        ? "Syncing..."
                                        : connectionHealth !== null && !connectionHealth?.email_accessible
                                            ? "Limited mode — ask me anything general..."
                                            : "Ask Aaliyah anything..."
                            }
                        />
                    </div>
                </div>
            </main>

            {/* 4. Full-Screen Attachment Viewer Overlay (Gmail-style) */}
            <AnimatePresence>
                {
                    activeAttachment && (
                        <AttachmentViewer
                            attachment={activeAttachment}
                            allAttachments={threadSelection?.attachments || []}
                            onClose={() => setActiveAttachment(null)}
                            onNavigate={(att) => setActiveAttachment(att)}
                        />
                    )
                }
            </AnimatePresence >

            {/* Toasts */}
            < div className="fixed bottom-24 right-8 flex flex-col gap-2 z-50 pointer-events-none" >
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
            </div >

            {/* Overlays */}
            {
                isMounted && typeof document !== 'undefined' && createPortal(
                    <AnimatePresence>
                        {guidelinesOpen && (
                            <motion.div
                                key="guidelines-overlay"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 z-[10000] bg-black/40 backdrop-blur-md flex items-center justify-center p-4 sm:p-12 pointer-events-auto"
                                onClick={() => setGuidelinesOpen(false)}
                            >
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-full max-w-5xl flex items-center justify-center"
                                >
                                    <GuidelinesForm onClose={() => setGuidelinesOpen(false)} />
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>,
                    document.body
                )
            }

            {
                isMounted && typeof document !== 'undefined' && createPortal(
                    <AnimatePresence>
                        {settingsOpen && (
                            <motion.div
                                key="settings-overlay"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 z-[10000] bg-black/40 backdrop-blur-md flex items-center justify-center p-4 sm:p-12 pointer-events-auto"
                                onClick={() => setSettingsOpen(false)}
                            >
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-full max-w-5xl flex items-center justify-center"
                                >
                                    <SettingsForm onClose={() => setSettingsOpen(false)} />
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>,
                    document.body
                )
            }

            {
                isMounted && typeof document !== 'undefined' && createPortal(
                    <AnimatePresence>
                        {onboardingOpen && (
                            <motion.div
                                key="onboarding-overlay"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 z-[10000] backdrop-blur-sm flex items-center justify-center p-4 sm:p-12 pointer-events-auto"
                                onClick={() => setOnboardingOpen(false)}
                            >
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-full max-w-5xl flex items-center justify-center"
                                >
                                    <OnboardingWizard onComplete={() => {
                                        setOnboardingOpen(false)
                                        setOnboardingComplete(true)
                                        // Inject thank-you message into chat
                                        setMessages([{
                                            id: `onboarding_done_${Date.now()}`,
                                            role: "assistant",
                                            content: `${firstName ? `Perfect, ${firstName}.` : `Perfect.`} Setup complete. I'm active and **ready to work**.\n\n**Here's what I'll do:**\n- Triage your inbox and surface what needs attention\n- Draft replies and follow-ups in your voice\n- Keep your calendar organized\n\nYou will see me in action as soon as you receive a new email. In the meantime, just ask me anything.`,
                                        }])
                                    }} />
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>,
                    document.body
                )
            }

            {/* Diagnostics Modal Overlay */}
            {
                isMounted && typeof document !== 'undefined' && createPortal(
                    <AnimatePresence>
                        {diagnosticsOpen && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-8 pointer-events-auto"
                                onClick={() => setDiagnosticsOpen(false)}
                            >
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="bg-[#1e1e1e] w-full max-w-5xl h-[80vh] rounded-2xl flex flex-col overflow-hidden shadow-2xl ring-1 ring-white/10"
                                >
                                    <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0 bg-neutral-900">
                                        <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                                            Live Diagnostics
                                        </h2>
                                        <button onClick={() => setDiagnosticsOpen(false)} className="text-zinc-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-1.5 rounded-lg active:scale-95">
                                            <X className="h-5 w-5" />
                                        </button>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-6 bg-[#111111] font-mono text-[11px] leading-relaxed text-emerald-400/90 custom-scrollbar">
                                        <pre className="whitespace-pre-wrap select-text">{diagnosticsLogs}</pre>
                                    </div>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>,
                    document.body
                )
            }

        </div >
    )
}

export function WorkspaceLayout() {
    return (
        <ErrorBoundary>
            <WorkspaceLayoutInner />
        </ErrorBoundary>
    )
}
