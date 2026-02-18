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

    // ... (rest of InboxList)
                    {/* Labels / Attributes */}
                    <div className="flex flex-wrap gap-1.5 mt-auto">
                        {/* Combine all potential tags and slice to max 2 */}
                        {[
                            msg.labels?.includes("priority") && (
                                <span key="p" className="px-1.5 py-0.5 bg-red-50 text-red-600 text-[8px] font-bold uppercase tracking-wider rounded border border-red-100/50">Urgent</span>
                            ),
                            msg.labels?.includes("needs_reply") && (
                                <span key="n" className="px-1.5 py-0.5 bg-purple-50 text-purple-600 text-[8px] font-bold uppercase tracking-wider rounded border border-purple-100/50">Needs Reply</span>
                            ),
                            msg.draft && (
                                <span key="d" className="px-1.5 py-0.5 bg-zinc-900 text-white text-[8px] font-bold uppercase tracking-wider rounded">Draft Ready</span>
                            ),
                            (msg.bodyCleaned || msg.snippet)?.toLowerCase().includes('invoice') && (
                                <span key="m" className="px-1.5 py-0.5 bg-emerald-50 text-emerald-600 text-[8px] font-bold uppercase tracking-wider rounded border border-emerald-100/50">Money</span>
                            )
                        ].filter(Boolean).slice(0, 2)}
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
    const [replyText, setReplyText] = React.useState("");

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
    useEffect(() => { setSummary([]); setReplyText(""); }, [email?.id]);

    if (!email) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-zinc-300">
                <Mail className="h-12 w-12 mb-4 opacity-20" />
                <span className="text-xs font-bold uppercase tracking-widest">Select a message to read</span>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-white overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-zinc-100 flex justify-between items-center bg-white z-10 shrink-0">
                <div className="flex-1 min-w-0 mr-4">
                    <h2 className="text-lg font-bold text-black truncate">{email.subject}</h2>
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400 mt-1">
                        <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${email.provider === 'google' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                            {email.provider === 'google' ? 'Gmail' : 'Outlook'}
                        </div>
                        <span>•</span>
                        <span className="text-black">{email.sender.name}</span>
                    </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                    <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">
                        {new Date(email.receivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-lg transition-colors">
                        <X className="h-4 w-4 text-zinc-400" />
                    </button>
                </div>
            </div>

            {/* Conversation Stream */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-zinc-50/30">
                <div className="max-w-3xl mx-auto space-y-6">

                    {/* Original Message */}
                    <div className="flex flex-col gap-2">
                        <div className="self-start max-w-[90%] bg-white p-5 rounded-2xl rounded-tl-sm shadow-sm border border-zinc-200/50 text-sm text-zinc-800 leading-relaxed">
                            <p className="whitespace-pre-wrap">{email.bodyCleaned || email.snippet}</p>
                        </div>
                        <span className="ml-1 text-[9px] font-bold text-zinc-400 uppercase tracking-widest">{email.sender.name}</span>
                    </div>

                    {/* AI Summary (if any) */}
                    {summary.length > 0 && (
                        <div className="flex flex-col items-end gap-2 animate-in fade-in slide-in-from-bottom-2">
                            <div className="self-end max-w-[85%] bg-zinc-900 text-zinc-300 p-5 rounded-2xl rounded-tr-sm shadow-lg text-xs leading-relaxed">
                                <h4 className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-3 flex items-center gap-2">
                                    <Sparkles className="h-3 w-3 text-emerald-500" /> Analysis
                                </h4>
                                <ul className="space-y-2">
                                    {summary.map((line, i) => (
                                        <li key={i} className="flex gap-2">
                                            <span className="text-zinc-600">•</span> {line}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <span className="mr-1 text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Aaliyah</span>
                        </div>
                    )}

                    {/* Draft Preview (if any) */}
                    {email.draft && (
                        <div className="flex flex-col items-end gap-2 animate-in fade-in slide-in-from-bottom-2">
                            <div className="self-end max-w-[85%] bg-white border-2 border-purple-100 p-5 rounded-2xl rounded-tr-sm shadow-sm text-sm text-zinc-800 leading-relaxed relative overflow-hidden">
                                <div className="absolute top-0 right-0 px-3 py-1 bg-purple-50 text-purple-600 text-[9px] font-bold uppercase tracking-widest rounded-bl-xl">
                                    Draft Preview
                                </div>
                                <p className="whitespace-pre-wrap mt-4">{email.draft.body}</p>
                            </div>
                            <span className="mr-1 text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Draft</span>
                        </div>
                    )}

                    {/* Generate Summary Button if not present */}
                    {summary.length === 0 && (
                        <div className="flex justify-center py-4">
                            <button
                                onClick={loadSummary}
                                disabled={summaryLoading}
                                className="text-[9px] font-bold uppercase tracking-[0.2em] bg-white border border-zinc-200 hover:border-black hover:text-black text-zinc-400 px-4 py-2 rounded-full transition-all flex items-center gap-2 shadow-sm">
                                {summaryLoading ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                                {summaryLoading ? "Analyzing..." : "Analyze Thread"}
                            </button>
                        </div>
                    )}

                </div>
            </div>

            {/* Chat Input Area */}
            <div className="p-4 bg-white border-t border-zinc-100 z-10">
                <div className="max-w-3xl mx-auto flex items-end gap-2 bg-zinc-50 p-2 rounded-3xl border border-zinc-200 focus-within:ring-2 focus-within:ring-black/5 focus-within:border-black transition-all shadow-sm">
                    <button className="p-3 hover:bg-zinc-200 rounded-full text-zinc-400 hover:text-black transition-colors">
                        <Sparkles className="h-4 w-4" />
                    </button>
                    <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Type a reply or command..."
                        className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-medium text-black placeholder:text-zinc-400 resize-none py-3 max-h-32 min-h-[44px]"
                        rows={1}
                    />
                    <button className={`p-3 rounded-full transition-all ${replyText.trim() ? 'bg-black text-white shadow-md hover:scale-105' : 'bg-zinc-200 text-zinc-400 cursor-not-allowed'}`}>
                        <Send className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}

