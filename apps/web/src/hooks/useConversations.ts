"use client"

import * as React from "react"
import { useSystemStore } from "@/lib/aaliyah/store"
import type { ConversationSummary } from "@/components/aaliyah/workspace/types"

export function useConversations() {
    const {
        inboxItems,
        connectionHealth,
        lastSync,
        activeTriageQueue
    } = useSystemStore()

    return React.useMemo<ConversationSummary[]>(() => {
        let filteredItems = inboxItems

        // Noise Cleaning: Always exclude Cleaned/Newsletter from standard queues
        const excludeNoise = (item: any) =>
            item.category !== "cleaned" && item.category !== "newsletter";

        if (activeTriageQueue === "priority") {
            filteredItems = filteredItems.filter(i => i.priority === "urgent" || i.priority === "high")
        } else if (activeTriageQueue === "needs_reply") {
            filteredItems = filteredItems.filter(i => i.category === "needs_reply")
        } else if (activeTriageQueue === "approvals") {
            filteredItems = filteredItems.filter(i => !!i.requires_approval)
        } else if (activeTriageQueue === "follow_ups") {
            filteredItems = filteredItems.filter(i => i.category === "fyi" || i.category === "followup")
        } else if (activeTriageQueue === "all") {
            filteredItems = filteredItems.filter(excludeNoise)
        }

        const items = filteredItems.map(item => ({
            id: item.id,
            title: item.subject || "No Subject",
            subtitle: item.snippet,
            timestamp: item.received_at ? new Date(item.received_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: (item.requires_approval ? "Waiting Approval" : "Shadow Mode") as ConversationSummary["status"],
            labels: item.labels || []
        }))

        // Truth Gating for Briefing Tab
        const isEmailAccessible = connectionHealth?.email_health?.status === 'OK'
        const hasSyncSuccess = lastSync?.gmail !== null
        const hasData = items.length > 0 || (lastSync?.gmail !== null && items.length === 0)

        const showBriefing = isEmailAccessible && hasSyncSuccess && hasData

        if (!showBriefing) {
            return items
        }

        return [
            {
                id: "morning-briefing",
                title: "Morning Briefing",
                subtitle: "Daily executive context",
                timestamp: lastSync?.gmail ? new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(lastSync.gmail)) : "Today",
                status: "Shadow Mode" as any,
            },
            ...items
        ]
    }, [inboxItems, connectionHealth, lastSync, activeTriageQueue])
}
