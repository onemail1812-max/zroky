"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useSystemStore } from "@/lib/aaliyah/store";
import { handleUnauthorized } from "@/lib/aaliyah/api";

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
    } catch (e) {
        // [Audit Fix] Handle QuotaExceededError (sessionStorage full)
        console.warn("sessionStorage full, pruning old chat history...");
        try {
            // Prune old aaliyah chat keys to make space
            Object.keys(sessionStorage)
                .filter(k => k.startsWith("aaliyah_chat_messages_"))
                .sort() // Simple FIFO-ish by key name or timestamp if we had it
                .slice(0, 5)
                .forEach(k => sessionStorage.removeItem(k));

            sessionStorage.setItem(getStorageKey(threadId, emailId), JSON.stringify(msgs));
        } catch {
            // Still failing? Just give up to prevent crash
        }
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
    const manualAbortRef = useRef(false);
    const apiUrl = options?.api || "/api/v1/assist/chat";

    // Reload messages when threadId changes
    useEffect(() => {
        const fetchHistory = async (signal?: AbortSignal) => {
            setIsLoading(true);
            try {
                const emailParam = emailId ? `&email_id=${emailId}` : "";
                const threadParam = threadId ? `thread_id=${threadId}` : "";
                const url = `/api/v1/assist/history?${threadParam}${emailParam}`;

                // [Audit Fix] Fetch auth token dynamically for history calls to ensure Clerk compatibility
                let authHeaders: Record<string, string> = { "Content-Type": "application/json" };
                if (typeof window !== "undefined" && (window as any).Clerk?.session) {
                    try {
                        const token = await (window as any).Clerk.session.getToken();
                        if (token) authHeaders["Authorization"] = `Bearer ${token}`;
                    } catch { /* fallback to cookie auth */ }
                }

                const res = await fetch(url, {
                    headers: authHeaders,
                    credentials: "include",
                    signal
                });
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
                    if (res.status === 401) {
                        handleUnauthorized();
                    }
                    // Fallback to local
                    setMessagesRaw(prev => prev.length > 0 ? prev : loadMessages(threadId, emailId));
                }
            } catch (err) {
                if ((err as Error).name === 'AbortError') return;
                setMessagesRaw(prev => prev.length > 0 ? prev : loadMessages(threadId, emailId));
            } finally {
                setIsLoading(false);
            }
        };

        const controller = new AbortController();
        fetchHistory(controller.signal);

        return () => {
            controller.abort();
        };
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

        const { connectionHealth, isLiveOffline, isBackendConnected } = useSystemStore.getState();
        const isOnline = typeof window !== "undefined" ? navigator.onLine : true;
        const isFullyConnected = isOnline && isBackendConnected && !isLiveOffline;

        // Only block when health is completely unknown (still initializing) OR fully offline
        if (connectionHealth === null || !isFullyConnected) {
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
                content: !isOnline
                    ? "You are currently offline. Please check your internet connection to continue chatting with Aaliyah."
                    : "I've lost connection to Aaliyah Core. I'm trying to reconnect now... please wait a moment.",
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

        const attemptFetch = async (retryCount = 0) => {
            try {
                manualAbortRef.current = false;
                abortRef.current = new AbortController();

                // Get auth token dynamically for direct API calls
                let authHeaders: Record<string, string> = {
                    "Content-Type": "application/json",
                    "X-Zroky-CSRF": "1" // satisfy backend CSRF protection for POST requests
                };
                if (typeof window !== "undefined" && (window as any).Clerk?.session) {
                    try {
                        const token = await (window as any).Clerk.session.getToken();
                        if (token) authHeaders["Authorization"] = `Bearer ${token}`;
                    } catch { /* fallback to cookie auth */ }
                }

                const decoder = new TextDecoder();
                let buffer = "";
                let timeoutId: NodeJS.Timeout | null = null;

                const resetTimeout = (ms = 30000) => {
                    if (timeoutId) clearTimeout(timeoutId);
                    timeoutId = setTimeout(() => {
                        if (abortRef.current && !manualAbortRef.current) {
                            console.warn("Frontend Chat Timeout: Server hung for over 30s.");
                            abortRef.current.abort(new Error("Timeout"));
                        }
                    }, ms);
                };

                // Watchdog: Start timeout BEFORE fetch to catch connection hangs
                resetTimeout(30000);

                const response = await fetch(apiUrl, {
                    method: "POST",
                    headers: authHeaders,
                    body: JSON.stringify({
                        messages: allMessages,
                        thread_id: currentThreadId,
                        email_id: emailId,
                        workspace_id: typeof window !== "undefined" ? (window.localStorage.getItem("workspace_id") || window.localStorage.getItem("x_workspace_id") || "default") : "default"
                    }),
                    signal: abortRef.current.signal,
                    credentials: "include",
                });

                if (!response.ok) {
                    if (timeoutId) clearTimeout(timeoutId);
                    if (response.status === 401) {
                        handleUnauthorized();
                    }
                    const errorText = await response.text();
                    throw new Error(`Server error ${response.status}: ${errorText}`);
                }

                const reader = response.body?.getReader();
                if (!reader) throw new Error("No response body");

                while (true) {
                    const { done, value } = await reader.read();
                    resetTimeout();

                    if (done) {
                        if (timeoutId) clearTimeout(timeoutId);
                        break;
                    }

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
                if (manualAbortRef.current) {
                    return; // Ignored manual abort
                }

                if (retryCount < 3) {
                    console.warn(`Chat stream error (Attempt ${retryCount + 1}/3):`, e);
                    await new Promise(r => setTimeout(r, 1000 * Math.pow(2, retryCount))); // Exponential backoff
                    await attemptFetch(retryCount + 1);
                } else {
                    console.error("Chat stream error max retries reached:", e);
                    const isTimeout = e.message.includes("Timeout") || e.name === "AbortError" && !manualAbortRef.current;
                    setMessages(prev => {
                        const updated = [...prev];
                        const last = updated[updated.length - 1];
                        if (last && last.role === "assistant" && !last.content) {
                            updated[updated.length - 1] = {
                                ...last,
                                content: isTimeout
                                    ? "Aaliyah is taking longer than usual to respond. Please check your connection or try again later."
                                    : "Connection failed after multiple attempts. Please try again.",
                            };
                        }
                        return updated;
                    });
                }
            }
        };

        await attemptFetch(0);

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
    }, [input, isLoading, messages, apiUrl, setMessages, options?.threadId, emailId]);

    const stop = useCallback(() => {
        manualAbortRef.current = true;
        abortRef.current?.abort();
        setIsLoading(false);
    }, []);

    // Global unmount cleanup
    useEffect(() => {
        return () => {
            if (abortRef.current) {
                abortRef.current.abort();
            }
        };
    }, []);

    // Global listener for injecting text into the chat input
    useEffect(() => {
        const handleChatInput = (e: Event) => {
            const customEvent = e as CustomEvent;
            if (customEvent.detail) {
                // Instantly update the chat input
                setInput(customEvent.detail);

                // Optional: find the DOM element and focus it
                setTimeout(() => {
                    const chatBar = document.querySelector('textarea[placeholder*="Ask"], input[placeholder*="Ask"]') as HTMLInputElement;
                    if (chatBar) chatBar.focus();
                }, 100);
            }
        };

        window.addEventListener('aaliyah_chat_input', handleChatInput);
        return () => window.removeEventListener('aaliyah_chat_input', handleChatInput);
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
