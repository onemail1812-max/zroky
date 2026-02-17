"use client"
import React, { useState, useEffect } from "react";
import { Mail, RefreshCw, X, AlertCircle, Edit, Send, CheckCircle2, Sparkles } from "lucide-react";
import { EmailMessage, inboxService } from "@/services/inbox.service";

// Helper for relative time
function timeAgo(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = (now.getTime() - date.getTime()) / 1000;
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString();
}

interface InboxListProps {
    onSelect: (email: EmailMessage) => void;
    selectedId?: string;
    refreshTrigger: number;
    filter: string; // Lifted filter state
    onLoad?: (first: EmailMessage | null) => void;
}

export function InboxList({ onSelect, selectedId, refreshTrigger, filter, onLoad }: InboxListProps) {
    const [messages, setMessages] = useState<EmailMessage[]>([]);
    const [loading, setLoading] = useState(true);

    const load = async () => {
        setLoading(true);
        try {
            const res = await inboxService.getInbox(filter);
            setMessages(res.data);
        } catch (e) {
            console.error("Failed to load inbox", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, [filter, refreshTrigger]);

    useEffect(() => {
        if (!loading && onLoad) {
            // Only trigger if we have messages or finished loading empty
            onLoad(messages.length > 0 ? messages[0] : null);
        }
    }, [messages, loading]);

    if (loading && messages.length === 0) {
        return <div className="p-8 text-center text-zinc-400 text-xs uppercase tracking-widest animate-pulse">Syncing Unified Inbox...</div>;
    }

    // No empty state here to avoid flashing on tab switch if loading happens quickly
    // But good to have if truly empty after load
    if (!loading && messages.length === 0) {
        return <div className="p-8 text-center text-zinc-400 text-xs uppercase tracking-widest">No messages</div>;
    }

    return (
        <div className="flex flex-col divide-y divide-zinc-100">
            {messages.map((msg) => (
                <div
                    key={msg.id}
                    onClick={() => onSelect(msg)}
                    className={`p-4 cursor-pointer hover:bg-zinc-50 transition-colors group relative ${selectedId === msg.id ? "bg-zinc-50 border-l-2 border-black" : "border-l-2 border-transparent"
                        }`}
                >
                    <div className="flex justify-between items-baseline mb-0.5">
                        <span className={`text-sm truncate max-w-[70%] ${msg.isRead ? "font-medium text-zinc-500" : "font-bold text-black"}`}>
                            {msg.sender.name || msg.sender.email}
                        </span>

                        <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] text-zinc-400 font-medium whitespace-nowrap lowercase">
                                {timeAgo(msg.receivedAt)}
                            </span>
                            <div className={`h-3.5 w-3.5 rounded-full flex items-center justify-center text-[7px] font-black text-white ${msg.provider === "google" ? "bg-red-500" : "bg-blue-600"
                                }`}>
                                {msg.provider === "google" ? "G" : "O"}
                            </div>
                        </div>
                    </div>

                    <h4 className={`text-xs truncate mb-1 ${msg.isRead ? "text-zinc-400 font-medium" : "text-black font-semibold"}`}>
                        {msg.subject || "(No Subject)"}
                    </h4>

                    <p className="text-[10px] text-zinc-400 line-clamp-2 leading-snug mb-3">
                        {msg.snippet}
                    </p>

                    {/* Labels / Attributes */}
                    <div className="flex flex-wrap gap-1.5 mt-auto">
                        {msg.labels?.includes("priority") && (
                            <span className="px-1.5 py-0.5 bg-red-50 text-red-600 text-[8px] font-bold uppercase tracking-wider rounded border border-red-100/50">Urgent</span>
                        )}
                        {msg.labels?.includes("needs_reply") && (
                            <span className="px-1.5 py-0.5 bg-purple-50 text-purple-600 text-[8px] font-bold uppercase tracking-wider rounded border border-purple-100/50">Needs Reply</span>
                        )}
                        {msg.draft && (
                            <span className="px-1.5 py-0.5 bg-zinc-900 text-white text-[8px] font-bold uppercase tracking-wider rounded">Draft Ready</span>
                        )}
                        {/* Tags Logic */}
                        {(msg.bodyCleaned || msg.snippet)?.toLowerCase().includes('invoice') && (
                            <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-600 text-[8px] font-bold uppercase tracking-wider rounded border border-emerald-100/50">Money</span>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}

interface EmailThreadViewProps {
    email: EmailMessage | null;
    onClose: () => void;
}

export function EmailThreadView({ email, onClose }: EmailThreadViewProps) {
    const [summary, setSummary] = React.useState<string[]>([]);
    const [summaryLoading, setSummaryLoading] = React.useState(false);

    const loadSummary = async () => {
        if (!email) return;
        setSummaryLoading(true);
        try {
            const lines = await inboxService.getSummary(email.id);
            setSummary(lines);
        } catch (e) { console.error(e); }
        finally { setSummaryLoading(false); }
    }

    // Reset summary when email changes
    useEffect(() => { setSummary([]); }, [email?.id]);

    if (!email) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-zinc-300">
                <Mail className="h-12 w-12 mb-4 opacity-20" />
                <span className="text-xs font-bold uppercase tracking-widest">Select a message to read</span>
            </div>
        );
    }

    const renderActionArea = () => {
        const isDraftReady = email.draft?.status === 'ready' || email.labels?.includes('needs_reply') && email.draft;
        const isPendingApproval = email.draft?.status === 'pending_approval' || (email.labels?.includes('approvals'));

        return (
            <div className="p-4 border-t border-zinc-100 bg-white flex items-center gap-3 justify-center shadow-[0_-4px_12px_rgba(0,0,0,0.02)]">
                {isDraftReady && (
                    <>
                        <button className="px-6 py-2 bg-black text-white text-[10px] font-bold uppercase tracking-widest rounded-full hover:bg-zinc-800 transition-all flex items-center gap-2">
                            <Send className="h-3 w-3" /> Send (Safe)
                        </button>
                        <button className="px-6 py-2 bg-white text-zinc-600 border border-zinc-200 text-[10px] font-bold uppercase tracking-widest rounded-full hover:bg-zinc-50 transition-all flex items-center gap-2">
                            <Edit className="h-3 w-3" /> Edit
                        </button>
                        <button className="px-6 py-2 bg-white text-zinc-400 border border-zinc-100 text-[10px] font-bold uppercase tracking-widest rounded-full hover:text-zinc-600 transition-all">
                            Move to Approvals
                        </button>
                    </>
                )}
                {isPendingApproval && (
                    <>
                        <button className="px-6 py-2 bg-amber-500 text-white text-[10px] font-bold uppercase tracking-widest rounded-full hover:bg-amber-600 transition-all flex items-center gap-2">
                            <CheckCircle2 className="h-3 w-3" /> Approve & Send
                        </button>
                        <button className="px-6 py-2 bg-white text-zinc-600 border border-zinc-200 text-[10px] font-bold uppercase tracking-widest rounded-full hover:bg-zinc-50 transition-all flex items-center gap-2">
                            <Edit className="h-3 w-3" /> Edit
                        </button>
                        <button className="px-6 py-2 bg-white text-red-400 border border-red-50 text-[10px] font-bold uppercase tracking-widest rounded-full hover:text-red-600 transition-all">
                            Reject
                        </button>
                    </>
                )}
                {!isDraftReady && !isPendingApproval && (
                    <button className="px-8 py-2 bg-zinc-100 text-zinc-600 text-[10px] font-bold uppercase tracking-widest rounded-full hover:bg-zinc-200 transition-all">
                        Reply
                    </button>
                )}
            </div>
        )
    }

    return (
        <div className="h-full flex flex-col bg-white overflow-hidden">
            {/* Header */}
            <div className="px-8 py-6 border-b border-zinc-100 flex justify-between items-center bg-white/80 backdrop-blur-sm z-10">
                <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-bold text-black mb-1 leading-tight truncate">{email.subject}</h2>
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                        <span className="bg-zinc-100 px-1.5 py-0.5 rounded text-black">Source: {email.provider === 'google' ? 'Gmail' : 'Outlook'}</span>
                        <span>•</span>
                        <span>{email.sender.name}</span>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                        {new Date(email.receivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
                        <X className="h-4 w-4 text-zinc-400" />
                    </button>
                </div>
            </div>

            {/* Conversation Area (Chat-like) */}
            <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-zinc-50/20">
                <div className="max-w-3xl mx-auto space-y-8">

                    {/* User's Original Message (Bubble) */}
                    <div className="flex flex-col items-start gap-2">
                        <div className="max-w-[85%] bg-white p-6 rounded-2xl rounded-tl-sm shadow-sm border border-zinc-100 text-sm text-zinc-800 leading-relaxed">
                            <p className="whitespace-pre-wrap">{email.bodyCleaned || email.snippet}</p>
                        </div>
                        <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest ml-1">{email.sender.name}</span>
                    </div>

                    {/* Aaliyah Intelligence Interleaved */}
                    <div className="space-y-4">
                        {/* Summary Bubble */}
                        {summary.length > 0 ? (
                            <div className="flex flex-col items-end gap-2">
                                <div className="max-w-[80%] bg-zinc-900 text-zinc-300 p-5 rounded-2xl rounded-tr-sm shadow-lg text-xs leading-relaxed border border-white/5">
                                    <h4 className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-3 ml-0.5 flex items-center gap-2">
                                        <div className="h-1 w-1 bg-zinc-500 rounded-full animate-pulse" />
                                        ({email.provider === 'google' ? 'Gmail' : 'Outlook'}) Summary
                                    </h4>
                                    <ul className="space-y-2">
                                        {summary.map((line, i) => (
                                            <li key={i} className="flex gap-2">
                                                <span className="text-zinc-600">•</span> {line}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mr-1">Aaliyah AI</span>
                            </div>
                        ) : (
                            <div className="flex justify-end">
                                <button
                                    onClick={loadSummary}
                                    disabled={summaryLoading}
                                    className="text-[9px] font-bold uppercase tracking-[0.2em] bg-zinc-100 hover:bg-black hover:text-white text-zinc-500 px-4 py-2 rounded-full transition-all flex items-center gap-2 border border-zinc-200">
                                    {summaryLoading ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                                    {summaryLoading ? "Analyzing..." : "Generate Summary"}
                                </button>
                            </div>
                        )}

                        {/* Draft Bubble */}
                        {email.draft && (
                            <div className="flex flex-col items-end gap-2 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
                                <div className="max-w-[80%] bg-purple-600 text-white p-6 rounded-2xl rounded-tr-sm shadow-xl shadow-purple-500/10 text-sm leading-relaxed relative overflow-hidden">
                                    {/* Decorative subtle pulse */}
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl pointer-events-none" />

                                    <h4 className="text-[9px] font-bold uppercase tracking-[0.2em] text-purple-200 mb-3 flex items-center gap-2">
                                        <div className="h-1 w-1 bg-white rounded-full animate-ping" />
                                        ({email.provider === 'google' ? 'Gmail' : 'Outlook'}) {email.draft.status === 'pending_approval' ? 'Approval Needed' : 'Draft Ready'}
                                    </h4>

                                    {email.draft.reasoning && (
                                        <p className="text-[10px] font-bold text-purple-100 bg-black/10 px-2 py-1 rounded inline-block mb-3">
                                            {email.draft.reasoning}
                                        </p>
                                    )}

                                    <p className="whitespace-pre-wrap text-white/90">{email.draft.body}</p>
                                </div>
                                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mr-1">Aaliyah AI</span>
                            </div>
                        )}
                    </div>

                    {/* Visual End */}
                    <div className="py-12 flex items-center justify-center gap-4">
                        <div className="h-px w-12 bg-zinc-100" />
                        <span className="text-[8px] font-bold text-zinc-300 uppercase tracking-[0.4em]">End of Thread</span>
                        <div className="h-px w-12 bg-zinc-100" />
                    </div>
                </div>
            </div>

            {/* Action Area */}
            {renderActionArea()}
        </div>
    );
}
