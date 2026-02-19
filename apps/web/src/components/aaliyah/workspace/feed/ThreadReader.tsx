"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { SnapshotCard } from "./TimelineCards"
import { EmailMessage, inboxService } from "@/services/inbox.service"
import { Mail, RefreshCw, X, AlertCircle, Edit, Send, CheckCircle2, Sparkles, MoveRight } from "lucide-react"
import { cn } from "@/lib/utils"

export function ThreadReader({ thread }: { thread: EmailMessage }) {
    const [summary, setSummary] = React.useState<string[]>([]);
    const [summaryLoading, setSummaryLoading] = React.useState(false);

    const loadSummary = async () => {
        if (!thread) return;
        setSummaryLoading(true);
        try {
            const lines = await inboxService.getSummary(thread.id);
            setSummary(lines);
        } catch (e) { console.error(e); }
        finally { setSummaryLoading(false); }
    }

    React.useEffect(() => { setSummary([]); }, [thread.id]);

    const isDraftReady = thread.draft?.status === 'ready' || (thread.labels?.includes('needs_reply') && thread.draft)
    const isPendingApproval = thread.draft?.status === 'pending_approval' || (thread.labels?.includes('approvals'))
    const providerLabel = thread.provider === 'google' ? 'Gmail' : 'Outlook'

    // Refs for auto-scroll
    const draftRef = React.useRef<HTMLDivElement>(null)
    const analysisRef = React.useRef<HTMLDivElement>(null)
    const originalRef = React.useRef<HTMLDivElement>(null)

    // Auto-scroll to most relevant message on thread change
    React.useEffect(() => {
        const timer = setTimeout(() => {
            const target = draftRef.current || analysisRef.current || originalRef.current
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }
        }, 100)
        return () => clearTimeout(timer)
    }, [thread.id])

    return (
        <div className="flex flex-col gap-8 max-w-3xl mx-auto w-full py-8">

            {/* Snapshot Card (Aaliyah's Intelligence Summary) */}
            <SnapshotCard thread={thread} />

            {/* Original Message Bubble */}
            <div ref={originalRef} className="flex flex-col items-start gap-2 rounded-3xl transition-all duration-500">
                <div className="max-w-[90%] bg-white p-6 rounded-3xl rounded-tl-sm shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-zinc-100 text-[14px] text-zinc-800 leading-relaxed font-medium">
                    <p className="whitespace-pre-wrap">{thread.bodyCleaned || thread.snippet}</p>
                </div>
                <div className="flex items-center gap-2 ml-1">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                        {thread.sender.name ? `${thread.sender.name} (${thread.sender.email})` : thread.sender.email}
                    </span>
                    <div className={cn(
                        "h-3.5 w-3.5 rounded-full flex items-center justify-center text-[7px] font-black text-white shrink-0",
                        thread.provider === "google" ? "bg-red-500" : "bg-blue-600"
                    )}>
                        {thread.provider === "google" ? "G" : "O"}
                    </div>
                </div>
            </div>

            {/* Aaliyah Intelligence */}
            <div className="space-y-6">
                {/* Summary Bubble */}
                {summary.length > 0 ? (
                    <div ref={analysisRef} className="flex flex-col items-end gap-2 rounded-3xl transition-all duration-500">
                        <div className="max-w-[85%] bg-zinc-900 text-zinc-300 p-6 rounded-3xl rounded-tr-sm shadow-2xl text-[13px] leading-relaxed border border-white/5">
                            <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-4 flex items-center gap-2">
                                <Sparkles className="h-3 w-3 text-zinc-500" />
                                ({providerLabel}) Aaliyah Analysis
                            </h4>
                            <ul className="space-y-3">
                                {summary.map((line, i) => (
                                    <li key={i} className="flex gap-3">
                                        <span className="text-zinc-700 font-bold mt-0.5">•</span>
                                        <span className="font-medium">{line}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mr-1">Aaliyah AI</span>
                    </div>
                ) : (
                    <div className="flex justify-end">
                        <button
                            onClick={loadSummary}
                            disabled={summaryLoading}
                            className="group text-[10px] font-bold uppercase tracking-[0.2em] bg-white hover:bg-zinc-900 hover:text-white text-zinc-400 px-6 py-3 rounded-full transition-all flex items-center gap-2 border border-zinc-100 shadow-sm">
                            {summaryLoading ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3 group-hover:scale-110 transition-transform" />}
                            {summaryLoading ? "Analyzing..." : "Generate Deep Analysis"}
                        </button>
                    </div>
                )}

                {/* Draft Bubble */}
                {thread.draft && (
                    <div ref={draftRef} className="flex flex-col items-end gap-2 animate-in fade-in slide-in-from-bottom-4 duration-500 rounded-3xl transition-all">
                        <div className="max-w-[85%] bg-zinc-900 text-white p-7 rounded-3xl rounded-tr-sm shadow-2xl relative overflow-hidden ring-1 ring-white/10">
                            <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-4 flex items-center gap-2">
                                <div className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                ({providerLabel}) Proposed Draft
                            </h4>

                            {thread.draft.reasoning && (
                                <div className="text-[11px] font-bold text-zinc-400 bg-white/5 px-3 py-1.5 rounded-lg inline-block mb-4">
                                    Context: {thread.draft.reasoning}
                                </div>
                            )}

                            <p className="whitespace-pre-wrap text-[14px] leading-relaxed font-medium text-zinc-200">
                                {thread.draft.body}
                            </p>

                            {/* Why this draft? Audit Panel */}
                            {(thread.draft.intent || (thread.draft.sources_used && thread.draft.sources_used.length > 0) || (thread.draft.risk_labels && thread.draft.risk_labels.length > 0)) && (
                                <div className="mt-6 pt-4 border-t border-white/10">
                                    <div className="flex flex-wrap gap-2 items-center">
                                        <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mr-2">Why this draft?</span>

                                        {thread.draft.intent && (
                                            <span className="text-[10px] bg-white/5 px-2 py-1 rounded text-zinc-300 border border-white/5 flex items-center gap-1">
                                                <span>🎯</span> {thread.draft.intent}
                                            </span>
                                        )}

                                        {thread.draft.sources_used?.map((source, i) => (
                                            <span key={i} className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded border border-emerald-500/20 flex items-center gap-1">
                                                <span>📚</span> {source}
                                            </span>
                                        ))}

                                        {thread.draft.risk_labels?.map((risk, i) => (
                                            <span key={i} className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-1 rounded border border-amber-500/20 flex items-center gap-1">
                                                <span>⚠️</span> {risk}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mr-1">Aaliyah AI</span>
                    </div>
                )}
            </div>

            {/* Action Bar (Pinned to Bottom via Spacer) */}
            <div className="pt-12 flex items-center justify-center gap-3 flex-wrap">
                {isDraftReady && !isPendingApproval && (
                    <>
                        <button className="px-6 py-2.5 bg-zinc-900 text-white text-xs font-bold uppercase tracking-widest rounded-lg hover:bg-black transition-all shadow-lg flex items-center gap-2 group">
                            <Send className="h-3.5 w-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                            Send
                        </button>
                        <button className="px-6 py-2.5 bg-white text-zinc-600 border border-zinc-200 text-xs font-bold uppercase tracking-widest rounded-lg hover:bg-zinc-50 transition-all flex items-center gap-2">
                            <Edit className="h-3.5 w-3.5" /> Edit
                        </button>
                        <button className="px-6 py-2.5 bg-white text-zinc-600 border border-zinc-200 text-xs font-bold uppercase tracking-widest rounded-lg hover:bg-zinc-50 transition-all flex items-center gap-2">
                            <MoveRight className="h-3.5 w-3.5" /> Move to Approvals
                        </button>
                    </>
                )}
                {isPendingApproval && (
                    <>
                        <button className="px-6 py-2.5 bg-zinc-900 text-white text-xs font-bold uppercase tracking-widest rounded-lg hover:bg-black transition-all shadow-lg flex items-center gap-2 group">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Approve & Send
                        </button>
                        <button className="px-6 py-2.5 bg-white text-zinc-600 border border-zinc-200 text-xs font-bold uppercase tracking-widest rounded-lg hover:bg-zinc-50 transition-all flex items-center gap-2">
                            <Edit className="h-3.5 w-3.5" /> Edit
                        </button>
                        <button className="px-6 py-2.5 bg-white text-red-600 border border-red-200 text-xs font-bold uppercase tracking-widest rounded-lg hover:bg-red-50 transition-all flex items-center gap-2">
                            <X className="h-3.5 w-3.5" /> Reject
                        </button>
                    </>
                )}
                {!thread.draft && (
                    <button className="px-8 py-2.5 bg-white text-zinc-400 border border-zinc-200 text-xs font-bold uppercase tracking-widest rounded-lg hover:text-zinc-800 hover:border-zinc-300 transition-all">
                        Reply Manually
                    </button>
                )}
            </div>

            {/* End of Discussion Indicator */}
            <div className="py-20 flex items-center justify-center gap-4">
                <div className="h-px w-8 bg-zinc-100" />
                <span className="text-[9px] font-bold text-zinc-200 uppercase tracking-[0.5em]">End of Transcript</span>
                <div className="h-px w-8 bg-zinc-100" />
            </div>
        </div>
    )
}
