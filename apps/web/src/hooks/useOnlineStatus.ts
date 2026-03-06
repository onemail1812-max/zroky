"use client"

import { useState, useEffect } from "react"
import { useSystemStore } from "@/lib/aaliyah/store"

/**
 * Hook to track both browser online status and Aaliyah Core backend availability.
 */
export function useOnlineStatus() {
    const [isBrowserOnline, setIsBrowserOnline] = useState(
        typeof window !== "undefined" ? navigator.onLine : true
    )

    // Get backend connectivity from the system store
    const isBackendConnected = useSystemStore((state) => state.isBackendConnected)
    const isLiveOffline = useSystemStore((state) => state.isLiveOffline)

    useEffect(() => {
        if (typeof window === "undefined") return

        const handleOnline = () => setIsBrowserOnline(true)
        const handleOffline = () => setIsBrowserOnline(false)

        window.addEventListener("online", handleOnline)
        window.addEventListener("offline", handleOffline)

        return () => {
            window.removeEventListener("online", handleOnline)
            window.removeEventListener("offline", handleOffline)
        }
    }, [])

    return {
        isOnline: isBrowserOnline,
        isBackendConnected: isBackendConnected && !isLiveOffline,
        isFullyConnected: isBrowserOnline && isBackendConnected && !isLiveOffline
    }
}
