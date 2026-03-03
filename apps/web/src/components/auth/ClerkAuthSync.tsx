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
    const { isSignedIn } = useAuth()

    useEffect(() => {
        // We no longer interval-sync tokens to localStorage here!
        // The API interceptors dynamically await window.Clerk.session.getToken()
        // right before EVERY request. This completely eliminates the 60s
        // expiry mismatch bug.

        if (!isSignedIn) {
            localStorage.removeItem("clerk_token")
        }
    }, [isSignedIn])

    return null
}
