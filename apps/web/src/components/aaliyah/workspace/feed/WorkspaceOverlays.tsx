"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { useSystemStore } from "@/lib/aaliyah/store"

const AuthErrorOverlay = React.lazy(() => import('./AuthErrorOverlay').then(m => ({ default: m.AuthErrorOverlay })))
const SettingsOverlay = React.lazy(() => import('./SettingsOverlay').then(m => ({ default: m.SettingsOverlay })))
const OnboardingOverlay = React.lazy(() => import('./OnboardingOverlay').then(m => ({ default: m.OnboardingOverlay })))
const DiagnosticsOverlay = React.lazy(() => import('./DiagnosticsOverlay').then(m => ({ default: m.DiagnosticsOverlay })))
const ComposeModal = React.lazy(() => import('./ComposeModal').then(m => ({ default: m.ComposeModal })))

interface WorkspaceOverlaysProps {
    settingsOpen: boolean
    onCloseSettings: () => void
    onboardingOpen: boolean
    onCloseOnboarding: () => void
    onOnboardingComplete: () => void
    diagnosticsOpen: boolean
    onCloseDiagnostics: () => void
    diagnosticsLogs: string
}

/**
 * Portal-rendered overlay stack (settings, onboarding, diagnostics, compose).
 */
export function WorkspaceOverlays({
    settingsOpen,
    onCloseSettings,
    onboardingOpen,
    onCloseOnboarding,
    onOnboardingComplete,
    diagnosticsOpen,
    onCloseDiagnostics,
    diagnosticsLogs,
}: WorkspaceOverlaysProps) {
    const [isMounted, setIsMounted] = React.useState(false)

    React.useEffect(() => {
        setIsMounted(true)
    }, [])

    if (!isMounted || typeof document === 'undefined') return null

    return createPortal(
        <React.Suspense fallback={null}>
            <AuthErrorOverlay />
            <SettingsOverlay isOpen={settingsOpen} onClose={onCloseSettings} />
            <OnboardingOverlay
                isOpen={onboardingOpen}
                onClose={onCloseOnboarding}
                onComplete={onOnboardingComplete}
            />
            <DiagnosticsOverlay isOpen={diagnosticsOpen} onClose={onCloseDiagnostics} logs={diagnosticsLogs} />
            <ComposeModal
                isOpen={useSystemStore(state => state.isComposeOpen)}
                onClose={() => useSystemStore.getState().closeCompose()}
            />
        </React.Suspense>,
        document.body
    )
}
