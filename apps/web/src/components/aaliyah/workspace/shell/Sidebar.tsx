"use client"

import * as React from "react"
import { X } from "lucide-react"
import { LeftPanel } from "@/components/aaliyah/workspace/left/LeftPanel"
import { FocusTrap } from "@/components/aaliyah/workspace/intelligence/FocusTrap"
import type { PresenceState } from "@/components/aaliyah/workspace/left/PresenceBadge"

interface SidebarProps {
    isOpen: boolean
    onClose: () => void
    presence: PresenceState
    briefingUnread: boolean
    activeConversationId: string
    isBooting: boolean
    onOpenMorningBriefing: () => void
}

export function Sidebar({
    isOpen,
    onClose,
    presence,
    briefingUnread,
    activeConversationId,
    isBooting,
    onOpenMorningBriefing,
}: SidebarProps) {
    return (
        <>
            {/* Desktop Sidebar */}
            <nav aria-label="Main navigation" className="hidden lg:block w-[300px] shrink-0 h-full">
                <LeftPanel
                    presence={presence}
                    briefingUnread={briefingUnread}
                    selectedId={activeConversationId}
                    loading={isBooting}
                    onOpenMorningBriefing={onOpenMorningBriefing}
                />
            </nav>

            {/* Mobile Sidebar (Drawer) */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/20 lg:hidden"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) onClose()
                    }}
                >
                    <div id="mobile-sidebar" className="h-full w-[300px] max-w-[86vw] bg-surfaceElevated shadow-[0_12px_36px_rgba(26,29,35,0.08)]">
                        <div role="dialog" aria-modal="true" aria-label="Workspace sidebar">
                            <FocusTrap active onEscape={onClose}>
                                <div className="h-14 border-b border-borderSubtle px-4 flex items-center justify-between bg-surface">
                                    <span className="text-[13px] font-semibold text-textPrimary">Workspace</span>
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="h-10 w-10 rounded-lg text-textSecondary hover:bg-surfaceElevated hover:text-textPrimary flex items-center justify-center"
                                        aria-label="Close sidebar"
                                        title="Close"
                                    >
                                        <X className="h-5 w-5" strokeWidth={1.5} />
                                    </button>
                                </div>

                                <LeftPanel
                                    presence={presence}
                                    briefingUnread={briefingUnread}
                                    selectedId={activeConversationId}
                                    loading={isBooting}
                                    onOpenMorningBriefing={() => {
                                        onOpenMorningBriefing()
                                        onClose()
                                    }}
                                />
                            </FocusTrap>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
