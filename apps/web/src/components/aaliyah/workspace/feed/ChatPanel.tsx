"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { BrainCircuit, ArrowRight } from "lucide-react"
import { ChatMessage } from "./ChatMessage"
import { SyncStatusWidget } from "./SyncStatusWidget"
import { DisconnectedGuide } from "./DisconnectedGuide"

interface ChatPanelProps {
    messages: any[]
    isLoading: boolean
    syncProgress: any
    showSyncWidget: boolean
    onDismissSync: () => void
    onboardingComplete: boolean
    onOpenOnboarding: () => void
    connectionHealth: any
    onOpenSettings: () => void
    feedScrollRef: React.RefObject<HTMLDivElement | null>
}

export const ChatPanel = React.memo(function ChatPanel({
    messages,
    isLoading,
    syncProgress,
    showSyncWidget,
    onDismissSync,
    onboardingComplete,
    onOpenOnboarding,
    connectionHealth,
    onOpenSettings,
    feedScrollRef,
}: ChatPanelProps) {
    return (
        <div className="flex-1 h-full w-full relative flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Native Scrollable Feed */}
            <div
                ref={feedScrollRef}
                className="flex-1 w-full overflow-y-auto custom-scrollbar relative z-10"
                style={{ overscrollBehavior: 'contain' }}
            >
                <div className="min-h-full flex flex-col justify-end">
                    {/* Header content (Sync Widget & Onboarding) */}
                    <div className="max-w-5xl mx-auto pt-8 px-4 md:px-8 space-y-4 w-full shrink-0">
                        <AnimatePresence>
                            {showSyncWidget && syncProgress.phase !== "idle" && (
                                <SyncStatusWidget
                                    onDismiss={onDismissSync}
                                />
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Message List */}
                    <div className="flex-1 flex flex-col">
                        {messages.map((m) => (
                            <div key={m.id} className="max-w-5xl mx-auto px-4 md:px-8 w-full shrink-0">
                                <ChatMessage
                                    role={m.role as any}
                                    content={m.content}
                                    type={m.type}
                                    payload={m.payload}
                                />
                            </div>
                        ))}
                        {/* Begin Setup Button — directly below the greeting */}
                        {!onboardingComplete && (
                            <div className="max-w-5xl mx-auto px-4 md:px-8 w-full shrink-0 mt-2">
                                <div className="flex w-full gap-3 pl-11">
                                    <button
                                        onClick={onOpenOnboarding}
                                        className="px-6 py-3 bg-zinc-900 text-white rounded-2xl text-sm font-bold hover:bg-black transition-all active:scale-95 shadow-lg hover:shadow-zinc-900/20 flex items-center gap-2"
                                    >
                                        Begin Setup
                                        <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer (Typing Indicator) */}
                    <div className="pb-32 px-4 md:px-8 max-w-5xl mx-auto w-full shrink-0 mt-auto">
                        {isLoading && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
                            <ChatMessage
                                role="assistant"
                                content="..."
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* Empty State / Disconnected Guide */}
            {messages.length === 0 && syncProgress.phase === "idle" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 z-0">
                    {connectionHealth !== null && !connectionHealth?.email_accessible ? (
                        <DisconnectedGuide onOpenSettings={onOpenSettings} />
                    ) : (
                        <div className="pointer-events-auto">
                            <div className="h-16 w-16 rounded-full bg-zinc-50 border border-zinc-100 flex items-center justify-center mb-6 mx-auto">
                                <BrainCircuit className="h-8 w-8 text-zinc-300" />
                            </div>
                            <h2 className="text-lg font-bold text-zinc-900 mb-2">Aaliyah Intelligence</h2>
                            <p className="text-sm text-zinc-400 max-w-sm mx-auto">
                                Ask me to search your emails, check your calendar, or manage your commitments.
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
})
