/**
 * Centralized fetch wrapper with automatic 401 handling.
 * 
 * Drop-in replacement for `fetch()` that:
 * 1. Injects Authorization + x-workspace-id headers automatically
 * 2. Triggers the AuthErrorOverlay on 401 responses
 * 
 * Usage: Replace `fetch(url, opts)` with `authFetch(url, opts)`
 */

import { readLocalStorage, WORKSPACE_KEYS, handleUnauthorized } from "./api"

export async function authFetch(
    input: RequestInfo | URL,
    init?: RequestInit
): Promise<Response> {
    // 1. Inject auth headers
    const headers = new Headers(init?.headers)

    // Get fresh Clerk token if available
    let token: string | null = null
    if (typeof window !== "undefined" && (window as any).Clerk?.session) {
        try {
            token = await (window as any).Clerk.session.getToken()
        } catch {
            // Fallback below
        }
    }
    if (!token) {
        token = readLocalStorage(["auth_token", "clerk_token", "__session"])
    }

    const workspaceId = readLocalStorage(WORKSPACE_KEYS)

    if (token && !headers.has("Authorization")) {
        headers.set("Authorization", `Bearer ${token}`)
    }
    if (workspaceId && !headers.has("x-workspace-id")) {
        headers.set("x-workspace-id", workspaceId)
    }
    // CSRF protection: custom header required by the API middleware
    headers.set("X-Zroky-CSRF", "1")

    // 2. Execute request
    const response = await fetch(input, { ...init, headers })

    // 3. Global 401 handler
    if (response.status === 401) {
        handleUnauthorized()
    }

    return response
}
