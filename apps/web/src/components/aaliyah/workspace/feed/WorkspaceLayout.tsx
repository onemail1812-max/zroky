"use client"

import * as React from "react"
import { AnimatePresence } from "framer-motion"
import { CornerUpLeft, Loader2 } from "lucide-react"
import { useSystemStore } from "@/lib/aaliyah/store"
import { cn } from "@/lib/utils"
import { SkeletonEmail, SkeletonEmailBody } from "@/components/ui/Skeleton"
import { PanelErrorBoundary } from "../../ui/PanelErrorBoundary"
import { ChatInput } from "./ChatInput"
import { useWorkspaceEffects } from "./useWorkspaceEffects"
import { WorkspaceLoader } from "./WorkspaceLoader"
import { HealthRibbon } from "./HealthRibbon"
import { ToastStack } from "./ToastStack"
import { WorkspaceOverlays } from "./WorkspaceOverlays"

// Lazy-loaded panels
const AttachmentViewer = React.lazy(() => import('./AttachmentViewer').then(m => ({ default: m.AttachmentViewer })))
const LeftSidebar = React.lazy(() => import('./LeftSidebar').then(m => ({ default: m.LeftSidebar })))
const ThreadPanel = React.lazy(() => import('./ThreadPanel').then(m => ({ default: m.ThreadPanel })))
const ReaderPanel = React.lazy(() => import('./ReaderPanel').then(m => ({ default: m.ReaderPanel })))
const ChatPanel = React.lazy(() => import('./ChatPanel').then(m => ({ default: m.ChatPanel })))

// ── Main Layout ─────────────────────────────────────────────────────
function WorkspaceLayoutInner() {
    const {
        // Onboarding
        onboardingChecked, onboardingComplete, firstName,
        onboardingOpen, setOnboardingOpen,
        // Chat
        messages, setMessages, input, setInput, isLoading, sendMessage,
        // Workspace UI state
        settingsOpen, setSettingsOpen,
        guidelinesOpen, setGuidelinesOpen,
        diagnosticsOpen, setDiagnosticsOpen, diagnosticsLogs,
        activeAttachment, setActiveAttachment,
        activeEmailId, setActiveEmailId,
        queueOpen,
        workingStatus, showSyncWidget, setShowSyncWidget,
        refreshTrigger, setRefreshTrigger,
        toasts, seenDemoIds,
        // Handlers
        handleNavigate, handleMainClick, handleThreadSelect,
        // Ref
        feedScrollRef,
    } = useWorkspaceEffects()

    const {
        connectionHealth,
        threadSelection,
        setThreadSelection,
        activeTriageQueue,
        syncProgress,
    } = useSystemStore()

    const uiCounts: Record<string, number> = {
        priority: useSystemStore(state => state.priorityCount),
        needs_reply: useSystemStore(state => state.queuedCount),
        approvals: useSystemStore(state => state.pendingApprovals),
        follow_ups: useSystemStore(state => state.escalations),
    }

    // ── Loading Gate ──
    if (!onboardingChecked) {
        return <WorkspaceLoader />
    }

    return (
        <div className="flex h-screen bg-white overflow-hidden relative">
            <style dangerouslySetInnerHTML={{
                __html: `
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 10px; }
            `}} />

            {/* 1. Left Panel: Navigation Sidebar */}
            <div className="hidden md:flex w-56 shrink-0 flex-col">
                <React.Suspense fallback={null}>
                    <LeftSidebar
                        onOpenGuidelines={() => setGuidelinesOpen(true)}
                        onOpenSettings={() => setSettingsOpen(true)}
                        onNavigate={handleNavigate}
                        disabled={!connectionHealth?.email_accessible}
                        isConnected={connectionHealth?.email_accessible ?? false}
                    />
                </React.Suspense>
            </div>

            {/* 2. Thread List Panel */}
            <PanelErrorBoundary name="Queue List" className="w-full md:w-[340px] shrink-0 border-r border-borderSubtle">
                <React.Suspense fallback={
                    <div className={cn("hidden md:flex shrink-0 border-r border-borderSubtle bg-zinc-50/50 flex-col transition-all duration-300", queueOpen ? "w-[340px]" : "w-0 overflow-hidden")}>
                        <div className="flex-1 overflow-hidden opacity-50 space-y-0.5">
                            <SkeletonEmail />
                            <SkeletonEmail />
                            <SkeletonEmail />
                            <SkeletonEmail />
                            <SkeletonEmail />
                        </div>
                    </div>
                }>
                    <ThreadPanel
                        isOpen={queueOpen}
                        activeTriageQueue={activeTriageQueue}
                        selectedId={threadSelection?.id}
                        onSelect={handleThreadSelect}
                        refreshTrigger={refreshTrigger}
                        seenDemoIds={seenDemoIds}
                        isConnected={connectionHealth?.email_accessible ?? false}
                        onConnect={() => setSettingsOpen(true)}
                    />
                </React.Suspense>
            </PanelErrorBoundary>

            {/* 3. Main Panel: Conversation Workspace */}
            <main className="flex-1 h-full min-w-0 flex flex-col bg-white overflow-hidden relative" onClick={handleMainClick}>
                {/* Header */}
                <header className="h-16 border-b border-borderSubtle bg-white/80 backdrop-blur-xl flex items-center justify-between px-6 shrink-0 z-10 sticky top-0 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                    <div className="flex items-center gap-3 text-sm min-w-0 flex-1 overflow-hidden">
                        {threadSelection && (
                            <div className="flex items-center gap-3">
                                <button
                                    className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50 rounded-lg transition-colors border border-zinc-100"
                                    onClick={() => {
                                        setThreadSelection(null)
                                        setActiveAttachment(null)
                                    }}
                                >
                                    <CornerUpLeft className="h-4 w-4" />
                                </button>
                                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em]">Message Detail</span>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-4 shrink-0 px-2" />
                </header>

                {/* Health Ribbon */}
                <HealthRibbon
                    visible={connectionHealth !== null && !connectionHealth?.email_accessible}
                    onOpenSettings={() => setSettingsOpen(true)}
                />

                {/* Content Area */}
                <React.Suspense fallback={
                    <div className="flex-1 flex flex-col px-10 py-10 opacity-60">
                        <SkeletonEmailBody />
                    </div>
                }>
                    {threadSelection ? (
                        <PanelErrorBoundary name="Reader" className="flex-1">
                            <ReaderPanel
                                thread={threadSelection}
                                messages={messages}
                                isLoading={isLoading}
                                activeEmailId={activeEmailId}
                                onAttachmentClick={setActiveAttachment}
                                onAction={() => {
                                    setThreadSelection(null)
                                    setActiveAttachment(null)
                                    setActiveEmailId(null)
                                    setRefreshTrigger(t => t + 1)
                                }}
                                onEmailChat={setActiveEmailId}
                            />
                        </PanelErrorBoundary>
                    ) : (
                        <PanelErrorBoundary name="Intelligence" className="flex-1">
                            <ChatPanel
                                messages={messages}
                                isLoading={isLoading}
                                syncProgress={syncProgress}
                                showSyncWidget={showSyncWidget}
                                onDismissSync={() => setShowSyncWidget(false)}
                                onboardingComplete={onboardingComplete}
                                onOpenOnboarding={() => setOnboardingOpen(true)}
                                connectionHealth={connectionHealth}
                                onOpenSettings={() => setSettingsOpen(true)}
                                feedScrollRef={feedScrollRef}
                            />
                        </PanelErrorBoundary>
                    )}
                </React.Suspense>

                {/* Chat Input */}
                <div className="shrink-0 border-t border-zinc-100 px-6 py-4 bg-white relative z-20">
                    <div className="max-w-3xl mx-auto w-full">
                        <ChatInput
                            value={input}
                            onChange={setInput}
                            onSubmit={(e, attachments) => sendMessage(undefined, attachments)}
                            isLoading={isLoading}
                            placeholder={
                                threadSelection
                                    ? (activeEmailId ? "Ask about this email..." : `Reply about "${threadSelection.subject?.slice(0, 40)}"...`)
                                    : syncProgress.phase !== "idle"
                                        ? "Syncing..."
                                        : connectionHealth !== null && !connectionHealth?.email_accessible
                                            ? "Limited mode — ask me anything general..."
                                            : "Ask Aaliyah anything..."
                            }
                        />
                    </div>
                </div>
            </main>

            {/* 4. Attachment Viewer Overlay */}
            <React.Suspense fallback={null}>
                <AnimatePresence>
                    {activeAttachment && (
                        <AttachmentViewer
                            attachment={activeAttachment}
                            allAttachments={threadSelection?.attachments || []}
                            onClose={() => setActiveAttachment(null)}
                            onNavigate={setActiveAttachment}
                        />
                    )}
                </AnimatePresence>
            </React.Suspense>

            {/* Toasts */}
            <ToastStack toasts={toasts} />

            {/* Overlays */}
            <WorkspaceOverlays
                settingsOpen={settingsOpen}
                onCloseSettings={() => setSettingsOpen(false)}
                onboardingOpen={onboardingOpen}
                onCloseOnboarding={() => setOnboardingOpen(false)}
                onOnboardingComplete={() => {
                    setOnboardingOpen(false)
                    setMessages([{
                        id: `onboarding_done_${Date.now()}`,
                        role: "assistant",
                        content: `${firstName ? `Perfect, ${firstName}.` : `Perfect.`} Setup complete. I'm active and **ready to work**.\n\n**Here's what I'll do:**\n- Triage your inbox and surface what needs attention\n- Draft replies and follow-ups in your voice\n- Keep your calendar organized\n\nYou will see me in action as soon as you receive a new email. In the meantime, just ask me anything.`,
                    }])
                }}
                diagnosticsOpen={diagnosticsOpen}
                onCloseDiagnostics={() => setDiagnosticsOpen(false)}
                diagnosticsLogs={diagnosticsLogs}
            />
        </div>
    )
}

export function WorkspaceLayout() {
    return (
        <PanelErrorBoundary name="Workspace">
            <WorkspaceLayoutInner />
        </PanelErrorBoundary>
    )
}
