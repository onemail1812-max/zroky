"use client"

import * as React from "react"
import { Loader2, RefreshCw, Send, Tag, Archive, Clock, Activity } from "lucide-react"
import { getActions, ActionLogItem } from "@/lib/aaliyah/api"
import { Button } from "@/components/aaliyah/ui/Button"
import { EmptyState } from "@/components/ui/EmptyState"
import { SkeletonCard } from "@/components/ui/Skeleton"
import { cn } from "@/lib/utils"

export function ActionLog() {
    const [loading, setLoading] = React.useState(true)
    const [actions, setActions] = React.useState<ActionLogItem[]>([])
    const [error, setError] = React.useState<string | null>(null)

    React.useEffect(() => {
        loadActions()
    }, [])

    async function loadActions() {
        try {
            setLoading(true)
            const data = await getActions(50)
            setActions(data.items || [])
        } catch (err) {
            console.error(err)
            setError("Failed to load actions.")
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                    <div className="space-y-2">
                        <div className="h-6 w-32 bg-zinc-200 rounded animate-pulse" />
                        <div className="h-4 w-48 bg-zinc-100 rounded animate-pulse" />
                    </div>
                </div>
                <div className="space-y-4">
                    <SkeletonCard lines={2} />
                    <SkeletonCard lines={2} />
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold tracking-tight">Activity Log</h2>
                    <p className="text-sm text-zinc-500 mt-1">Recent autonomous actions performed by Aaliyah.</p>
                </div>
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={loadActions}
                    aria-label="Refresh activity log"
                >
                    <RefreshCw className="h-4 w-4" />
                </Button>
            </div>

            <div className="space-y-4 relative pl-4 border-l border-zinc-200 ml-2">
                {actions.map((action, i) => (
                    <div key={action.id} className="relative pl-6 pb-2">
                        {/* Dot */}
                        <div
                            aria-hidden="true"
                            className={cn(
                                "absolute -left-[21px] top-1 h-3 w-3 rounded-full border-2 border-white ring-1 ring-zinc-200",
                                action.type === "auto_send" ? "bg-green-500" :
                                    action.type === "label" ? "bg-violet-500" :
                                        "bg-zinc-400"
                            )}
                        />

                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2 text-sm font-medium">
                                {action.type === "auto_send" && <Send className="h-3 w-3 text-green-600" />}
                                {action.type === "label" && <Tag className="h-3 w-3 text-violet-600" />}
                                {action.type === "archive" && <Archive className="h-3 w-3 text-zinc-600" />}

                                <span className="capitalize">{action.type.replace("_", "-")}</span>
                                <span className="text-zinc-400 font-normal text-xs ml-auto">
                                    {new Date(action.created_at).toLocaleString()}
                                </span>
                            </div>

                            <p className="text-sm text-zinc-600">
                                {action.explain || "Action performed autonomously."}
                            </p>

                            {/* Detailed Info */}
                            {action.type === "auto_send" && (action.details.subject || action.details.draft_subject) && (
                                <div className="text-xs bg-green-50 text-green-800 p-2 rounded border border-green-100 mt-1 inline-block">
                                    Subject: {action.details.subject || action.details.draft_subject}
                                </div>
                            )}
                            {action.type === "label" && action.details.label && (
                                <div className="text-xs bg-violet-50 text-violet-800 p-2 rounded border border-violet-100 mt-1 inline-block">
                                    Applied: {action.details.label}
                                </div>
                            )}

                        </div>
                    </div>
                ))}

                {actions.length === 0 && (
                    <div className="rounded-2xl border border-zinc-200/60 bg-white/50 overflow-hidden shadow-sm mt-8">
                        <EmptyState
                            icon={Activity}
                            title="No Recent Activity"
                            description="Aaliyah hasn't performed any autonomous actions recently."
                        />
                    </div>
                )}
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
    )
}
