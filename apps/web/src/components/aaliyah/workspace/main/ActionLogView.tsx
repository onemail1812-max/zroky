"use client"

import * as React from "react"
import { useSystemStore } from "@/lib/aaliyah/store"
import { Archive, Activity, Zap, CheckCircle2, Clock } from "lucide-react"

export function ActionLogView() {
    const { actionLogs } = useSystemStore()

    // Group logs by date
    const groupedLogs = React.useMemo(() => {
        const groups: Record<string, typeof actionLogs> = {}

        // Sort descending
        const sorted = [...actionLogs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

        sorted.forEach(log => {
            const date = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(log.timestamp))
            if (!groups[date]) groups[date] = []
            groups[date].push(log)
        })

        return groups
    }, [actionLogs])

    return (
        <div className="flex-1 h-full bg-white flex flex-col font-sans overflow-hidden">
            {/* Header */}
            <header className="shrink-0 h-16 border-b border-zinc-200/60 flex items-center justify-between px-6 bg-white/80 backdrop-blur-xl sticky top-0 z-20">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-xl bg-violet-100 flex items-center justify-center text-violet-600">
                        <Archive className="h-4 w-4" strokeWidth={2.5} />
                    </div>
                    <div>
                        <h1 className="text-[14px] font-bold text-zinc-900 tracking-tight">Action Log</h1>
                        <p className="text-[12px] text-zinc-500 font-medium">Historical interactions & memory</p>
                    </div>
                </div>
            </header>

            {/* Timeline */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-zinc-50/30">
                <div className="max-w-3xl mx-auto space-y-10">

                    {Object.keys(groupedLogs).length === 0 ? (
                        <EmptyState
                            icon={Archive}
                            title="No History Yet"
                            description="Aaliyah's memory will appear here as she processes your inbox, meetings, and instructions."
                            className="h-96"
                        />
                    ) : (
                        Object.entries(groupedLogs).map(([date, logs]) => (
                            <div key={date} className="relative">
                                {/* Date Header */}
                                <div className="sticky top-0 z-10 bg-zinc-50/90 backdrop-blur-sm py-2 mb-4 -mx-2 px-2">
                                    <h3 className="text-[11px] font-bold tracking-widest text-zinc-500 uppercase flex items-center gap-2">
                                        <Clock className="h-3 w-3" />
                                        {date}
                                    </h3>
                                </div>

                                <div className="space-y-4">
                                    {logs.map((log, i) => (
                                        <div
                                            key={`${log.timestamp}-${i}`}
                                            className="group flex gap-4 p-4 rounded-2xl bg-white border border-zinc-200/60 shadow-sm hover:shadow-md transition-all duration-300"
                                        >
                                            <div className="shrink-0 flex flex-col items-center">
                                                <div className="h-8 w-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                                                    <Activity className="h-4 w-4" />
                                                </div>
                                                {i !== logs.length - 1 && (
                                                    <div className="w-[1px] h-full bg-zinc-100 mt-2 min-h-[20px]" />
                                                )}
                                            </div>

                                            <div className="flex-1 pb-2">
                                                <div className="flex items-center justify-between mb-1">
                                                    <h4 className="font-bold text-[13px] text-zinc-900">{log.action || "System Event"}</h4>
                                                    <span className="text-[11px] text-zinc-400 font-mono">
                                                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                                <p className="text-[13px] text-zinc-600 leading-relaxed">
                                                    {log.details}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}

                </div>
            </div>
        </div>
    )
}
