"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { CheckCircle2, CircleDot, ListChecks, MessageSquare, ChevronDown, ChevronUp, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

interface ActionItem {
    owner: string
    task: string
    due_date: string
}

interface MeetingSummary {
    executive_summary: string
    decisions: string[]
    action_items: ActionItem[]
    sentiment: string
    keywords: string[]
}

interface MeetingSummaryCardProps {
    eventTitle: string
    summary: MeetingSummary
    timestamp?: string
}

export function MeetingSummaryCard({ eventTitle, summary, timestamp }: MeetingSummaryCardProps) {
    const [expanded, setExpanded] = React.useState(true)
    const [followUp, setFollowUp] = React.useState("")
    const [followUpAnswer, setFollowUpAnswer] = React.useState<string | null>(null)
    const [asking, setAsking] = React.useState(false)

    const sentimentColor = summary.sentiment === "positive" ? "text-emerald-600" :
        summary.sentiment === "negative" ? "text-red-500" : "text-zinc-500"

    const handleFollowUp = () => {
        if (!followUp.trim()) return
        setAsking(true)
        // Mock AI follow-up response
        setTimeout(() => {
            setFollowUpAnswer(`Based on the meeting notes: ${followUp} — ${summary.executive_summary.slice(0, 100)}...`)
            setAsking(false)
            setFollowUp("")
        }, 1500)
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm"
        >
            {/* Header */}
            <div
                className="px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-zinc-50/50 transition-colors"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
                        <ListChecks className="h-4 w-4 text-violet-600" />
                    </div>
                    <div className="min-w-0">
                        <h4 className="text-[13px] font-bold text-zinc-900 truncate">
                            Meeting Recap: {eventTitle}
                        </h4>
                        <p className="text-[11px] text-zinc-400 font-medium">
                            {timestamp || "Just now"} · {summary.action_items.length} action items
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <span className={cn("text-[10px] font-bold uppercase tracking-wider", sentimentColor)}>
                        {summary.sentiment}
                    </span>
                    {expanded ? <ChevronUp className="h-4 w-4 text-zinc-400" /> : <ChevronDown className="h-4 w-4 text-zinc-400" />}
                </div>
            </div>

            {/* Body */}
            {expanded && (
                <div className="px-5 pb-5 space-y-4 border-t border-zinc-100 pt-4">
                    {/* Executive Summary */}
                    <p className="text-[13px] text-zinc-700 leading-relaxed font-medium">
                        {summary.executive_summary}
                    </p>

                    {/* Decisions */}
                    {summary.decisions.length > 0 && (
                        <div>
                            <h5 className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Decisions</h5>
                            <div className="space-y-1.5">
                                {summary.decisions.map((d, i) => (
                                    <div key={i} className="flex items-start gap-2">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                                        <span className="text-[13px] text-zinc-700 font-medium">{d}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Action Items */}
                    {summary.action_items.length > 0 && (
                        <div>
                            <h5 className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Action Items</h5>
                            <div className="space-y-2">
                                {summary.action_items.map((item, i) => (
                                    <div key={i} className="flex items-start gap-3 p-3 bg-zinc-50 rounded-xl group">
                                        <CircleDot className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[13px] text-zinc-800 font-semibold">{item.task}</p>
                                            <p className="text-[11px] text-zinc-400 font-medium mt-0.5">
                                                {item.owner} · {item.due_date}
                                            </p>
                                        </div>
                                        <button className="text-[11px] font-bold text-blue-600 hover:text-blue-700 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 px-2 py-1 rounded-lg hover:bg-blue-50">
                                            → Task
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Keywords */}
                    {summary.keywords.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                            {summary.keywords.map((k, i) => (
                                <span key={i} className="px-2 py-0.5 bg-zinc-100 text-zinc-500 rounded-full text-[11px] font-medium">
                                    {k}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Follow-up AI Response */}
                    {followUpAnswer && (
                        <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                            <div className="flex items-center gap-2 mb-1">
                                <Sparkles className="h-3 w-3 text-amber-500" />
                                <span className="text-[11px] font-bold text-amber-700">Aaliyah</span>
                            </div>
                            <p className="text-[13px] text-amber-900/80 font-medium">{followUpAnswer}</p>
                        </div>
                    )}

                    {/* Follow-up Input */}
                    <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-200 rounded-xl p-2">
                        <MessageSquare className="h-4 w-4 text-zinc-400 shrink-0 ml-1" />
                        <input
                            type="text"
                            placeholder="Ask about this meeting..."
                            value={followUp}
                            onChange={e => setFollowUp(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && handleFollowUp()}
                            disabled={asking}
                            className="flex-1 bg-transparent text-[13px] text-zinc-900 placeholder:text-zinc-400 focus:outline-none font-medium"
                        />
                        <button
                            onClick={handleFollowUp}
                            disabled={asking || !followUp.trim()}
                            className="text-[12px] font-bold text-zinc-500 hover:text-zinc-900 disabled:opacity-40 px-2 py-1 transition-colors"
                        >
                            {asking ? "..." : "Ask"}
                        </button>
                    </div>
                </div>
            )}
        </motion.div>
    )
}
