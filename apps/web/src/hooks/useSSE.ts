"use client"

import * as React from "react"
import { useSystemStore } from "@/lib/aaliyah/store"

export function useSSE() {
    const {
        setIsLiveOffline,
        fetchStatus,
        fetchInbox,
        addLog,
        openCompose
    } = useSystemStore()

    React.useEffect(() => {
        let es: EventSource | null = null
        let alive = true
        let retryDelay = 2000 // Start at 2s
        const MAX_RETRY_DELAY = 30000 // Cap at 30s
        let heartbeatTimer: ReturnType<typeof setInterval> | null = null

        const connect = async () => {
            if (!alive) return

            try {
                const { getLiveToken } = await import("@/lib/aaliyah/api")
                const token = await getLiveToken()
                if (!alive) return

                const lastId = window.sessionStorage.getItem("aaliyah_last_event_id")

                // SSE must connect directly to the API backend — Next.js rewrites don't support streaming
                const apiBase = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
                    ? 'http://localhost:8000'
                    : ''
                const url = `${apiBase}/api/v1/aaliyah/live/stream?stream_token=${token}` + (lastId ? `&last_event_id=${lastId}` : "")

                es = new EventSource(url)

                es.onopen = () => {
                    setIsLiveOffline(false)
                    retryDelay = 2000 // Reset on success
                    console.log("SSE: Connected")
                }

                es.onerror = () => {
                    setIsLiveOffline(true)
                    if (es) {
                        es.close()
                        es = null
                    }

                    if (alive) {
                        // Exponential backoff with jitter
                        const jitter = Math.random() * 1000
                        const delay = Math.min(retryDelay + jitter, MAX_RETRY_DELAY)
                        retryDelay = Math.min(retryDelay * 2, MAX_RETRY_DELAY)

                        console.warn(`SSE: Connection failed. Retrying in ${Math.round(delay)}ms...`)
                        setTimeout(() => void connect(), delay)
                    }
                }

                es.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data)

                        if (data.id) {
                            window.sessionStorage.setItem("aaliyah_last_event_id", data.id)
                        }

                        if (data.type === "update" || data.type === "thread_updated" || data.type === "thread_moved") {
                            void fetchStatus()
                            void fetchInbox()
                        }

                        if (data.type === "briefing_ready") {
                            window.dispatchEvent(
                                new CustomEvent("aaliyah:briefing_ready", { detail: data.payload })
                            )
                        }

                        if (data.type === "compose_action") {
                            openCompose(data.payload)
                        }

                        if (data.message) {
                            addLog(data.type, data.message)
                        }
                    } catch (e) {
                        console.error("SSE: Message parsing error", e)
                    }
                }

                // Heartbeat: detect silent disconnects every 30s
                if (heartbeatTimer) clearInterval(heartbeatTimer)
                heartbeatTimer = setInterval(() => {
                    if (es && es.readyState === EventSource.CLOSED) {
                        setIsLiveOffline(true)
                        es.close()
                        void connect()
                    }
                }, 30000)

            } catch (err) {
                console.error("SSE: Token fetch failed", err)
                if (alive) {
                    setTimeout(() => void connect(), retryDelay)
                    retryDelay = Math.min(retryDelay * 2, MAX_RETRY_DELAY)
                }
            }
        }

        void connect()

        return () => {
            alive = false
            if (es) es.close()
            if (heartbeatTimer) clearInterval(heartbeatTimer)
        }
    }, [setIsLiveOffline, fetchStatus, fetchInbox, addLog, openCompose])
}
