"use client"

import * as React from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useSystemStore } from "@/lib/aaliyah/store"
import { useAaliyahChat } from "@/lib/aaliyah/useAaliyahChat"
import { getOnboardingStatus, getThreadDetails, aaliyahApi } from "@/lib/aaliyah/api"
import { useFeedSSE } from "@/hooks/useFeedSSE"
import { mkWelcomeBackItem } from "./WelcomeMessage"
import type { Toast } from "./ToastStack"
import type { EmailMessage } from "@/services/inbox.service"

type Evidence = { type: string; id: string; provider: string }
type CardAction = { type: string; label: string; payload?: any }

export interface WorkspaceEffectsReturn {
    // Onboarding
    onboardingChecked: boolean
    onboardingComplete: boolean
    firstName: string | null
    onboardingOpen: boolean
    setOnboardingOpen: React.Dispatch<React.SetStateAction<boolean>>

    // Chat
    messages: any[]
    setMessages: React.Dispatch<React.SetStateAction<any[]>>
    input: string
    setInput: React.Dispatch<React.SetStateAction<string>>
    isLoading: boolean
    sendMessage: (overrideMessage?: string, attachments?: any[]) => void

    // Workspace UI state
    settingsOpen: boolean
    setSettingsOpen: React.Dispatch<React.SetStateAction<boolean>>
    guidelinesOpen: boolean
    setGuidelinesOpen: React.Dispatch<React.SetStateAction<boolean>>
    diagnosticsOpen: boolean
    setDiagnosticsOpen: React.Dispatch<React.SetStateAction<boolean>>
    diagnosticsLogs: string
    activeAttachment: any | null
    setActiveAttachment: React.Dispatch<React.SetStateAction<any | null>>
    activeEmailId: string | null
    setActiveEmailId: React.Dispatch<React.SetStateAction<string | null>>
    queueOpen: boolean
    setQueueOpen: React.Dispatch<React.SetStateAction<boolean>>
    workingStatus: string | null
    showSyncWidget: boolean
    setShowSyncWidget: React.Dispatch<React.SetStateAction<boolean>>
    refreshTrigger: number
    setRefreshTrigger: React.Dispatch<React.SetStateAction<number>>
    toasts: Toast[]
    seenDemoIds: Set<string>

    // Handlers
    handleNavigate: (section: any) => void
    handleMainClick: () => void
    handleThreadSelect: (thread: EmailMessage) => void

    // Scroll ref
    feedScrollRef: React.RefObject<HTMLDivElement | null>
}

export function useWorkspaceEffects(): WorkspaceEffectsReturn {
    const searchParams = useSearchParams()
    const router = useRouter()

    // ── Onboarding ──
    const [onboardingChecked, setOnboardingChecked] = React.useState(false)
    const [onboardingComplete, setOnboardingComplete] = React.useState(false)
    const [firstName, setFirstName] = React.useState<string | null>(null)
    const [onboardingOpen, setOnboardingOpen] = React.useState(false)

    // ── Workspace UI state ──
    const [settingsOpen, setSettingsOpen] = React.useState(false)
    const [guidelinesOpen, setGuidelinesOpen] = React.useState(false)
    const [diagnosticsOpen, setDiagnosticsOpen] = React.useState(false)
    const [diagnosticsLogs, setDiagnosticsLogs] = React.useState<string>("Loading logs...")
    const [activeAttachment, setActiveAttachment] = React.useState<any | null>(null)
    const [activeEmailId, setActiveEmailId] = React.useState<string | null>(null)
    const [queueOpen, setQueueOpen] = React.useState(false)
    const [refreshTrigger, setRefreshTrigger] = React.useState(0)
    const [toasts, setToasts] = React.useState<Toast[]>([])
    const [seenDemoIds, setSeenDemoIds] = React.useState<Set<string>>(new Set())
    const [workingStatus, setWorkingStatus] = React.useState<string | null>(null)
    const [isPreflightRunning, setIsPreflightRunning] = React.useState(false)
    const [showSyncWidget, setShowSyncWidget] = React.useState(false)
    const [lastSyncedAt, setLastSyncedAt] = React.useState<Date | null>(null)
    const [syncTick, setSyncTick] = React.useState(0)

    const feedScrollRef = React.useRef<HTMLDivElement | null>(null)

    // ── Store ──
    const {
        connectionHealth,
        fetchHealth,
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
    } = useSystemStore()

    // ── Chat ──
    const { messages, input, setInput, isLoading, sendMessage, setMessages } = useAaliyahChat({
        api: "/api/v1/assist/chat",
        threadId: threadSelection?.id,
        emailId: activeEmailId,
    })

    // ── Preflight Runner ──
    const runPreflightProtocol = React.useCallback(async () => {
        if (isPreflightRunning) return
        setIsPreflightRunning(true)
        setWorkingStatus("Checking system status...")

        try {
            await triggerSync()
            setWorkingStatus(null)
        } catch (err) {
            setWorkingStatus("⚠ Status check failed.")
            setTimeout(() => setWorkingStatus(null), 5000)
        } finally {
            setIsPreflightRunning(false)
        }
    }, [triggerSync, isPreflightRunning])

    // ── OAuth Completion Listener (Popup/iframe flow) ──
    React.useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type === "oauth_complete") {
                if (event.data.success) {
                    const provider = event.data.provider || "Email"
                    const providerLabel = provider === "google" ? "Gmail" : provider === "microsoft" ? "Outlook" : provider
                    const instantCard = {
                        id: `oauth_confirm_${Date.now()}`,
                        role: "assistant" as const,
                        content: `✅ ${providerLabel} connected.\n\nStarting your first sync — inbox and calendar data will appear here as it arrives. You don't need to wait.`,
                    }
                    setMessages(prev => [...prev, instantCard])
                    setShowSyncWidget(true)
                    triggerInitialSync().catch(() => { })
                    fetchHealth().catch(() => { })
                } else {
                    setWorkingStatus(`Connection failed: ${event.data.error || 'Unknown'}`)
                    setTimeout(() => setWorkingStatus(null), 5000)
                }
            }
        }
        window.addEventListener("message", handleMessage)
        return () => window.removeEventListener("message", handleMessage)
    }, [triggerInitialSync, fetchHealth, setMessages])

    // ── SSE Live Stream ──
    useFeedSSE({
        onboardingComplete,
        onboardingChecked,
        setMessages,
        setRefreshTrigger,
        fetchHealth
    })

    // ── Onboarding Check ──
    React.useEffect(() => {
        const timer = setTimeout(() => {
            setOnboardingChecked(true)
        }, 2000)

        getOnboardingStatus()
            .then((res) => {
                clearTimeout(timer)
                setFirstName(res.first_name)
                if (String(res.onboarding_status).toLowerCase() === "completed") {
                    setOnboardingComplete(true)
                } else {
                    setOnboardingComplete(false)
                }
                setOnboardingChecked(true)
                fetchHealth().catch(() => { })
            })
            .catch(() => {
                clearTimeout(timer)
                setOnboardingChecked(true)
                fetchHealth().catch(() => { })
            })

        return () => clearTimeout(timer)
    }, [fetchHealth])

    // ── Welcome Message ──
    React.useEffect(() => {
        if (!onboardingChecked) return
        if (onboardingComplete && connectionHealth === null) return

        const firstMessageId = messages.length > 0 ? String(messages[0].id) : ""
        const isFirstMessageGreeting = firstMessageId.startsWith("welcome_")

        if (messages.length === 0 || isFirstMessageGreeting) {
            const syncHandler = () => {
                setShowSyncWidget(true)
                triggerInitialSync().catch(() => { })
            }

            const effectiveHealth = connectionHealth ?? { email_accessible: false, email_health: 'unknown', calendar_accessible: false }
            const welcome = mkWelcomeBackItem(firstName, effectiveHealth, triagedCount, priorityCount, syncHandler, onboardingComplete, () => setOnboardingOpen(true))

            const newGreeting = {
                id: welcome.id,
                role: "assistant" as const,
                content: (welcome as any).text || "",
            }

            if (isFirstMessageGreeting) {
                setMessages(prev => [newGreeting, ...prev.slice(1)])
            } else {
                setMessages([newGreeting])
            }

            if (effectiveHealth?.email_accessible && triagedCount > 0) {
                runPreflightProtocol()
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [onboardingChecked, connectionHealth, onboardingComplete])

    // ── OAuth Param Detection ──
    const prevHealthRef = React.useRef<any>(null)
    React.useEffect(() => {
        const isQuerySuccess = searchParams.get('oauth_success') === 'true';
        const isLocalSuccess = typeof window !== 'undefined' && window.localStorage.getItem('oauth_result') === 'success';
        const isFreshConnect = isQuerySuccess || isLocalSuccess;

        const oauthError = searchParams.get('oauth_error');
        const oauthErrorDesc = searchParams.get('oauth_error_description');

        if (oauthError) {
            setMessages(msgs => [
                ...msgs,
                {
                    id: crypto.randomUUID(),
                    role: "assistant",
                    content: `### ⚠️ Connection Failed\n\nI couldn't connect to your account. ${oauthErrorDesc || (oauthError === 'access_denied' ? "It looks like the authorization was denied." : "An unexpected error occurred.")}\n\nYou can try again from **Settings** whenever you're ready.`
                }
            ]);

            const params = new URLSearchParams(searchParams.toString());
            params.delete('oauth_error');
            params.delete('oauth_error_description');
            router.replace(window.location.pathname + (params.toString() ? `?${params.toString()}` : ''));

        } else if (isFreshConnect) {
            if (isLocalSuccess) window.localStorage.removeItem('oauth_result');

            if (isQuerySuccess) {
                const params = new URLSearchParams(searchParams.toString());
                params.delete('oauth_success');
                params.delete('provider');
                router.replace(window.location.pathname + (params.toString() ? `?${params.toString()}` : ''));
            }

            setMessages(msgs => [
                ...msgs,
                {
                    id: crypto.randomUUID(),
                    role: "assistant",
                    content: "Connection successful! \n\nI have securely synced with your workspace. My full suite of capabilities—including inbox management, drafting, and calendar orchestration—is now fully unlocked and ready to use."
                }
            ]);

            setShowSyncWidget(true);
            triggerInitialSync().catch(() => { });
            fetchHealth().catch(() => { });

        } else if (connectionHealth) {
            const prev = prevHealthRef.current;
            const wasDisconnected = prev && !prev.email_accessible;
            const isNowConnected = connectionHealth.email_accessible;

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
    }, [connectionHealth, searchParams, router, fetchHealth, setMessages, triggerInitialSync]);

    // ── Refresh on email accessible ──
    const emailAccessible = connectionHealth?.email_accessible ?? false
    React.useEffect(() => {
        if (!emailAccessible) return
        setRefreshTrigger(t => t + 1)
        setLastSyncedAt(new Date())
    }, [emailAccessible])

    // ── Tick every 60s for "Last synced X ago" ──
    React.useEffect(() => {
        const t = setInterval(() => setSyncTick(n => n + 1), 60_000)
        return () => clearInterval(t)
    }, [])

    // ── Heartbeat Monitor ──
    React.useEffect(() => {
        const checkHealth = async () => {
            const prevHeaderOk = connectionHealth?.email_accessible ?? true
            const newHealth = await fetchHealth()

            if (prevHeaderOk && newHealth && !newHealth.email_accessible) {
                setMessages(prev => [...prev, {
                    id: `service_interrupt_${Date.now()}`,
                    role: "assistant",
                    content: "### ⚠️ Service Interrupt\nI've lost my connection to your workspace data. I cannot handle your inbox or meetings until this is resolved.\n\nPlease head to **Settings** to reconnect your account.",
                }])
                setToasts(prev => [...prev, { id: Date.now().toString(), message: "Aaliyah: Connection lost.", type: 'info' as const }])
            }
        }

        const h = setInterval(checkHealth, 60_000)
        return () => clearInterval(h)
    }, [fetchHealth, connectionHealth?.email_accessible, setMessages])

    // ── Load Counts ──
    const loadCounts = React.useCallback(() => {
        fetchStatus()
        fetchHealth().catch((err) => { if (process.env.NODE_ENV !== 'production') console.error(err) })
    }, [fetchStatus, fetchHealth])

    // eslint-disable-next-line react-hooks/exhaustive-deps
    React.useEffect(() => {
        loadCounts()
    }, [refreshTrigger])

    // ── Smart Queue Selection ──
    React.useEffect(() => {
        if (activeTriageQueue === "all" && triagedCount === -1) {
            setActiveTriageQueue("priority")
        }
    }, [triagedCount, activeTriageQueue, setActiveTriageQueue])

    // ── Navigation Handlers ──
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
        setActiveAttachment(null)
        setQueueOpen(false)
        if (thread.id.startsWith('demo-')) {
            setSeenDemoIds(prev => {
                const next = new Set(prev)
                next.add(thread.id)
                return next
            })
        }
    }, [setThreadSelection])

    // ── Auto-close thread on remote delete ──
    React.useEffect(() => {
        const handleRemoteDelete = ((e: CustomEvent) => {
            if (threadSelection && threadSelection.id === e.detail?.id) {
                setThreadSelection(null)
                useSystemStore.getState().addLog("thread_deleted", "Thread was deleted from the remote inbox")
            }
        }) as EventListener

        window.addEventListener('aaliyah_message_deleted', handleRemoteDelete)
        return () => window.removeEventListener('aaliyah_message_deleted', handleRemoteDelete)
    }, [threadSelection, setThreadSelection])

    // ── Auto-scroll chat ──
    React.useEffect(() => {
        if (feedScrollRef.current) feedScrollRef.current.scrollTo({ top: feedScrollRef.current.scrollHeight, behavior: "smooth" })
    }, [messages])

    // ── Auto-clear Toasts ──
    React.useEffect(() => {
        if (toasts.length > 0) {
            const timer = setTimeout(() => {
                setToasts(prev => prev.slice(1));
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [toasts]);

    return {
        onboardingChecked,
        onboardingComplete,
        firstName,
        onboardingOpen,
        setOnboardingOpen,
        messages,
        setMessages,
        input,
        setInput,
        isLoading,
        sendMessage,
        settingsOpen,
        setSettingsOpen,
        guidelinesOpen,
        setGuidelinesOpen,
        diagnosticsOpen,
        setDiagnosticsOpen,
        diagnosticsLogs,
        activeAttachment,
        setActiveAttachment,
        activeEmailId,
        setActiveEmailId,
        queueOpen,
        setQueueOpen,
        workingStatus,
        showSyncWidget,
        setShowSyncWidget,
        refreshTrigger,
        setRefreshTrigger,
        toasts,
        seenDemoIds,
        handleNavigate,
        handleMainClick,
        handleThreadSelect,
        feedScrollRef,
    }
}
