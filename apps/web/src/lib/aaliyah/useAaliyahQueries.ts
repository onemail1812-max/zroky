"use client"

import { useQuery } from "@tanstack/react-query"
import { getStatus, getCounts } from "@/lib/aaliyah/api"
import { useSystemStore } from "@/lib/aaliyah/store"

/**
 * React Query hooks that wrap Aaliyah API calls with aggressive caching.
 * These sit on top of the existing Zustand store, syncing fetched data back
 * into global state so existing consumers keep working.
 */

export function useHealthQuery(enabled = true) {
    const fetchHealth = useSystemStore((s) => s.fetchHealth)
    return useQuery({
        queryKey: ["aaliyah", "health"],
        queryFn: () => fetchHealth(),
        enabled,
        staleTime: 60_000,       // 1 minute
        refetchInterval: 120_000, // 2 minutes
    })
}

export function useStatusQuery(enabled = true) {
    return useQuery({
        queryKey: ["aaliyah", "status"],
        queryFn: async () => {
            const [status, counts] = await Promise.all([getStatus(), getCounts()])
            return { status, counts }
        },
        enabled,
        staleTime: 15_000,       // 15 seconds
        refetchInterval: 60_000,  // 1 minute
    })
}

export function useInboxQuery(queue?: string, enabled = true) {
    const fetchInbox = useSystemStore((s) => s.fetchInbox)
    return useQuery({
        queryKey: ["aaliyah", "inbox", queue ?? "all"],
        queryFn: () => fetchInbox(queue),
        enabled,
        staleTime: 30_000,       // 30 seconds
        refetchInterval: 120_000, // 2 minutes
    })
}
