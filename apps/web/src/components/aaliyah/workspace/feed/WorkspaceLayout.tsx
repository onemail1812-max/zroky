"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { AnimatePresence, motion } from "framer-motion"
import Link from "next/link"
import { LeftSidebar } from "./LeftSidebar"
import { ThreadList } from "./ThreadList"
import { ThreadReader } from "./ThreadReader"
import { Search, Settings, Paperclip, SendHorizontal, BookOpen, X, ArrowRight, CornerUpLeft } from "lucide-react"
import { inboxService, EmailMessage } from "@/services/inbox.service"
import GuidelinesForm from "@/components/aaliyah/forms/GuidelinesForm"
import SettingsForm from "@/components/aaliyah/forms/SettingsForm"
import OnboardingWizard from "@/components/aaliyah/forms/OnboardingWizard"
import { CardFeed, type FeedItem, type Evidence, type CardAction } from "../main/CardFeed"
import { getThreadDetails, getOnboardingStatus, runPreflight, getBriefing, aaliyahApi, sendDraft, updateDraft, readLocalStorage, WORKSPACE_KEYS } from "@/lib/aaliyah/api"
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

    // Email NOT connected → show connect CTA (only for already-onboarded users)
    if (!isOk) {
        return {
            id: `welcome_health_${Date.now()}`,
            type: "response",
            title: "Aaliyah",
            text: `${timeGreeting}, ${name}. I'm active and ready.\n\nOne thing — your email isn't connected yet, so I can't see your inbox. Head to **Settings → Connect Email** and I'll take it from there.`,
            tone: "normal" as any,
        }
    }

    const message = triagedCount === 0
        ? `${timeGreeting}, ${name}. Your workspace is ready — ask me anything or connect your email in Settings to unlock inbox intelligence.`
        : `${timeGreeting}, ${name}. You have ${triagedCount} item${triagedCount === 1 ? "" : "s"} triaged in your inbox. Want a briefing?`

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
    const [selectedThread, setSelectedThread] = React.useState<EmailMessage | null>(null)
    const [activeAttachment, setActiveAttachment] = React.useState<any | null>(null)
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
    const [workingStatus, setWorkingStatus] = React.useState<string | null>(null)
    const [isPreflightRunning, setIsPreflightRunning] = React.useState(false)

    // Custom Aaliyah Chat hook (clean SSE, no external deps)
    const { messages, input, setInput, isLoading, sendMessage, setMessages } = useAaliyahChat({
        api: "/assist/chat",
    })

    const {
        connectionHealth,
        fetchHealth,
        isBackendConnected,
        triggerSync,
        triggerInitialSync,
        syncProgress,
        triagedCount,
        syncError,
        isSyncing,
        resetSyncError
    } = useSystemStore()

    const [showSyncWidget, setShowSyncWidget] = React.useState(false)
    const [lastSyncedAt, setLastSyncedAt] = React.useState<Date | null>(null)
    const [syncTick, setSyncTick] = React.useState(0) // force re-render for relative time
    const [isMounted, setIsMounted] = React.useState(false)

    React.useEffect(() => {
        setIsMounted(true)
    }, [])

    // ── Daily Preflight Gate (3-step visible progress) ───────────────
    const runMorningProtocols = React.useCallback(async () => {
        if (isPreflightRunning) return
        setIsPreflightRunning(true)

        const STEPS = [
            "Step 1 of 3 — Checking connections...",
            "Step 2 of 3 — Syncing inbox & calendar...",
            "Step 3 of 3 — Preparing your briefing...",
        ]

        setWorkingStatus(STEPS[0])

        try {
            // Step 1 – health + preflight handled inside triggerSync
            await triggerSync()

            // Step 2 – Sync visible confirmation
            setWorkingStatus(STEPS[1])
            await new Promise(r => setTimeout(r, 400)) // allow UI to render

            // Step 3 – Briefing
            setWorkingStatus(STEPS[2])
            const briefing = await getBriefing()

            if (briefing?.content) {
                setMessages(prev => [
                    ...prev,
                    {
                        id: `briefing_${Date.now()}`,
                        role: "assistant",
                        content: briefing.content,
                    }
                ])
            }
            setWorkingStatus(null)
        } catch (err) {
            if (process.env.NODE_ENV !== 'production') console.error("Protocols failed", err)
            setWorkingStatus("⚠ Protocol check failed — tap retry or check Settings.")
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

    // ── SSE Live Stream ──────────────────────────────────────────────
    const { setIsLiveOffline } = useSystemStore()
    React.useEffect(() => {
        if (!onboardingComplete || !onboardingChecked) return

        let controller: AbortController | null = null
        let alive = true

        const connect = async () => {
            try {
                const { getLiveToken } = await import("@/lib/aaliyah/api")
                const token = await getLiveToken()
                if (!alive) return

                const { fetchEventSource } = await import("@microsoft/fetch-event-source")
                controller = new AbortController()

                fetchEventSource(`/aaliyah/live/stream`, {
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${token}` },
                    signal: controller.signal,
                    onopen: async (res) => {
                        if (res.ok && res.status === 200) {
                            setIsLiveOffline(false)
                        } else if (res.status >= 400 && res.status < 500 && res.status !== 429) {
                            setIsLiveOffline(true)
                            throw new Error("Client error")
                        }
                    },
                    onerror: (err) => {
                        setIsLiveOffline(true)
                    },
                    onmessage: (event) => {
                        try {
                            const data = JSON.parse(event.data)

                            // Handle proactive assistant messages (Conversational Voice)
                            if (data.type === "assistant_message") {
                                const assistantMsg = {
                                    id: `proactive_${Date.now()}`,
                                    role: "assistant" as const,
                                    content: data.message || data.payload?.text || "",
                                }
                                setMessages(prev => [...prev, assistantMsg])
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
                                    type: "new-email-arrival",
                                    sender: data.payload.sender_name || data.payload.sender,
                                    subject: data.payload.subject,
                                    snippet: data.payload.snippet,
                                    timestamp: "Just now"
                                }
                                setMessages(prev => [...prev, arrivalItem])
                            }

                            // Handle auto-followup nudges
                            if (data.type === "followup_nudge") {
                                const nudgeItem = {
                                    id: `nudge_${data.payload.thread_id}_${Date.now()}`,
                                    type: "followup-nudge",
                                    sender: data.payload.sender,
                                    subject: data.payload.subject,
                                    threadId: data.payload.thread_id,
                                    timestamp: "Just now"
                                }
                                setMessages(prev => [...prev, nudgeItem])
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
                if (alive) setIsLiveOffline(true)
            }
        }

        connect()
        return () => {
            alive = false
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

    // Show welcome message once onboarding check is done
    React.useEffect(() => {
        if (onboardingChecked && messages.length === 0) {
            const syncHandler = () => {
                setShowSyncWidget(true)
                triggerInitialSync().catch((err: any) => {
                    console.warn("[WorkspaceLayout] triggerInitialSync failed silently:", err?.message)
                })
            }

            // If health not yet loaded, show onboarding/greeting without email status
            const effectiveHealth = connectionHealth ?? { email_accessible: false, email_health: 'unknown', calendar_accessible: false }
            const welcome = mkWelcomeBackItem(firstName, effectiveHealth, triagedCount, syncHandler, onboardingComplete, () => setOnboardingOpen(true))
            setMessages([{
                id: welcome.id,
                role: "assistant",
                content: (welcome as any).text || "",
            }])

            // Truth Gating: Only run morning protocols if email is healthy AND data exists
            if (effectiveHealth?.email_accessible && triagedCount > 0) {
                runMorningProtocols()
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [onboardingChecked])

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

    // Initial Load & Polling (stateless: always try to load)
    const loadCounts = React.useCallback(() => {
        inboxService.getCounts().then(res => {
            setCounts(res)
        }).catch((err) => { if (process.env.NODE_ENV !== 'production') console.error(err) })
        fetchHealth().catch((err) => { if (process.env.NODE_ENV !== 'production') console.error(err) })
    }, [refreshTrigger, fetchHealth])

    // eslint-disable-next-line react-hooks/exhaustive-deps
    React.useEffect(() => {
        loadCounts()
        // Removed redundant 15s counts polling; SSE counts_update handles this in real-time.
    }, [refreshTrigger])

    // Smart Queue Selection on Mount - Disabled per user request
    React.useEffect(() => {
        // We no longer auto-select a queue. It stays empty until clicked.
        if (!currentSection && counts.priority === -1) {
            // This condition is artificially false to prevent auto-selection but keep the logic structure if needed later
            setCurrentSection("priority")
        }
    }, [counts, currentSection])

    const handleNavigate = (section: string) => {
        if (queueOpen && currentSection === section) {
            setQueueOpen(false)
            setCurrentSection("")
        } else {
            setCurrentSection(section)
            setQueueOpen(true)
        }
    }

    const handleMainClick = () => {
        if (queueOpen) {
            setQueueOpen(false)
            setCurrentSection("")
        }
    }

    const handleThreadSelect = (thread: EmailMessage) => {
        setSelectedThread(thread)
        setActiveAttachment(null) // Reset attachment when thread changes
        setQueueOpen(false)
        if (thread.id.startsWith('demo-')) {
            setSeenDemoIds(prev => {
                const next = new Set(prev)
                next.add(thread.id)
                return next
            })
        }
    }

    // Auto-close thread if it gets deleted remotely
    React.useEffect(() => {
        const handleRemoteDelete = ((e: CustomEvent) => {
            if (selectedThread && selectedThread.id === e.detail?.id) {
                // Thread closed due to remote deletion
                setSelectedThread(null)
                useSystemStore.getState().addLog("thread_deleted", "Thread was deleted from the remote inbox")
            }
        }) as EventListener

        window.addEventListener('aaliyah_message_deleted', handleRemoteDelete)
        return () => window.removeEventListener('aaliyah_message_deleted', handleRemoteDelete)
    }, [selectedThread])

    const uiCounts = counts

    const hasUnread = (section: string) => {
        const count = uiCounts[section] || 0
        return count > 0
    }



    const providerLabel = selectedThread?.provider === 'google' ? 'Gmail' : 'Outlook'

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
                    currentSection={currentSection}
                    onNavigate={handleNavigate}
                    onOpenGuidelines={() => setGuidelinesOpen(true)}
                    onOpenSettings={() => setSettingsOpen(true)}
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
                <header className="h-16 border-b border-borderSubtle bg-white/80 backdrop-blur-xl flex items-center justify-between px-6 shrink-0 z-10 sticky top-0 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                    <div className="flex items-center gap-3 text-sm min-w-0 flex-1 overflow-hidden">
                        {selectedThread && (
                            <div className="flex items-center gap-3">
                                <button
                                    className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50 rounded-lg transition-colors border border-zinc-100"
                                    onClick={() => {
                                        setSelectedThread(null)
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

                {/* Content */}

                {/* Content */}
                {selectedThread ? (
                    <div className="flex-1 overflow-y-auto w-full relative" onClick={(e) => e.stopPropagation()}>
                        {/* Floating Back Button */}
                        <div className="absolute top-6 left-6 z-50">
                            <button
                                className="flex items-center gap-2 px-3 py-2 bg-white/90 backdrop-blur border border-zinc-200 shadow-sm text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 rounded-xl transition-all"
                                onClick={() => {
                                    setSelectedThread(null)
                                    setActiveAttachment(null)
                                }}
                            >
                                <CornerUpLeft className="h-4 w-4" /> <span className="text-[12px] font-bold tracking-tight">Back</span>
                            </button>
                        </div>
                        <ThreadReader
                            thread={selectedThread}
                            onAttachmentClick={(att) => setActiveAttachment(att)}
                            onAction={(action) => {
                                // Close the thread view
                                setSelectedThread(null)
                                setActiveAttachment(null)
                                // Trigger an immediate feed refresh from DB
                                setRefreshTrigger(t => t + 1)
                            }}
                        />
                    </div>
                ) : (
                    <div ref={feedScrollRef} className="flex-1 overflow-y-auto px-4 py-8 md:px-8 custom-scrollbar" onClick={(e) => e.stopPropagation()}>
                        <div className="max-w-5xl mx-auto space-y-4 relative">
                            <AnimatePresence>
                                {showSyncWidget && syncProgress.phase !== "idle" && (
                                    <SyncStatusWidget
                                        onDismiss={() => {
                                            setShowSyncWidget(false)
                                        }}
                                    />
                                )}
                            </AnimatePresence>

                            <div className="flex flex-col">
                                <CardFeed
                                    items={messages.map(m => {
                                        if (m.type === "new-email-arrival") return m as any;
                                        return {
                                            id: m.id,
                                            type: m.role === "user" ? "user-command" : "response",
                                            text: m.content || "",
                                            title: m.role === "assistant" ? "Aaliyah" : undefined,
                                            timestamp: "Just now"
                                        } as any;
                                    })}
                                    onUpdateDraft={(id, draft) => {
                                        updateDraft(id, draft).catch((err: any) => console.error("Draft update failed", err))
                                    }}
                                    onApprovalAction={(action, id) => {
                                        if (action === "approve") {
                                            sendDraft(readLocalStorage(WORKSPACE_KEYS) || "", id)
                                                .then(() => setMessages(prev => [...prev, { id: `send_${Date.now()}`, role: "assistant", content: "Email sent successfully." }]))
                                                .catch((err: any) => console.error("Send failed", err))
                                        }
                                    }}
                                    onCardAction={handleCardAction}
                                    onOpenIntelligence={(tab) => {
                                        setCurrentSection(tab)
                                        setQueueOpen(true)
                                    }}
                                    onSourceClick={async (ev) => {
                                        if (ev.type === 'thread') {
                                            try {
                                                const thread = await getThreadDetails(ev.id, ev.provider)
                                                if (thread) setSelectedThread(thread)
                                            } catch (err) {
                                                console.error("Failed to load thread source", err)
                                            }
                                        }
                                    }}
                                />
                                {!onboardingComplete && messages.length > 0 && (
                                    <div className="flex w-full gap-3 mb-6 pl-11">
                                        <button
                                            onClick={() => setOnboardingOpen(true)}
                                            className="px-6 py-3 bg-zinc-900 text-white rounded-2xl text-sm font-bold hover:bg-black transition-all active:scale-95 shadow-lg hover:shadow-zinc-900/20 flex items-center gap-2"
                                        >
                                            Begin Setup
                                            <ArrowRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                                {isLoading && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
                                    <ChatMessage
                                        role="assistant"
                                        content="..."
                                    />
                                )}
                            </div>

                            {messages.length === 0 && syncProgress.phase === "idle" && (
                                <div className="h-full flex flex-col items-center justify-center pt-20 text-center px-6">
                                    <div className="h-16 w-16 rounded-full bg-zinc-50 border border-zinc-100 flex items-center justify-center mb-6">
                                        <BrainCircuit className="h-8 w-8 text-zinc-300" />
                                    </div>

                                    {!connectionHealth?.email_accessible ? (
                                        <>
                                            <h2 className="text-2xl font-black text-zinc-900 mb-3 tracking-tight">Connect Your Email</h2>
                                            <p className="text-base text-zinc-500 max-w-sm leading-relaxed mb-8">
                                                Connect your Gmail or Outlook in Settings to unlock inbox management, smart triage, and calendar intelligence.
                                            </p>
                                            <button
                                                onClick={() => setSettingsOpen(true)}
                                                className="inline-flex items-center gap-2 px-6 py-3 bg-zinc-900 text-white rounded-2xl font-bold hover:bg-black transition-all shadow-lg hover:shadow-zinc-900/10 active:scale-95"
                                            >
                                                Open Settings
                                                <ArrowRight className="h-4 w-4" />
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <h2 className="text-lg font-bold text-zinc-900 mb-2">Aaliyah Intelligence</h2>
                                            <p className="text-sm text-zinc-400 max-w-sm">
                                                Ask me to search your emails, check your calendar, or manage your commitments.
                                            </p>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Chat Input Bar */}
                <div className="shrink-0 border-t border-zinc-100 px-6 py-4 bg-white">
                    <div className="max-w-3xl mx-auto w-full">
                        <ChatInput
                            value={input}
                            onChange={(val) => setInput(val)}
                            onSubmit={() => sendMessage()}
                            isLoading={isLoading}
                            placeholder={isSyncing ? "Syncing..." : "Ask Aaliyah anything..."}
                        />

                        <AnimatePresence>
                            {workingStatus && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    className="flex justify-center mt-3"
                                >
                                    <div className="flex items-center gap-2 px-3 py-1 bg-zinc-50 text-zinc-400 border border-zinc-100 rounded-full text-[10px] font-black tracking-widest uppercase">
                                        <span className="h-1 w-1 rounded-full bg-zinc-400 animate-pulse" />
                                        {workingStatus}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </main>

            {/* 4. Full-Screen Attachment Viewer Overlay (Gmail-style) */}
            <AnimatePresence>
                {activeAttachment && (
                    <AttachmentViewer
                        attachment={activeAttachment}
                        allAttachments={selectedThread?.attachments || []}
                        onClose={() => setActiveAttachment(null)}
                        onNavigate={(att) => setActiveAttachment(att)}
                    />
                )}
            </AnimatePresence>

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

            {/* Overlays */}
            {isMounted && typeof document !== 'undefined' && createPortal(
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
            )}

            {isMounted && typeof document !== 'undefined' && createPortal(
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
            )}

            {isMounted && typeof document !== 'undefined' && createPortal(
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
            )}
        </div>
    )
}

export function WorkspaceLayout() {
    return (
        <ErrorBoundary>
            <WorkspaceLayoutInner />
        </ErrorBoundary>
    )
}
