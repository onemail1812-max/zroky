"use client";

import React, { Suspense } from "react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import { User, Loader2 } from "lucide-react";

// Lazy-loaded components
const EmailActionCard = React.lazy(() =>
    import("./cards/EmailActionCard").then(module => ({ default: module.EmailActionCard }))
);
const BriefingCard = React.lazy(() =>
    import("./cards/BriefingCard").then(module => ({ default: module.BriefingCard }))
);
const HistoryNode = React.lazy(() =>
    import("./cards/HistoryNode").then(module => ({ default: module.HistoryNode }))
);
const ComposeActionCard = React.lazy(() =>
    import("./cards/ComposeActionCard").then(module => ({ default: module.ComposeActionCard }))
);

interface ChatMessageProps {
    role: "user" | "assistant";
    content?: string;
    type?: string;
    payload?: any;
}

// Fallback skeleton for lazy-loaded cards
const CardSkeleton = () => (
    <div className="w-full max-w-2xl mx-auto bg-zinc-50 border border-zinc-200/60 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 animate-pulse h-[140px]">
        <Loader2 className="h-5 w-5 text-zinc-300 animate-spin" />
        <div className="h-2 w-24 bg-zinc-200 rounded-full" />
    </div>
);

export const ChatMessage = React.memo(function ChatMessage({ role, content, type, payload }: ChatMessageProps) {
    const isUser = role === "user";
    const isSystemEvent = ["email_action", "compose_action", "briefing_card", "history_node"].includes(type || "");

    const extractDisplayContent = (text: string | null | undefined): string => {
        if (!text) return "";
        try {
            // Check if it looks like JSON
            if (text.trim().startsWith('{') && text.trim().endsWith('}')) {
                const parsed = JSON.parse(text);
                if (parsed.answer_text) return parsed.answer_text;
                if (parsed.reply) return parsed.reply;
                if (parsed.summary) {
                    let out = `**Summary:** ${parsed.summary}\n\n`;
                    if (parsed.people_involved && Array.isArray(parsed.people_involved)) {
                        out += `**People Involved:** ${parsed.people_involved.join(', ')}\n\n`;
                    }
                    if (parsed.recommendation) {
                        out += `**Recommendation:** ${parsed.recommendation}\n\n`;
                    }
                    if (parsed.talking_points && Array.isArray(parsed.talking_points)) {
                        out += `**Talking Points:**\n${parsed.talking_points.map((p: string) => `- ${p}`).join('\n')}`;
                    }
                    return out.trim();
                }
            }
            return text;
        } catch (e) {
            // Not valid JSON or parsing failed, return as text
            return text;
        }
    };

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
                        <Suspense fallback={<CardSkeleton />}>
                            {type === "email_action" ? (
                                <EmailActionCard payload={payload} />
                            ) : type === "compose_action" ? (
                                <ComposeActionCard payload={payload} />
                            ) : type === "briefing_card" ? (
                                <BriefingCard payload={payload} />
                            ) : type === "history_node" ? (
                                <HistoryNode payload={payload} />
                            ) : null}
                        </Suspense>
                    </div>
                ) : (
                    <div
                        aria-live="polite"
                        aria-atomic="true"
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
                            <div className="prose prose-indigo prose-sm max-w-none [&>*]:font-sans antialiased break-words overflow-wrap-anywhere">
                                <ReactMarkdown
                                    components={{
                                        p: ({ children }) => <p className="mb-0 last:mb-0 leading-[1.6] font-[450]">{children}</p>,
                                        ul: ({ children }) => <ul className="list-disc ml-4 mb-2 font-[450]">{children}</ul>,
                                        ol: ({ children }) => <ol className="list-decimal ml-4 mb-2 font-[450]">{children}</ol>,
                                        li: ({ children }) => <li className="mb-1">{children}</li>,
                                        strong: ({ children }) => <strong className="font-bold text-zinc-900">{children}</strong>,
                                        code: ({ children }) => (
                                            <code className="bg-indigo-50/50 px-1.5 py-0.5 rounded-md text-[13px] font-mono text-indigo-700 border border-indigo-100/50 break-all">
                                                {children}
                                            </code>
                                        ),
                                        pre: ({ children }) => (
                                            <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-xl overflow-x-auto custom-scrollbar text-[13px] my-3 font-mono border border-zinc-800 w-full max-w-full">
                                                {children}
                                            </pre>
                                        ),
                                        h1: ({ children }) => <h1 className="text-lg font-bold mt-4 mb-2 text-indigo-950 tracking-tight">{children}</h1>,
                                        h2: ({ children }) => <h2 className="text-base font-bold mt-3 mb-2 text-indigo-950 tracking-tight">{children}</h2>,
                                        h3: ({ children }) => <h3 className="text-sm font-bold mt-2 mb-1 text-indigo-950 tracking-tight">{children}</h3>,
                                    }}
                                >
                                    {extractDisplayContent(content) || ""}
                                </ReactMarkdown>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
});
