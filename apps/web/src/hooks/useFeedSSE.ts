"use client"

import * as React from "react"
import { useSystemStore } from "@/lib/aaliyah/store"
import { handleUnauthorized } from "@/lib/aaliyah/api"

interface UseFeedSSEProps {
    onboardingComplete?: boolean
    onboardingChecked?: boolean
    setMessages?: React.Dispatch<React.SetStateAction<any[]>>
    setRefreshTrigger?: React.Dispatch<React.SetStateAction<number>>
    fetchHealth?: () => Promise<any>
    onMessage?: (data: any) => void
}

export function useFeedSSE({
    onboardingComplete = true,
    onboardingChecked = true,
    setMessages,
    setRefreshTrigger,
    fetchHealth,
    onMessage
}: UseFeedSSEProps) {
    const { setIsLiveOffline } = useSystemStore()

    // [Audit Fix] Stabilize callbacks via refs to prevent SSE connection resets on parent re-renders or thread switches
    const callbacks = React.useRef({ setMessages, setRefreshTrigger, fetchHealth, onMessage })
    React.useEffect(() => {
        callbacks.current = { setMessages, setRefreshTrigger, fetchHealth, onMessage }
    }, [setMessages, setRefreshTrigger, fetchHealth, onMessage])

    React.useEffect(() => {
        if (!onboardingComplete || !onboardingChecked) return

        let controller: AbortController | null = null
        let alive = true
        let retryDelay = 1000 // Start at 1s
        const MAX_RETRY_DELAY = 30000 // Cap at 30s
        let retryTimer: ReturnType<typeof setTimeout> | null = null
        let watchdogTimer: ReturnType<typeof setTimeout> | null = null
        const WATCHDOG_TIMEOUT = 45000 // 45s (server pings every 20s)

        const resetWatchdog = () => {
            if (watchdogTimer) clearTimeout(watchdogTimer)
            watchdogTimer = setTimeout(() => {
                if (alive) {
                    console.warn("[SSE] Watchdog timeout: No activity for 45s. Reconnecting...")
                    setIsLiveOffline(true)
                    if (controller) controller.abort()
                    // fetch-event-source onerror might trigger, or we trigger it via scheduleRetry
                    scheduleRetry()
                }
            }, WATCHDOG_TIMEOUT)
        }

        const scheduleRetry = () => {
            if (!alive) return
            if (retryTimer) clearTimeout(retryTimer)
            if (watchdogTimer) clearTimeout(watchdogTimer)

            console.log(`[SSE] Reconnecting in ${retryDelay / 1000}s...`)
            retryTimer = setTimeout(() => {
                if (alive) connect()
            }, retryDelay)
            retryDelay = Math.min(retryDelay * 2, MAX_RETRY_DELAY)
        }

        const connect = async () => {
            if (!alive) return

            // Cleanup previous controller if it exists
            if (controller) controller.abort()
            if (watchdogTimer) clearTimeout(watchdogTimer)

            try {
                const { getLiveToken } = await import("@/lib/aaliyah/api")
                const token = await getLiveToken()
                if (!alive) return

                const { fetchEventSource } = await import("@microsoft/fetch-event-source")
                controller = new AbortController()

                const lastId = window.sessionStorage.getItem("aaliyah_last_event_id")
                const headers: Record<string, string> = {
                    'Authorization': `Bearer ${token}`
                }
                if (lastId) {
                    headers['Last-Event-ID'] = lastId
                }

                console.log(`[SSE] Connecting to live stream (lastId: ${lastId || 'none'})...`)

                resetWatchdog() // Start watchdog on connect attempt

                await fetchEventSource(`/api/v1/aaliyah/live/stream`, {
                    method: 'GET',
                    headers,
                    signal: controller.signal,
                    openWhenHidden: true,
                    onopen: async (res) => {
                        if (res.ok && res.status === 200) {
                            console.log(`[SSE] Connection established.`)
                            setIsLiveOffline(false)
                            retryDelay = 1000 // Reset backoff on successful connect
                            resetWatchdog()
                        } else if (res.status === 401) {
                            const { handleUnauthorized } = await import("@/lib/aaliyah/api")
                            handleUnauthorized()
                            throw new Error("Unauthorized")
                        } else if (res.status >= 400 && res.status < 500 && res.status !== 429) {
                            setIsLiveOffline(true)
                            throw new Error(`Client error: ${res.status}`)
                        }
                    },
                    onerror: (err) => {
                        console.error(`[SSE] Connection error:`, err)
                        setIsLiveOffline(true)
                        throw err // Trigger retry logic
                    },
                    onmessage: (event) => {
                        resetWatchdog() // Activity detected

                        if (event.event === "ping") {
                            // Server-sent heartbeat
                            return
                        }

                        if (event.id) {
                            window.sessionStorage.setItem("aaliyah_last_event_id", event.id)
                        }

                        try {
                            const data = JSON.parse(event.data)

                            // Custom callback
                            if (callbacks.current.onMessage) {
                                callbacks.current.onMessage(data)
                            }

                            // Handle proactive assistant messages
                            if (data.type === "assistant_message") {
                                const msgThreadId = data.payload?.thread_id;
                                const activeThreadId = useSystemStore.getState().threadSelection?.id;

                                if (!activeThreadId || msgThreadId === activeThreadId) {
                                    const assistantMsg = {
                                        id: `proactive_${Date.now()}`,
                                        role: "assistant" as const,
                                        content: data.message || data.payload?.text || "",
                                        threadId: msgThreadId
                                    }
                                    if (callbacks.current.setMessages) callbacks.current.setMessages(prev => [...prev, assistantMsg])
                                }
                            }

                            // Handle update events
                            if (data.type === "update" || data.type === "thread_updated" || data.type === "thread_moved" || data.type === "sync_complete") {
                                if (callbacks.current.setRefreshTrigger) callbacks.current.setRefreshTrigger(t => t + 1)
                                if (callbacks.current.fetchHealth) callbacks.current.fetchHealth().catch(() => { })

                                // Direct store updates for components using useSystemStore
                                const state = useSystemStore.getState()
                                if (state.fetchStatus) state.fetchStatus().catch(() => { })
                                if (state.fetchInbox) state.fetchInbox().catch(() => { })
                            }

                            // Handle two-way sync deletion
                            if (data.type === "message_deleted") {
                                if (callbacks.current.setRefreshTrigger) callbacks.current.setRefreshTrigger(t => t + 1)
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
                                if (callbacks.current.setMessages) callbacks.current.setMessages(prev => [...prev, arrivalItem])
                            }

                            // Handle auto-followup nudges
                            if (data.type === "followup_nudge") {
                                const nudgeItem = {
                                    id: `nudge_${data.payload.thread_id}_${Date.now()}`,
                                    role: "assistant" as const,
                                    content: `📌 **Follow-up needed**: "${data.payload.subject || 'No subject'}" from ${data.payload.sender || 'Unknown'} hasn't received a reply. Want me to draft a nudge?`,
                                    threadId: data.payload.thread_id,
                                }
                                if (callbacks.current.setMessages) callbacks.current.setMessages(prev => [...prev, nudgeItem])
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
                                if (callbacks.current.setMessages) callbacks.current.setMessages(prev => [...prev, draftItem])
                            }

                            // Handle briefing ready
                            if (data.type === "briefing_ready") {
                                if (typeof window !== "undefined") {
                                    window.dispatchEvent(
                                        new CustomEvent("aaliyah:briefing_ready", { detail: data.payload })
                                    )
                                }
                            }

                            // Handle compose action
                            if (data.type === "compose_action") {
                                const openCompose = useSystemStore.getState().openCompose
                                if (openCompose) openCompose(data.payload)
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

                // [Audit Fix] If fetchEventSource completes naturally (e.g. server-side close), trigger reconnection
                if (alive) {
                    console.log(`[SSE] Connection closed naturally. Reconnecting...`)
                    scheduleRetry()
                }
            } catch (err) {
                if (alive) {
                    console.warn(`[SSE] Connection failed:`, err)
                    setIsLiveOffline(true)
                    scheduleRetry()
                }
            }
        }

        const handleOnline = () => {
            if (alive) {
                console.log(`[SSE] Network restored. Immediate reconnection triggered.`)
                retryDelay = 1000
                connect()
            }
        }

        window.addEventListener('online', handleOnline)
        connect()

        return () => {
            alive = false
            window.removeEventListener('online', handleOnline)
            if (retryTimer) clearTimeout(retryTimer)
            if (watchdogTimer) clearTimeout(watchdogTimer)
            if (controller) controller.abort()
        }
    }, [onboardingComplete, onboardingChecked, setIsLiveOffline])
}
