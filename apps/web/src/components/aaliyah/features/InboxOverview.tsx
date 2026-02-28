"use client"

import * as React from "react"
import { AlertTriangle, Inbox, RefreshCw, FileText, Send, Edit, X } from "lucide-react"
import { getInbox, getCalendarConflicts, syncInbox, syncCalendar, sendDraft, getUpcomingMeetings, getEventPrep } from "@/lib/aaliyah/api"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/aaliyah/ui/Card"
import { Button } from "@/components/aaliyah/ui/Button"
import { Chip } from "@/components/aaliyah/ui/Chip"
import { cn } from "@/lib/utils"
import { useSystemStore } from "@/lib/aaliyah/store"
import { SkeletonEmail } from "@/components/ui/Skeleton"

type InboxFeedItem = {
    id: string
    provider: string
    sender?: string | null
    subject?: string | null
    snippet?: string
    received_at?: string | null
    category?: string
    labels?: string[]
    label_reasons?: Record<string, string>
    draft?: {
        subject: string
        body: string
        rationale: string
        status: string
    } | null
}

type ConflictItem = {
    id: string
    explain?: string | null
    conflict_type?: string | null
    conflict_minutes?: number | null
    briefing?: {
        summary: string
        people_involved: string[]
        recommendation: string
        talking_points: string[]
    }
}

type UpcomingMeeting = {
    id: string
    title: string
    start_at: string
    end_at: string
    organizer?: string
    meeting_prep?: {
        summary: string
        people_involved: string[]
        recommendation: string
        talking_points: string[]
    }
}

export function InboxOverview() {
    const [inboxItems, setInboxItems] = React.useState<InboxFeedItem[]>([])
    const [conflicts, setConflicts] = React.useState<ConflictItem[]>([])
    const [upcoming, setUpcoming] = React.useState<UpcomingMeeting[]>([])
    const [loading, setLoading] = React.useState(true)
    const [syncing, setSyncing] = React.useState(false)
    const [sendingIds, setSendingIds] = React.useState<Set<string>>(new Set())
    const [generatingPrepIds, setGeneratingPrepIds] = React.useState<Set<string>>(new Set())

    const lastSync = useSystemStore(state => state.lastSync)

    React.useEffect(() => {
        fetchData()
    }, [lastSync])

    async function fetchData() {
        try {
            if (inboxItems.length === 0) setLoading(true)
            const [inbox, confs, ups] = await Promise.all([
                getInbox({ limit: 10 }),
                getCalendarConflicts(5),
                getUpcomingMeetings(5, 48)
            ])
            setInboxItems(Array.isArray(inbox?.items) ? (inbox.items as InboxFeedItem[]) : [])
            setConflicts(Array.isArray(confs?.conflicts) ? (confs.conflicts as ConflictItem[]) : [])
            setUpcoming(Array.isArray(ups?.items) ? (ups.items as UpcomingMeeting[]) : [])
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    async function handleSync() {
        setSyncing(true)
        try {
            // Trigger both syncs
            await Promise.all([
                syncInbox(),
                syncCalendar()
            ])
            // Wait a beat then refresh view
            setTimeout(fetchData, 1500)
        } catch (e) {
            console.error("Sync failed", e)
        } finally {
            setSyncing(false)
        }
    }

    async function handleSend(emailId: string) {
        setSendingIds(prev => new Set(prev).add(emailId))
        try {
            // Assume workspace ID is managed by token or context, or get from first item if needed.
            // For now, let's assume API client handles workspace context OR we pass undefined to let API resolve.
            // But sendDraft signature in api.ts requires workspaceId.
            // We can get it from localStorage or context. InboxFeedItem doesn't enforce it.
            // Hack: try reading form local storage or pass undefined if api.ts allows.
            // Checking api.ts sendDraft(workspaceId: string, emailId: string) -> string is mandatory.

            // We need a workspace ID. Let's grab it from local storage via a helper if possible, or assume user context.
            // The `api.ts` `withAuth` reads it. But the function `sendDraft` asks for it.
            // Let's pass a known workspace ID if we have it, or empty string and let interceptor handle if API allows.
            // Actually, let's change sendDraft to accept optional workspace Id in api.ts?
            // Already modified api.ts. It takes (workspaceId, emailId).
            // I'll assume we can get it from localStorage if not in component props.

            let wsId = ""
            if (typeof window !== "undefined") {
                wsId = window.localStorage.getItem("workspace_id") || window.localStorage.getItem("x_workspace_id") || "default"
            }

            await sendDraft(wsId, emailId)

            // Optimistic update
            setInboxItems(prev => prev.map(item => {
                if (item.id === emailId && item.draft) {
                    return { ...item, draft: { ...item.draft, status: "sent" } }
                }
                return item
            }))

        } catch (e) {
            console.error("Failed to send draft", e)
            alert("Failed to send email. Check console.")
        } finally {
            setSendingIds(prev => {
                const next = new Set(prev)
                next.delete(emailId)
                return next
            })
        }
    }

    async function handleGeneratePrep(eventId: string) {
        setGeneratingPrepIds(prev => new Set(prev).add(eventId))
        try {
            const data = await getEventPrep(eventId, true)
            if (data?.prep) {
                setUpcoming(prev => prev.map(item => {
                    if (item.id === eventId) {
                        return { ...item, meeting_prep: data.prep }
                    }
                    return item
                }))
            }
        } catch (e) {
            console.error("Failed to generate meeting prep", e)
            alert("Failed to generate meeting prep. Check console.")
        } finally {
            setGeneratingPrepIds(prev => {
                const next = new Set(prev)
                next.delete(eventId)
                return next
            })
        }
    }

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold tracking-tight">Intelligence Feed</h2>


            {/* Calendar Conflicts Alert */}
            {
                conflicts.length > 0 && (
                    <Card className="border-amber-200 bg-amber-50/50">
                        <CardHeader className="pb-2">
                            <CardTitle className="flex items-center text-amber-800 text-sm">
                                <AlertTriangle className="mr-2 h-4 w-4" />
                                {conflicts.length} Calendar Conflicts Detected
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {conflicts.map((c) => (
                                <div key={c.id} className="text-sm text-amber-900 border-b border-amber-200/50 pb-3 last:border-0 last:pb-0">
                                    <div className="flex justify-between font-medium">
                                        <span>{c.explain || "Calendar conflict detected."}</span>
                                        <span className="opacity-70 text-xs whitespace-nowrap ml-2">
                                            {typeof c.conflict_minutes === "number" ? `${c.conflict_minutes}m` : ""}
                                            {c.conflict_type ? ` ${c.conflict_type}` : ""}
                                        </span>
                                    </div>

                                    {c.briefing && (
                                        <div className="mt-2 text-xs bg-white/60 p-2 rounded border border-amber-100">
                                            <div className="font-semibold text-amber-800 mb-1">Aaliyah Recommendation:</div>
                                            <div className="mb-1">{c.briefing.recommendation}</div>
                                            {c.briefing.talking_points?.length > 0 && (
                                                <ul className="list-disc list-inside opacity-80 mt-1 space-y-0.5">
                                                    {c.briefing.talking_points.map((tp, i) => (
                                                        <li key={i}>{tp}</li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )
            }

            {/* Upcoming Briefings */}
            {
                upcoming.length > 0 && (
                    <Card className="border-blue-200 bg-blue-50/50">
                        <CardHeader className="pb-2">
                            <CardTitle className="flex items-center text-blue-800 text-sm">
                                <FileText className="mr-2 h-4 w-4" />
                                Upcoming Meetings
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {upcoming.map((u) => {
                                const isGenerating = generatingPrepIds.has(u.id);
                                return (
                                    <div key={u.id} className="text-sm text-blue-900 border-b border-blue-200/50 pb-3 last:border-0 last:pb-0">
                                        <div className="flex justify-between font-medium items-center">
                                            <span>{u.title}</span>
                                            <div className="flex items-center gap-2">
                                                {!u.meeting_prep && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-6 text-[10px] text-blue-700 hover:text-blue-900 hover:bg-blue-100 uppercase tracking-wider px-2"
                                                        onClick={() => handleGeneratePrep(u.id)}
                                                        disabled={isGenerating}
                                                    >
                                                        {isGenerating ? (
                                                            <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                                                        ) : (
                                                            <FileText className="mr-1 h-3 w-3" />
                                                        )}
                                                        {isGenerating ? "Preparing..." : "Brief Me"}
                                                    </Button>
                                                )}
                                                <span className="opacity-70 text-xs whitespace-nowrap ml-2">
                                                    {new Date(u.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-xs text-blue-700/80 mb-2">Organizer: {u.organizer || "Unknown"}</div>

                                        {u.meeting_prep && (
                                            <div className="bg-white/60 p-2 rounded border border-blue-100 text-xs animate-in fade-in duration-300">
                                                <div className="font-semibold text-blue-800 mb-1">Executive Summary:</div>
                                                <div className="mb-1 italic">{u.meeting_prep.summary}</div>

                                                {u.meeting_prep.recommendation && (
                                                    <div className="mt-2">
                                                        <span className="font-semibold text-blue-800">Strategy: </span>
                                                        {u.meeting_prep.recommendation}
                                                    </div>
                                                )}

                                                {u.meeting_prep.talking_points?.length > 0 && (
                                                    <div className="mt-2">
                                                        <div className="font-semibold text-blue-800 mb-0.5">Talking Points:</div>
                                                        <ul className="list-disc list-inside opacity-80 space-y-0.5">
                                                            {u.meeting_prep.talking_points.map((tp, i) => (
                                                                <li key={i}>{tp}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </CardContent>
                    </Card>
                )
            }

            {/* Recent Triaged Items */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Recent Triage</CardTitle>
                    <CardDescription>Latest analyzed messages from your inbox.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-0">
                    {loading && (
                        <div className="divide-y divide-zinc-100">
                            {[...Array(4)].map((_, i) => <SkeletonEmail key={i} />)}
                        </div>
                    )}

                    {!loading && inboxItems.length === 0 && (
                        <div className="p-8 text-center text-zinc-400 flex flex-col items-center">
                            <Inbox className="h-8 w-8 mb-2 opacity-50" />
                            <p>Inbox Zero. No pending items.</p>
                        </div>
                    )}

                    <div className="divide-y divide-zinc-100">
                        {inboxItems.map((item) => {
                            const labels = Array.isArray(item.labels) ? item.labels : []
                            const reasons = item.label_reasons || {}
                            const isSending = sendingIds.has(item.id)
                            const isSent = item.draft?.status === "sent"

                            return (
                                <div key={item.id} className="py-4 first:pt-0 last:pb-0">
                                    <div className="flex justify-between items-start mb-1">
                                        <div className="font-medium text-sm flex items-center gap-2">
                                            {item.sender || "Unknown sender"}
                                            {/* Provider Icon */}
                                            {item.provider === 'google' ? (
                                                <span className="text-[10px] text-zinc-400 bg-zinc-100 px-1 rounded">Gmail</span>
                                            ) : (
                                                <span className="text-[10px] text-zinc-400 bg-zinc-100 px-1 rounded">Outlook</span>
                                            )}
                                        </div>
                                        <span className="text-xs text-zinc-400 whitespace-nowrap">
                                            {item.received_at
                                                ? new Date(item.received_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                : ""}
                                        </span>
                                    </div>

                                    <div className="text-sm font-semibold text-zinc-900">{item.subject || "(No subject)"}</div>
                                    <div className="text-xs text-zinc-500 line-clamp-1 mt-0.5">{item.snippet || ""}</div>

                                    {/* Labels & Reasons */}
                                    {labels.length > 0 && (
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {labels.map((label: string) => (
                                                <div key={label} className="group relative">
                                                    <Chip variant="filled" size="sm" color={label === 'Urgent' ? 'red' : 'violet'}>
                                                        {label}
                                                    </Chip>
                                                    {/* Tooltip for Transparency */}
                                                    {reasons[label] && (
                                                        <div className="absolute bottom-full left-0 mb-2 w-max max-w-[200px] rounded bg-zinc-800 px-2 py-1 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100 shadow-lg pointer-events-none z-10">
                                                            {reasons[label]}
                                                            <div className="absolute top-full left-2 border-4 border-transparent border-t-zinc-800"></div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Primary Category Fallback */}
                                    {labels.length === 0 && item.category && (
                                        <div className="mt-2">
                                            <Chip variant="outline" size="sm">{item.category}</Chip>
                                        </div>
                                    )}
                                    {item.draft && (
                                        <div className={cn(
                                            "mt-3 flex flex-col gap-3 rounded-lg border border-violet-100 bg-violet-50/50 p-3 text-sm transition-all",
                                            isSent && "border-green-100 bg-green-50/50"
                                        )}>
                                            <div className="flex gap-3">
                                                <FileText className={cn("h-5 w-5 shrink-0", isSent ? "text-green-600" : "text-violet-600")} />
                                                <div className="space-y-1 flex-1">
                                                    <div className="flex items-center justify-between">
                                                        <div className={cn("font-semibold", isSent ? "text-green-900" : "text-violet-900")}>
                                                            {isSent ? "Reply Sent" : "Draft Prepared"}
                                                        </div>
                                                        {isSent && <span className="text-[10px] font-bold text-green-600 uppercase tracking-wider">Sent</span>}
                                                    </div>
                                                    <div className={cn("text-xs font-medium", isSent ? "text-green-700" : "text-violet-700")}>{item.draft.subject}</div>
                                                    <p className="text-zinc-600 line-clamp-3 text-xs leading-relaxed opacity-80 whitespace-pre-wrap">{item.draft.body}</p>
                                                    <p className={cn("pt-1 text-[10px] font-medium uppercase tracking-wider", isSent ? "text-green-400" : "text-violet-400")}>
                                                        Logic: {item.draft.rationale}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            {!isSent && (
                                                <div className="flex items-center justify-end gap-2 mt-1 border-t border-violet-200/50 pt-3">
                                                    <Button size="sm" variant="ghost" className="h-7 text-xs text-zinc-500 hover:text-zinc-900">
                                                        <X className="mr-1.5 h-3 w-3" />
                                                        Discard
                                                    </Button>
                                                    <Button size="sm" variant="ghost" className="h-7 text-xs text-violet-700 hover:text-violet-900 hover:bg-violet-100">
                                                        <Edit className="mr-1.5 h-3 w-3" />
                                                        Edit
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        className="h-7 text-xs bg-violet-600 hover:bg-violet-700 text-white"
                                                        onClick={() => handleSend(item.id)}
                                                        disabled={isSending}
                                                    >
                                                        {isSending ? (
                                                            <RefreshCw className="mr-1.5 h-3 w-3 animate-spin" />
                                                        ) : (
                                                            <Send className="mr-1.5 h-3 w-3" />
                                                        )}
                                                        Send Now
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </CardContent>
            </Card>
        </div >
    )
}
