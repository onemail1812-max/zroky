"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import { User, Mail, ChevronDown, ChevronUp, Check, Edit3, ArrowRight, Sun, Calendar, Info } from "lucide-react";

interface ChatMessageProps {
    role: "user" | "assistant";
    content?: string;
    type?: string;
    payload?: any;
}

const EmailActionCard = React.memo(function EmailActionCard({ payload }: { payload: any }) {
    const [isExpanded, setIsExpanded] = React.useState(false);

    // Extract info from payload
    const { sender, subject, snippet, draft } = payload;

    return (
        <div className="w-full max-w-2xl mx-auto bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm animate-in fade-in zoom-in-95 duration-500">
            {/* Header: Email Origin */}
            <div className="px-4 py-3 bg-zinc-50 border-b border-zinc-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-lg bg-white border border-zinc-200 flex items-center justify-center">
                        <Mail className="h-3.5 w-3.5 text-zinc-500" />
                    </div>
                    <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Email Activity</span>
                </div>
                <div className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-bold">
                    {payload.priority || "Action Required"}
                </div>
            </div>

            <div className="p-4">
                {/* Summary Info */}
                <div className="mb-4">
                    <h4 className="text-sm font-bold text-zinc-900 mb-0.5 truncate">{subject || "No Subject"}</h4>
                    <p className="text-xs text-zinc-500 truncate">From: {sender}</p>
                </div>

                {/* Collapsible Full View */}
                <div className="mb-4">
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="flex items-center gap-1.5 text-[11px] font-bold text-zinc-900 hover:text-zinc-600 transition-colors uppercase tracking-tight"
                    >
                        {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        {isExpanded ? "Hide Full Email" : "View Full Email"}
                    </button>
                    {isExpanded && (
                        <div className="mt-3 p-3 bg-zinc-50 rounded-xl border border-zinc-100 text-xs text-zinc-600 leading-relaxed max-h-[200px] overflow-y-auto custom-scrollbar animate-in slide-in-from-top-2 duration-300">
                            {snippet || "No content summary available."}
                        </div>
                    )}
                </div>

                {/* Aaliyah's Draft Section */}
                {draft && (
                    <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100/50 mb-4">
                        <div className="flex items-center gap-1.5 mb-2">
                            <img src="/employees/aaliyah.png" alt="Aaliyah" className="h-3.5 w-3.5 rounded-full object-cover" />
                            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-tight">AI Suggested Draft</span>
                        </div>
                        <p className="text-xs text-zinc-700 leading-relaxed font-medium">
                            {draft.body}
                        </p>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-2">
                    {draft ? (
                        <>
                            <button className="flex-1 h-9 bg-zinc-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-zinc-800 transition-all shadow-sm active:scale-95">
                                <Check className="h-3.5 w-3.5" />
                                Approve & Send
                            </button>
                            <button className="h-9 w-9 bg-white border border-zinc-200 rounded-xl flex items-center justify-center text-zinc-600 hover:bg-zinc-50 transition-all active:scale-95">
                                <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button className="h-9 w-9 bg-white border border-zinc-200 rounded-xl flex items-center justify-center text-zinc-600 hover:bg-zinc-50 transition-all active:scale-95">
                                <ArrowRight className="h-3.5 w-3.5" />
                            </button>
                        </>
                    ) : payload.actions && payload.actions.length > 0 ? (
                        payload.actions.map((act: any, i: number) => (
                            <button key={i} className="flex-1 h-9 bg-white border border-zinc-200 text-zinc-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-zinc-50 transition-all shadow-sm active:scale-95">
                                {act.label}
                            </button>
                        ))
                    ) : null}
                </div>
            </div>
        </div>
    );
});

const BriefingCard = React.memo(function BriefingCard({ payload }: { payload: any }) {
    const { message, stats, actions } = payload;
    return (
        <div className="w-full max-w-2xl mx-auto bg-gradient-to-br from-zinc-900 to-zinc-800 text-white rounded-2xl overflow-hidden shadow-xl animate-in fade-in zoom-in-95 duration-700">
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Sun className="h-4 w-4 text-amber-400" />
                    <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">Morning Briefing</span>
                </div>
                <div className="text-[10px] font-medium text-zinc-500">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</div>
            </div>
            <div className="p-5">
                <div className="prose prose-invert prose-sm mb-6">
                    <ReactMarkdown>{message}</ReactMarkdown>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                        <div className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Unread</div>
                        <div className="text-xl font-bold">{stats.unread}</div>
                    </div>
                    <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                        <div className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Priority</div>
                        <div className="text-xl font-bold text-amber-400">{stats.priority}</div>
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    {actions?.map((action: any, i: number) => (
                        <button key={i} className="w-full h-10 bg-white text-black rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-zinc-200 transition-all active:scale-[0.98]">
                            {action.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
});

const HistoryNode = React.memo(function HistoryNode({ payload }: { payload: any }) {
    const [isExpanded, setIsExpanded] = React.useState(false);
    return (
        <div className="w-full py-4 flex flex-col items-center">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-full text-[11px] font-bold text-zinc-500 hover:bg-zinc-100 transition-all shadow-sm"
            >
                <Calendar className="h-3 w-3" />
                {payload.date || "Past Context Block"}
                <div className="h-3 w-[1px] bg-zinc-300 mx-1" />
                <span className="text-zinc-400 font-medium">{isExpanded ? "Collapse" : "View Summary"}</span>
            </button>

            {isExpanded && (
                <div className="mt-3 w-full p-4 bg-white border border-zinc-100 rounded-2xl shadow-sm animate-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center gap-2 mb-3">
                        <Info className="h-3.5 w-3.5 text-zinc-400" />
                        <span className="text-[11px] font-bold text-zinc-800 uppercase tracking-tight">Semantic Memory Node</span>
                    </div>
                    <p className="text-xs text-zinc-600 leading-relaxed italic">
                        {payload.summary || "No summary available for this historical period."}
                    </p>
                </div>
            )}
        </div>
    );
});

export const ChatMessage = React.memo(function ChatMessage({ role, content, type, payload }: ChatMessageProps) {
    const isUser = role === "user";
    const isAction = type === "email_action";
    const isComposeAction = type === "compose_action";

    const ComposeActionCard = React.useCallback(({ payload }: { payload: any }) => {
        const [to, setTo] = React.useState(payload.to || "");
        const [subject, setSubject] = React.useState(payload.subject || "");
        const [body, setBody] = React.useState(payload.body || "");
        const [isSending, setIsSending] = React.useState(false);
        const [isSent, setIsSent] = React.useState(false);

        const handleSend = async () => {
            setIsSending(true);
            try {
                const res = await fetch("http://localhost:8000/assist/compose", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        to: to.split(",").map((s: string) => s.trim()).filter(Boolean),
                        cc: [],
                        bcc: [],
                        subject,
                        body,
                        workspace_id: "wksp_123" // Fallback, backend usually infers from token/context
                    })
                });
                if (res.ok) setIsSent(true);
            } catch (e) {
                console.error(e);
            } finally {
                setIsSending(false);
            }
        };

        if (isSent) {
            return (
                <div className="w-full bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3 animate-in fade-in zoom-in-95">
                    <div className="h-8 w-8 bg-emerald-100 rounded-full flex items-center justify-center">
                        <Check className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-emerald-900">Email sent successfully</h4>
                        <p className="text-xs text-emerald-700">To: {to}</p>
                    </div>
                </div>
            );
        }

        return (
            <div className="w-full max-w-2xl mx-auto bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm animate-in fade-in zoom-in-95 duration-500 mt-2">
                <div className="px-4 py-3 bg-zinc-50 border-b border-zinc-100 flex items-center gap-2">
                    <img src="/employees/aaliyah.png" alt="Aaliyah" className="h-4 w-4 rounded-full object-cover" />
                    <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Draft Ready for Review</span>
                </div>

                <div className="p-4 space-y-3">
                    <div>
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 block">To</label>
                        <input
                            type="text"
                            value={to}
                            onChange={(e) => setTo(e.target.value)}
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            placeholder="Recipient emails (comma separated)"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 block">Subject</label>
                        <input
                            type="text"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 block">Message</label>
                        <textarea
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            rows={6}
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-800 leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none custom-scrollbar"
                        />
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                        <button
                            onClick={handleSend}
                            disabled={isSending || !to}
                            className="flex-1 h-9 bg-zinc-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-zinc-800 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                        >
                            {isSending ? (
                                <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Check className="h-3.5 w-3.5" />
                            )}
                            {isSending ? "Sending..." : "Approve & Send"}
                        </button>
                    </div>
                </div>
            </div>
        );
    }, []);

    const isSystemEvent = ["email_action", "compose_action", "briefing_card", "history_node"].includes(type || "");

    return (
        <div
            className={cn(
                "flex w-full gap-3 mb-8 animate-in fade-in slide-in-from-bottom-2 duration-500 font-sans",
                isUser ? "flex-row-reverse" : "flex-row",
                isSystemEvent && "justify-center px-0"
            )}
        >
            {/* Show avatar ONLY for real conversational messages (User or Assistant text) */}
            {!isSystemEvent && (
                <div
                    className={cn(
                        "flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-xl overflow-hidden shadow-sm mt-1 transition-transform hover:scale-105",
                        isUser ? "bg-zinc-900 border border-zinc-800 text-white" : "bg-white border border-indigo-100 ring-4 ring-indigo-50/50"
                    )}
                >
                    {isUser ? (
                        <User size={14} className="text-zinc-400" />
                    ) : (
                        <img
                            src="/employees/aaliyah.png"
                            alt="Aaliyah"
                            className="h-full w-full object-cover"
                        />
                    )}
                </div>
            )}

            <div
                className={cn(
                    "flex flex-col gap-1 w-full",
                    isUser ? "items-end max-w-[85%]" : isSystemEvent ? "items-center max-w-full" : "items-start max-w-[85%]"
                )}
            >
                {isSystemEvent ? (
                    <div className="w-full pt-1">
                        {type === "email_action" ? (
                            <EmailActionCard payload={payload} />
                        ) : type === "compose_action" ? (
                            <ComposeActionCard payload={payload} />
                        ) : type === "briefing_card" ? (
                            <BriefingCard payload={payload} />
                        ) : type === "history_node" ? (
                            <HistoryNode payload={payload} />
                        ) : null}
                    </div>
                ) : (
                    <div
                        className={cn(
                            "rounded-2xl px-5 py-3.5 text-[14px] leading-[1.6] tracking-[-0.01em] shadow-sm",
                            isUser
                                ? "bg-zinc-900 text-white font-medium border border-zinc-800"
                                : "bg-white border border-indigo-100/80 text-indigo-950 font-[450] selection:bg-indigo-100"
                        )}
                    >
                        {!isUser && !content ? (
                            /* Typing Indicator — animated dots (assistant only) */
                            <div className="flex items-center gap-1.5 py-1">
                                <span className="h-2 w-2 rounded-full bg-indigo-200 animate-bounce" style={{ animationDelay: "0ms", animationDuration: "1s" }} />
                                <span className="h-2 w-2 rounded-full bg-indigo-200 animate-bounce" style={{ animationDelay: "150ms", animationDuration: "1s" }} />
                                <span className="h-2 w-2 rounded-full bg-indigo-200 animate-bounce" style={{ animationDelay: "300ms", animationDuration: "1s" }} />
                            </div>
                        ) : (
                            <div className="prose prose-indigo prose-sm max-w-none [&>*]:font-sans antialiased">
                                <ReactMarkdown
                                    components={{
                                        p: ({ children }) => <p className="mb-0 last:mb-0 leading-[1.6] font-[450]">{children}</p>,
                                        ul: ({ children }) => <ul className="list-disc ml-4 mb-2 font-[450]">{children}</ul>,
                                        ol: ({ children }) => <ol className="list-decimal ml-4 mb-2 font-[450]">{children}</ol>,
                                        li: ({ children }) => <li className="mb-1">{children}</li>,
                                        strong: ({ children }) => <strong className="font-bold text-zinc-900">{children}</strong>,
                                        code: ({ children }) => (
                                            <code className="bg-indigo-50/50 px-1.5 py-0.5 rounded-md text-[13px] font-mono text-indigo-700 border border-indigo-100/50">
                                                {children}
                                            </code>
                                        ),
                                        pre: ({ children }) => (
                                            <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-xl overflow-x-auto text-[13px] my-3 font-mono border border-zinc-800">
                                                {children}
                                            </pre>
                                        ),
                                        h1: ({ children }) => <h1 className="text-lg font-bold mt-4 mb-2 text-indigo-950 tracking-tight">{children}</h1>,
                                        h2: ({ children }) => <h2 className="text-base font-bold mt-3 mb-2 text-indigo-950 tracking-tight">{children}</h2>,
                                        h3: ({ children }) => <h3 className="text-sm font-bold mt-2 mb-1 text-indigo-950 tracking-tight">{children}</h3>,
                                    }}
                                >
                                    {content || ""}
                                </ReactMarkdown>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
});
