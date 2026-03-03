"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useSystemStore } from "@/lib/aaliyah/store";

export interface ChatMessage {
    id: string;
    role?: "user" | "assistant";
    content?: string;
    type?: string;
    [key: string]: any;
}

interface UseAaliyahChatOptions {
    api?: string;
    threadId?: string | null;
    emailId?: string | null;
}

function getStorageKey(threadId?: string | null, emailId?: string | null) {
    if (emailId) return `aaliyah_chat_messages_email_${emailId}`;
    return `aaliyah_chat_messages_${threadId || "global"}`;
}

function loadMessages(threadId?: string | null, emailId?: string | null): ChatMessage[] {
    if (typeof window === "undefined") return [];
    try {
        const stored = sessionStorage.getItem(getStorageKey(threadId, emailId));
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}

function saveMessages(msgs: ChatMessage[], threadId?: string | null, emailId?: string | null) {
    if (typeof window === "undefined") return;
    try {
        sessionStorage.setItem(getStorageKey(threadId, emailId), JSON.stringify(msgs));
    } catch {
        // Storage full or unavailable
    }
}

/**
 * Custom chat hook — bulletproof SSE streaming.
 * Persists messages in sessionStorage so they survive tab switches.
 */
export function useAaliyahChat(options?: UseAaliyahChatOptions) {
    const threadId = options?.threadId;
    const emailId = options?.emailId;
    const [messages, setMessagesRaw] = useState<ChatMessage[]>(() => loadMessages(threadId, emailId));
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const abortRef = useRef<AbortController | null>(null);
    const apiUrl = options?.api || "/assist/chat";

    // Reload messages when threadId changes
    useEffect(() => {
        const fetchHistory = async () => {
            setIsLoading(true);
            try {
                const emailParam = emailId ? `&email_id=${emailId}` : "";
                const threadParam = threadId ? `thread_id=${threadId}` : "";
                const url = `/assist/history?${threadParam}${emailParam}`;
                const res = await fetch(url, { credentials: "include" });
                if (res.ok) {
                    const data = await res.json();
                    if (data && Array.isArray(data)) {
                        setMessagesRaw(prev => {
                            // Prevent backend empty array from overwriting the locally injected Welcome Message
                            if (data.length === 0 && prev.length > 0) return prev;
                            saveMessages(data, threadId, emailId);
                            return data;
                        });
                    }
                } else {
                    // Fallback to local
                    setMessagesRaw(prev => prev.length > 0 ? prev : loadMessages(threadId, emailId));
                }
            } catch (err) {
                setMessagesRaw(prev => prev.length > 0 ? prev : loadMessages(threadId, emailId));
            } finally {
                setIsLoading(false);
            }
        };

        fetchHistory();
    }, [threadId, emailId]);

    const setMessages = useCallback((updater: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => {
        setMessagesRaw(prev => {
            const next = typeof updater === "function" ? updater(prev) : updater;
            saveMessages(next, threadId, emailId);
            return next;
        });
    }, [threadId, emailId]);

    const sendMessage = useCallback(async (userInput?: string, attachments?: any[]) => {
        const text = (userInput || input).trim();
        if ((!text && (!attachments || attachments.length === 0)) || isLoading) return;

        const currentThreadId = options?.threadId;

        const health = useSystemStore.getState().connectionHealth;

        // Only block when health is completely unknown (still initializing)
        // When disconnected, the backend handles smart intent routing (limited mode)
        if (health === null) {
            setInput("");
            const userMsg: ChatMessage = {
                id: `user-blocked-${Date.now()}`,
                role: "user",
                content: text,
                attachments: attachments,
                threadId: currentThreadId,
            };
            const assistantMsg: ChatMessage = {
                id: `assistant-blocked-${Date.now()}`,
                role: "assistant",
                content: "I'm still initializing and checking your account status. Give me a moment, then try again.",
            };
            setMessages(prev => [...prev, userMsg, assistantMsg]);
            return;
        }

        // Add user message
        const userMsg: ChatMessage = {
            id: `user-${Date.now()}`,
            role: "user",
            content: text,
            attachments: attachments,
            threadId: currentThreadId,
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
        // Sanitization: Ensure role and content are valid, filter out non-textual UI types
        const allMessages = [...messages, userMsg]
            .filter(m => m.role === "user" || (m.role === "assistant" && (m.content || m.type === "text")))
            .map(m => ({
                role: m.role,
                content: String(m.content || ""),
                attachments: m.attachments,
            }));

        try {
            abortRef.current = new AbortController();

            const response = await fetch(apiUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: allMessages,
                    thread_id: currentThreadId,
                    email_id: emailId
                }),
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

                        if ((parsed.type === "delta" || parsed.type === "chunk") && parsed.content) {

                            // JSON Object Guard: if the chunk sent raw JSON, extract readable text
                            let cleanContent = parsed.content;
                            if (typeof cleanContent === 'string' && (cleanContent.trim().startsWith('{') || cleanContent.trim().startsWith('['))) {
                                try {
                                    const obj = JSON.parse(cleanContent);
                                    if (typeof obj === "object" && obj !== null && !Array.isArray(obj)) {
                                        cleanContent = obj.answer_text || obj.reply || obj.summary || obj.body || obj.message || obj.content || cleanContent;
                                    }
                                } catch (e) {
                                    // Not valid JSON, leave as is
                                }
                            }

                            setMessages(prev => {
                                const updated = [...prev];
                                const last = updated[updated.length - 1];
                                if (last && last.role === "assistant" && last.type !== "email_action") {
                                    updated[updated.length - 1] = {
                                        ...last,
                                        content: (last.content || "") + cleanContent,
                                    };
                                }
                                return updated;
                            });
                        } else if (parsed.type === "email_action" || parsed.type === "compose_action") {
                            // Enterprise Rich Action Card
                            setMessages(prev => {
                                const updated = [...prev];
                                // We push a new special message for the action card
                                updated.push({
                                    id: `action-${Date.now()}`,
                                    role: "assistant",
                                    type: parsed.type,
                                    payload: parsed.payload
                                });
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
        } catch (err: unknown) {
            const e = err as Error;
            if (e.name !== "AbortError") {
                console.error("Chat stream error:", e);
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
            // Cleanup: remove empty assistant bubbles (stream ended with no content)
            setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last && last.role === "assistant" && !last.content && !last.type) {
                    return prev.slice(0, -1);
                }
                return prev;
            });
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
