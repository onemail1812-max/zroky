
"use client"

import * as React from "react"
import { AlertTriangle, CheckCircle, RefreshCw, Settings, ShieldAlert, WifiOff, Mail, Calendar } from "lucide-react"

import { trackEvent, AnalyticsEvents } from "@/lib/analytics"
import { useSystemStore } from "@/lib/aaliyah/store"
import { connectorService, ConnectedAccount } from "@/services/connector.service"
import { getConnectionMessage } from "@/lib/aaliyah/connection-messages"
import { cn } from "@/lib/utils"

export function PreFlightPanel() {
    const { connectionHealth, isBackendConnected, fetchHealth } = useSystemStore()
    const [accounts, setAccounts] = React.useState<ConnectedAccount[]>([])
    const [loading, setLoading] = React.useState(false)

    // Fetch accounts for selector
    React.useEffect(() => {
        connectorService.listAccounts().then(setAccounts)
    }, [])

    // Analytics: Track Preflight Result
    React.useEffect(() => {
        if (connectionHealth) {
            trackEvent(AnalyticsEvents.PREFLIGHT_CHECK_RESULT, {
                email: connectionHealth.email_health?.status,
                calendar: connectionHealth.calendar_health?.status,
                email_code: connectionHealth.email_health?.error_code,
                calendar_code: connectionHealth.calendar_health?.error_code
            })
        }
    }, [connectionHealth])

    if (!isBackendConnected) {
        return (
            <div className="bg-errorBlocked text-white px-4 py-3 flex items-center justify-center gap-3 animate-in slide-in-from-top">
                <WifiOff className="h-4 w-4" />
                <span className="font-medium text-sm">System Offline — Reconnecting to Brain...</span>
            </div>
        )
    }

    if (!connectionHealth) return null

    const emailMsg = getConnectionMessage(connectionHealth.email_health, "Email")
    const calMsg = getConnectionMessage(connectionHealth.calendar_health, "Calendar")

    // Overall State Logic
    const allGood = emailMsg.badge === "success" && calMsg.badge === "success"
    const hasError = emailMsg.badge === "error" || calMsg.badge === "error"
    const hasWarning = emailMsg.badge === "warning" || calMsg.badge === "warning"

    const headerTitle = emailMsg.title
    const headerDesc = emailMsg.description

    const handleAction = async (action?: string) => {
        if (!action) return

        trackEvent(AnalyticsEvents.CTA_CLICKED, { action })

        setLoading(true)
        try {
            if (action === "connect" || action === "reconnect" || action === "update_scopes") {
                window.location.href = "/settings/integrations"
            }
            if (action === "retry") {
                await fetchHealth()
                trackEvent(AnalyticsEvents.HEALTH_RECOVERED, { method: 'retry' })
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="border-b border-borderSubtle bg-surface">
            <div className="max-w-5xl mx-auto px-4 py-4">

                {/* Header Section */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            "h-8 w-8 rounded-full flex items-center justify-center",
                            allGood ? "bg-green-100 text-green-700" :
                                hasError ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                        )}>
                            {allGood ? <CheckCircle className="h-5 w-5" /> :
                                hasError ? <ShieldAlert className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold text-textPrimary">
                                {headerTitle}
                            </h2>
                            <p className="text-xs text-textSecondary">
                                {headerDesc}
                            </p>
                        </div>
                    </div>

                    {/* Primary Selector (Story B3) */}
                    {accounts.length > 0 && (
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-textSecondary">Primary Inbox:</span>
                            <select
                                className="text-xs border border-borderSubtle rounded px-2 py-1 bg-surface"
                                disabled
                                // Disabled for Sprint 1, ensuring user sees we detected it
                                value={accounts.find(a => a.isPrimary)?.id || accounts[0]?.id}
                            >
                                {accounts.map(acc => (
                                    <option key={acc.id} value={acc.id}>
                                        {acc.email} ({acc.provider})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                {/* Rows */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Email Row */}
                    <StatusCard
                        icon={<Mail className="h-4 w-4" />}
                        label="Email"
                        item={connectionHealth.email_health}
                        msg={emailMsg}
                        onAction={handleAction}
                        loading={loading}
                    />

                    {/* Calendar Row */}
                    <StatusCard
                        icon={<Calendar className="h-4 w-4" />}
                        label="Calendar"
                        item={connectionHealth.calendar_health}
                        msg={calMsg}
                        onAction={handleAction}
                        loading={loading}
                    />
                </div>

            </div>
        </div>
    )
}

function StatusCard({ icon, label, item, msg, onAction, loading }: any) {
    const isError = msg.badge === "error"
    const isWarning = msg.badge === "warning"
    const isSuccess = msg.badge === "success"

    return (
        <div className={cn(
            "flex items-center justify-between p-3 rounded-lg border",
            isError ? "bg-red-50/50 border-red-100" :
                isWarning ? "bg-amber-50/50 border-amber-100" :
                    "bg-surfaceElevated border-borderSubtle"
        )}>
            <div className="flex items-center gap-3">
                <div className={cn("text-textSecondary", isError && "text-red-600", isWarning && "text-amber-600", isSuccess && "text-green-600")}>
                    {icon}
                </div>
                <div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-textPrimary">{label}</span>
                        {item.provider && (
                            <span className="text-[10px] uppercase tracking-wider text-textMuted bg-surface px-1.5 py-0.5 rounded border border-borderSubtle">
                                {item.provider}
                            </span>
                        )}
                    </div>
                    <p className={cn("text-xs", isError ? "text-red-700" : isWarning ? "text-amber-700" : "text-textSecondary")}>
                        {msg.title}
                    </p>
                </div>
            </div>

            {msg.ctaLabel && (
                <button
                    onClick={() => onAction(msg.ctaAction)}
                    disabled={loading}
                    className={cn(
                        "text-xs font-medium px-3 py-1.5 rounded transition-colors",
                        isError ? "bg-red-100 text-red-700 hover:bg-red-200" :
                            isWarning ? "bg-amber-100 text-amber-800 hover:bg-amber-200" :
                                "bg-surface text-textPrimary border border-borderSubtle hover:bg-surfaceElevated"
                    )}
                >
                    {loading ? <RefreshCw className="h-3 w-3 animate-spin" /> : msg.ctaLabel}
                </button>
            )}

            {!msg.ctaLabel && isSuccess && (
                <div className="text-green-600 text-xs font-medium flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Synced
                </div>
            )}
        </div>
    )
}
