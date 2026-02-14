
"use client"

import * as React from "react"
import { EventCard } from "./EventCard"
import { EmailDraftCard } from "./EmailDraftCard"
import { sendChat } from "@/lib/aaliyah/api"
import { useSystemStore } from "@/lib/aaliyah/store"
import { BrainCircuit, Send, Loader2 } from "lucide-react"

type ChatEvent = {
    id: string
    type: "email" | "system"
    title: string
    subtitle: string
    timestamp: string
    priority?: "high" | "medium" | "low"
    hasDraft?: boolean
    draftData?: { recipient?: string; subject?: string; body?: string } | null
    isUser?: boolean
}

export default function ChatInterface() {
    const [input, setInput] = React.useState("")
    const [isLoading, setIsLoading] = React.useState(false)
    const { setThinking, setIdle } = useSystemStore()

    // State for events (In real app, fetch from backend via React Query or SSE)
    const [events, setEvents] = React.useState<ChatEvent[]>([
        {
            id: "1",
            type: "email",
            title: "Re: Q3 Planning Meeting",
            subtitle: "Steve: Can we move the meeting to Tuesday? I have a conflict.",
            timestamp: "10:42 AM",
            priority: "medium",
            hasDraft: false
        }
    ])

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMsg = input;
        setInput(""); // Clear immediately
        setIsLoading(true);

        // Optimistic UI update
        const tempId = Date.now().toString();
        const userEvent: ChatEvent = {
            id: tempId,
            type: "system",
            title: "You",
            subtitle: userMsg,
            timestamp: "Just now",
            isUser: true
        };

        setEvents(prev => [...prev, userEvent]);

        try {
            // Call API
            const result = await sendChat(userMsg);

            // Analyze result
            // Backend returns: { reply: string, details?: { action?: string, params?: any }, ... }
            const hasDraft = result.details?.action === 'draft_email';

            const replyEvent: ChatEvent = {
                id: (Date.now() + 1).toString(),
                type: "system",
                title: "Aaliyah",
                subtitle: result.reply || "I've processed that.",
                timestamp: "Just now",
                priority: "low",
                hasDraft: hasDraft,
                draftData: hasDraft ? result.details.params : undefined
            };

            setEvents(prev => [...prev, replyEvent]);

        } catch (error) {
            console.error("Chat Failed:", error);
            const errorEvent: ChatEvent = {
                id: Date.now().toString(),
                type: "system",
                title: "System Error",
                subtitle: "I'm having trouble connecting to my brain right now. Please try again.",
                timestamp: "Just now",
                priority: "high"
            };
            setEvents(prev => [...prev, errorEvent]);
        } finally {
            setIsLoading(false);
            setIdle();
        }
    }

    return (
        <div className="max-w-3xl mx-auto pb-32 pt-10">
            <div className="space-y-0">
                {events.map((event) => (
                    <React.Fragment key={event.id}>
                        {event.isUser ? (
                            // Simple User Message Bubble
                            <div className="flex justify-end mb-6 pr-4">
                                <div className="bg-slate-100 text-slate-800 rounded-2xl px-4 py-2 max-w-[80%] text-sm">
                                    {event.subtitle}
                                </div>
                            </div>
                        ) : (
                            // Standard Event Card (Aaliyah)
                            <>
                                <EventCard
                                    type={event.type === 'system' ? 'system' : 'email'}
                                    title={event.title}
                                    subtitle={event.subtitle}
                                    timestamp={event.timestamp}
                                    priority={event.priority}
                                />

                                {event.hasDraft && event.draftData && (
                                    <EmailDraftCard
                                        to={event.draftData.recipient || "Recipient"}
                                        subject={event.draftData.subject || "Subject"}
                                        body={event.draftData.body || "No content"}
                                        onApprove={() => alert("Approved! (Mock)")}
                                        onEdit={() => alert("Edit Mode (Mock)")}
                                        onReject={() => alert("Rejected (Mock)")}
                                    />
                                )}
                            </>
                        )}
                    </React.Fragment>
                ))}

                {isLoading && (
                    <div className="flex justify-center p-4 animate-in fade-in duration-300">
                        <div className="flex items-center gap-2 text-slate-400 text-sm bg-purple-50 px-3 py-1 rounded-full border border-purple-100">
                            <BrainCircuit className="h-4 w-4 animate-pulse text-purple-600" />
                            <span className="text-purple-700 font-medium">Thinking...</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Floating Input Area */}
            <div className="fixed bottom-6 left-[var(--shell-left)] right-[var(--shell-right)] px-6">
                <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg border border-slate-200 p-2 flex gap-2 items-center focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                    <input
                        type="text"
                        placeholder="Ask Aaliyah..."
                        className="flex-1 px-4 py-2 outline-none text-slate-900 placeholder:text-slate-400 bg-transparent disabled:opacity-50"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleSend()}
                        disabled={isLoading}
                    />
                    <button
                        onClick={handleSend}
                        disabled={isLoading || !input.trim()}
                        className="bg-slate-900 text-white rounded-lg w-10 h-10 flex items-center justify-center hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </button>
                </div>
            </div>
        </div>
    )
}
