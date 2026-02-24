"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import { User, Bot } from "lucide-react";

interface ChatMessageProps {
    role: "user" | "assistant";
    content: string;
}

export function ChatMessage({ role, content }: ChatMessageProps) {
    const isUser = role === "user";

    return (
        <div
            className={cn(
                "flex w-full gap-3 mb-6 animate-in fade-in slide-in-from-bottom-2 duration-300 font-sans",
                isUser ? "flex-row-reverse" : "flex-row"
            )}
        >
            <div
                className={cn(
                    "flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-lg",
                    isUser ? "bg-black text-white" : "bg-zinc-100 text-zinc-700"
                )}
            >
                {isUser ? <User size={15} /> : <Bot size={15} />}
            </div>

            <div
                className={cn(
                    "flex flex-col gap-1 max-w-[80%]",
                    isUser ? "items-end" : "items-start"
                )}
            >
                <div
                    className={cn(
                        "rounded-2xl px-4 py-3 text-[14px] leading-relaxed tracking-[-0.01em]",
                        isUser
                            ? "bg-zinc-900 text-white font-medium"
                            : "bg-white border border-zinc-200 text-zinc-800 shadow-sm"
                    )}
                >
                    <div className="prose prose-zinc prose-sm dark:prose-invert max-w-none [&>*]:font-sans">
                        <ReactMarkdown
                            components={{
                                p: ({ children }) => <p className="mb-0 last:mb-0 leading-[1.7] font-[450]">{children}</p>,
                                ul: ({ children }) => <ul className="list-disc ml-4 mb-2 font-[450]">{children}</ul>,
                                ol: ({ children }) => <ol className="list-decimal ml-4 mb-2 font-[450]">{children}</ol>,
                                li: ({ children }) => <li className="mb-1">{children}</li>,
                                strong: ({ children }) => <strong className="font-bold text-zinc-900">{children}</strong>,
                                code: ({ children }) => (
                                    <code className="bg-zinc-100 px-1.5 py-0.5 rounded-md text-[13px] font-mono text-zinc-700">
                                        {children}
                                    </code>
                                ),
                                pre: ({ children }) => (
                                    <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-xl overflow-x-auto text-[13px] my-3 font-mono">
                                        {children}
                                    </pre>
                                ),
                                h1: ({ children }) => <h1 className="text-lg font-bold mt-4 mb-2">{children}</h1>,
                                h2: ({ children }) => <h2 className="text-base font-bold mt-3 mb-2">{children}</h2>,
                                h3: ({ children }) => <h3 className="text-sm font-bold mt-2 mb-1">{children}</h3>,
                            }}
                        >
                            {content}
                        </ReactMarkdown>
                    </div>
                </div>
            </div>
        </div>
    );
}
