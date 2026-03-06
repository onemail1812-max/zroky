"use client"

import * as React from "react"
import { Menu, PanelRightOpen } from "lucide-react"
import { cn } from "@/lib/utils"
import { ActionLogView } from "@/components/aaliyah/workspace/main/ActionLogView"
import { NotificationStream } from "@/components/aaliyah/workspace/NotificationStream"
import { TerminalLoader } from "@/components/aaliyah/workspace/main/TerminalLoader"
import { SyncStatusWidget } from "@/components/aaliyah/workspace/feed/SyncStatusWidget"
import { DocumentViewerPanel } from "@/components/aaliyah/workspace/viewer/DocumentViewerPanel"
import { AnimatePresence } from "framer-motion"
import type { ConversationSummary } from "@/components/aaliyah/workspace/types"

interface MainFeedProps {
    activeView: string
    isBooting: boolean
    syncProgress: any
    activeWork: ConversationSummary[]
    activeConversation: any
    isViewerOpen: boolean
    onOpenIntelligence: (tab: any) => void
    onSetConversationState: (id: string, state: any) => void
    onOpenMobileMenu: () => void
    isLeftPanelOpen: boolean
}

export function MainFeed({
    activeView,
    isBooting,
    syncProgress,
    activeWork,
    activeConversation,
    isViewerOpen,
    onOpenIntelligence,
    onSetConversationState,
    onOpenMobileMenu,
    isLeftPanelOpen,
}: MainFeedProps) {
    return (
        <main id="main-content" className="flex-1 min-w-0 lg:min-w-[720px] relative">
            {/* Mobile Menu Triggers */}
            <div className="absolute left-4 top-11 z-30 lg:hidden flex items-center gap-2">
                <button
                    type="button"
                    onClick={onOpenMobileMenu}
                    aria-expanded={isLeftPanelOpen}
                    aria-controls="mobile-sidebar"
                    className="h-11 w-11 rounded-lg border border-borderSubtle bg-surface text-textSecondary hover:bg-surfaceElevated hover:text-textPrimary flex items-center justify-center"
                    aria-label="Open sidebar"
                    title="Open sidebar"
                >
                    <Menu className="h-5 w-5" aria-hidden="true" strokeWidth={1.5} />
                </button>

                <button
                    type="button"
                    onClick={() => onOpenIntelligence("Research")}
                    className="h-11 w-11 rounded-lg border border-borderSubtle bg-surface text-textSecondary hover:bg-surfaceElevated hover:text-textPrimary flex items-center justify-center"
                    aria-label="Open intelligence panel"
                    title="Open intelligence panel"
                >
                    <PanelRightOpen className="h-5 w-5" strokeWidth={1.5} />
                </button>
            </div>

            <div className="flex h-full w-full">
                {/* Left/Main Column - Notifications/Chat */}
                <div className={cn(
                    "flex-1 h-full min-w-0 transition-all duration-300 relative pb-16 lg:pb-0",
                    isViewerOpen ? "border-r border-borderSubtle" : ""
                )}>
                    {activeView === "action_log" ? (
                        <ActionLogView />
                    ) : isBooting || (syncProgress.phase === "syncing" && activeWork.length === 0) ? (
                        <div className="absolute inset-0 z-20 flex bg-white/95 backdrop-blur-xl items-center justify-center animate-in fade-in duration-500">
                            <TerminalLoader
                                progress={syncProgress.phase === "syncing" ? (syncProgress.inbox?.progress || 45) : 12}
                                status={syncProgress.inbox?.message}
                            />
                        </div>
                    ) : (
                        <NotificationStream
                            activeConversation={activeConversation}
                            onOpenIntelligence={onOpenIntelligence}
                            onSetConversationState={onSetConversationState}
                        />
                    )}
                </div>

                {/* Right Column - Document Viewer */}
                {isViewerOpen && (
                    <div className="hidden xl:block w-1/2 h-full min-w-[400px] shrink-0 animate-in slide-in-from-right-8 duration-300">
                        <DocumentViewerPanel />
                    </div>
                )}

                {/* Slide-over viewer for smaller screens */}
                {isViewerOpen && (
                    <div className="xl:hidden fixed inset-y-0 right-0 z-50 w-full sm:w-[500px] bg-surface shadow-2xl animate-in slide-in-from-right duration-300">
                        <DocumentViewerPanel />
                    </div>
                )}
            </div>
        </main>
    )
}
