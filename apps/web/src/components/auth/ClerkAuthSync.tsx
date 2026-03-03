"use client"

import { useAuth } from "@clerk/nextjs"
import { useEffect, useRef } from "react"

/**
 * Bridges Clerk's session token into localStorage so the
 * existing axios interceptors (api.ts → withAuth) can pick it up.
 *
 * Mounted inside ClerkProvider → runs on every render/auth-state change.
 * Refreshes the token every 50 seconds (Clerk tokens expire in ~60s).
 */
export function ClerkAuthSync() {
    const { getToken, isSignedIn } = useAuth()
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

    useEffect(() => {
        async function syncToken() {
            if (!isSignedIn) {
                localStorage.removeItem("clerk_token")
                return
            }
            try {
                const token = await getToken()
                if (token) {
                    localStorage.setItem("clerk_token", token)
                }
            } catch {
                // Token fetch failed — Clerk will handle re-auth
            }
        }

        // Sync immediately
        syncToken()

        // Refresh every 50 seconds (Clerk tokens expire in ~60s)
        intervalRef.current = setInterval(syncToken, 50_000)

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current)
        }
    }, [getToken, isSignedIn])

    return null // Invisible component — just syncs the token
}
