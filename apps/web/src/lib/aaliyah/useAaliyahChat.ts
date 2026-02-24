"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export interface ChatMessage {
    id: string;
    role?: "user" | "assistant";
    content?: string;
    type?: string;
    [key: string]: any;
}

interface UseAaliyahChatOptions {
    api?: string;
}

const STORAGE_KEY = "aaliyah_chat_messages";

function loadMessages(): ChatMessage[] {
    if (typeof window === "undefined") return [];
    try {
        const stored = sessionStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}

function saveMessages(msgs: ChatMessage[]) {
    if (typeof window === "undefined") return;
    try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(msgs));
    } catch {
        // Storage full or unavailable — silently ignore
    }
}

/**
 * Custom chat hook — bulletproof SSE streaming.
 * Persists messages in sessionStorage so they survive tab switches.
 */
export function useAaliyahChat(options?: UseAaliyahChatOptions) {
    const [messages, setMessagesRaw] = useState<ChatMessage[]>(loadMessages);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const abortRef = useRef<AbortController | null>(null);
    const apiUrl = options?.api || "/assist/chat";

    // Persist messages to sessionStorage on every change
    const setMessages = useCallback((updater: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => {
        setMessagesRaw(prev => {
            const next = typeof updater === "function" ? updater(prev) : updater;
            saveMessages(next);
            return next;
        });
    }, []);

    const sendMessage = useCallback(async (userInput?: string) => {
        const text = (userInput || input).trim();
        if (!text || isLoading) return;

        // Add user message
        const userMsg: ChatMessage = {
            id: `user-${Date.now()}`,
            role: "user",
            content: text,
        };

        const assistantMsg: ChatMessage = {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: "",
        };

        setMessages(prev => [...prev, userMsg, assistantMsg]);
        setInput("");
        setIsLoading(true);

        // Build the messages payload (include history for context)
        const allMessages = [...messages, userMsg].map(m => ({
            role: m.role,
            content: m.content,
        }));

        try {
            abortRef.current = new AbortController();

            const response = await fetch(apiUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messages: allMessages }),
                signal: abortRef.current.signal,
                credentials: "include",
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Server error ${response.status}: ${errorText}`);
            }

            const reader = response.body?.getReader();
            if (!reader) throw new Error("No response body");

            const decoder = new TextDecoder();
            let buffer = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() || ""; // Keep incomplete line in buffer

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed || !trimmed.startsWith("data: ")) continue;

                    const data = trimmed.slice(6); // Remove "data: "

                    try {
                        const parsed = JSON.parse(data);

                        if (parsed.type === "delta" && parsed.content) {
                            setMessages(prev => {
                                const updated = [...prev];
                                const last = updated[updated.length - 1];
                                if (last && last.role === "assistant") {
                                    updated[updated.length - 1] = {
                                        ...last,
                                        content: last.content + parsed.content,
                                    };
                                }
                                return updated;
                            });
                        } else if (parsed.type === "error") {
                            setMessages(prev => {
                                const updated = [...prev];
                                const last = updated[updated.length - 1];
                                if (last && last.role === "assistant") {
                                    updated[updated.length - 1] = {
                                        ...last,
                                        content: "Something went wrong. Please try again.",
                                    };
                                }
                                return updated;
                            });
                        }
                        // "done" type — we just let the stream end naturally
                    } catch {
                        // Non-JSON line, skip
                    }
                }
            }
        } catch (err: any) {
            if (err.name !== "AbortError") {
                console.error("Chat stream error:", err);
                setMessages(prev => {
                    const updated = [...prev];
                    const last = updated[updated.length - 1];
                    if (last && last.role === "assistant" && !last.content) {
                        updated[updated.length - 1] = {
                            ...last,
                            content: "Connection failed. Please check your network and try again.",
                        };
                    }
                    return updated;
                });
            }
        } finally {
            setIsLoading(false);
            abortRef.current = null;
        }
    }, [input, isLoading, messages, apiUrl, setMessages]);

    const stop = useCallback(() => {
        abortRef.current?.abort();
        setIsLoading(false);
    }, []);

    return {
        messages,
        setMessages,
        input,
        setInput,
        isLoading,
        sendMessage,
        stop,
    };
}
