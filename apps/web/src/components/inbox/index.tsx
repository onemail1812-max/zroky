"use client"
import React, { useState, useEffect } from "react";
import { Mail, RefreshCw, X, AlertCircle, Edit, Send, CheckCircle2, Sparkles } from "lucide-react";
import { EmailMessage, inboxService } from "@/services/inbox.service";
import { SkeletonEmail, SkeletonEmailBody, Spinner } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";

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
        return (
            <div className="flex flex-col divide-y divide-zinc-100 animate-pulse">
                {[...Array(6)].map((_, i) => <SkeletonEmail key={i} />)}
            </div>
        );
    }

    // No empty state here to avoid flashing on tab switch if loading happens quickly
    // But good to have if truly empty after load
    if (!loading && messages.length === 0) {
        return (
            <EmptyState
                icon={Mail}
                title="Your Inbox is Clear"
                description={`No ${filter?.replace('_', ' ')} messages found. Aaliyah has everything under control.`}
                className="py-20"
            />
        );
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
                        {[
                            msg.needsClarity && (
                                <span key="c" className="px-1.5 py-0.5 bg-rose-950 text-rose-200 text-[8px] font-bold uppercase tracking-wider rounded border border-rose-900/50 flex items-center gap-1">
                                    <AlertCircle className="h-2 w-2" /> Needs Clarity
                                </span>
                            ),
                            msg.labels?.includes("priority") && (
                                <span key="p" className="px-1.5 py-0.5 bg-red-950/80 text-red-200 text-[8px] font-bold uppercase tracking-wider rounded border border-red-900/50">Priority</span>
                            ),
                            msg.labels?.includes("needs_reply") && (
                                <span key="n" className="px-1.5 py-0.5 bg-purple-950/80 text-purple-200 text-[8px] font-bold uppercase tracking-wider rounded border border-purple-900/50">Needs Reply</span>
                            ),
                            msg.labels?.includes("approvals") && (
                                <span key="a" className="px-1.5 py-0.5 bg-emerald-950/80 text-emerald-200 text-[8px] font-bold uppercase tracking-wider rounded border border-emerald-900/50">Approval</span>
                            ),
                            msg.labels?.includes("follow_ups") && (
                                <span key="f" className="px-1.5 py-0.5 bg-amber-950/80 text-amber-200 text-[8px] font-bold uppercase tracking-wider rounded border border-amber-900/50">Follow-up</span>
                            ),
                            msg.labels?.includes("notifications") && (
                                <span key="nt" className="px-1.5 py-0.5 bg-zinc-800 text-zinc-300 text-[8px] font-bold uppercase tracking-wider rounded border border-zinc-700/50">Notification</span>
                            ),
                            msg.draft && (
                                <span key="d" className="px-1.5 py-0.5 bg-black text-white text-[8px] font-bold uppercase tracking-wider rounded shadow-sm">Draft Ready</span>
                            )
                        ].filter(Boolean).slice(0, 3)}
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
    const [replyText, setReplyText] = React.useState("");
    const [fullBody, setFullBody] = React.useState<string | null>(null);
    const [bodyLoading, setBodyLoading] = React.useState(false);

    // Reset + fetch body when email changes
    useEffect(() => {
        setReplyText("");
        setFullBody(null);
        if (!email) return;
        setBodyLoading(true);
        inboxService.getEmailBody(email.id)
            .then(body => setFullBody(body || null))
            .catch(() => setFullBody(null))
            .finally(() => setBodyLoading(false));
    }, [email?.id]);

    if (!email) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-zinc-300">
                <Mail className="h-12 w-12 mb-4 opacity-20" />
                <span className="text-xs font-bold uppercase tracking-widest">Select a message to read</span>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-white overflow-hidden relative">
            {/* Header */}
            <header className="px-8 py-8 border-b border-zinc-100 flex justify-between items-start bg-white z-10 shrink-0">
                <div className="flex-1 min-w-0 mr-8">
                    <h2 className="text-2xl font-bold text-zinc-900 leading-tight mb-4">
                        {email.subject || "(No Subject)"}
                    </h2>
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-zinc-900 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm">
                            {(email.sender.name || email.sender.email || "?")[0].toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-zinc-900">{email.sender.name || email.sender.email}</span>
                                <span className="text-zinc-400 text-sm">{"<"}{email.sender.email}{">"}</span>
                            </div>
                            <div className="text-[12px] font-medium text-zinc-400 flex items-center gap-2 mt-0.5">
                                <span>{new Date(email.receivedAt).toLocaleString([], { dateStyle: 'long', timeStyle: 'short' })}</span>
                                <span className="h-1 w-1 rounded-full bg-zinc-200" />
                                <span className="capitalize">{email.provider}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-full transition-colors text-zinc-400 hover:text-zinc-900">
                        <X className="h-5 w-5" />
                    </button>
                </div>
            </header>

            {/* Email Body Stream */}
            <div className="flex-1 overflow-y-auto w-full bg-white">
                <div className="max-w-4xl mx-auto px-8 py-10">
                    <div className="text-[15px] leading-[1.8] text-zinc-800 antialiased font-normal whitespace-pre-wrap selection:bg-zinc-900 selection:text-white">
                        {bodyLoading ? (
                            <SkeletonEmailBody />
                        ) : (
                            <p>{fullBody || email.bodyCleaned || email.snippet}</p>
                        )}
                    </div>

                    {/* Draft Section - Elegant & Distinct */}
                    {email.draft && (
                        <div className="mt-16 border border-zinc-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                            <div className="px-6 py-4 border-b border-zinc-100 bg-zinc-50 flex items-center gap-3">
                                <Sparkles className="h-4 w-4 text-emerald-600" />
                                <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-900">Aaliyah Draft Prepared</span>
                            </div>
                            <div className="p-6">
                                <div className="text-[15px] leading-[1.8] text-zinc-600 font-medium whitespace-pre-wrap italic">
                                    "{email.draft.body}"
                                </div>
                                <div className="mt-8 flex justify-end gap-3">
                                    <button className="h-10 px-5 text-xs font-bold uppercase tracking-widest text-zinc-600 hover:bg-zinc-100 rounded-xl transition-colors border border-transparent hover:border-zinc-200">
                                        Edit
                                    </button>
                                    <button className="h-10 px-6 bg-zinc-900 hover:bg-black text-white text-xs font-bold uppercase tracking-widest rounded-xl transition-all shadow-xl shadow-zinc-900/10 active:scale-95">
                                        Send Draft
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Smart Reply Box */}
            <div className="p-6 border-t border-zinc-100 bg-white/95 backdrop-blur-xl z-20">
                <div className="max-w-4xl mx-auto flex items-end gap-3 bg-white border border-zinc-200 rounded-2xl p-2 shadow-sm focus-within:ring-2 focus-within:ring-zinc-900/10 focus-within:border-zinc-400 transition-all">
                    <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Reply to this email..."
                        className="flex-1 bg-transparent border-none focus:ring-0 text-[15px] text-zinc-900 placeholder:text-zinc-400 resize-none py-3 px-4 max-h-40 min-h-[52px]"
                        rows={1}
                    />
                    <div className="flex items-center gap-2 p-1">
                        <button className="p-2.5 rounded-xl hover:bg-zinc-100 text-zinc-400 hover:text-zinc-900 transition-colors">
                            <Sparkles className="h-5 w-5" />
                        </button>
                        <button className={`flex items-center justify-center h-10 w-10 rounded-xl transition-all ${replyText.trim() ? 'bg-zinc-900 text-white shadow-md hover:scale-105' : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'}`}>
                            <Send className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

