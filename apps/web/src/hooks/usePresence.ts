"use client"

import * as React from "react"
import { useSystemStore } from "@/lib/aaliyah/store"
import type { PresenceState } from "@/components/aaliyah/workspace/left/PresenceBadge"

export function usePresence() {
    const { status, lastSync } = useSystemStore()

    const lastSyncMs = React.useMemo(() => {
        const values = [lastSync?.gmail, lastSync?.calendar].filter(Boolean) as string[]
        const parsed = values.map((value) => Date.parse(value)).filter((n) => Number.isFinite(n))
        return parsed.length > 0 ? Math.max(...parsed) : null
    }, [lastSync?.calendar, lastSync?.gmail])

    return React.useMemo<PresenceState>(() => {
        if (status === "thinking" || status === "acting") return "working"
        if (status === "error") return "idle"
        if (!lastSyncMs) return "idle"
        const isFresh = Date.now() - lastSyncMs < 15 * 60 * 1000
        return isFresh ? "online" : "idle"
    }, [lastSyncMs, status])
}
