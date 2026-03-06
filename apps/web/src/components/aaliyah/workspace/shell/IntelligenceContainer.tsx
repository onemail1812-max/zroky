"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { IntelligencePanel } from "@/components/aaliyah/workspace/intelligence/IntelligencePanel"
import { SlideOver } from "@/components/aaliyah/workspace/intelligence/SlideOver"
import { BottomSheet } from "@/components/aaliyah/workspace/intelligence/BottomSheet"
import type { IntelligenceTab } from "@/components/aaliyah/workspace/types"

interface IntelligenceContainerProps {
    isOpen: boolean
    onClose: () => void
    activeTab: IntelligenceTab
    onTabChange: (tab: IntelligenceTab) => void
    isDesktop: boolean
    isTabletUp: boolean
}

export function IntelligenceContainer({
    isOpen,
    onClose,
    activeTab,
    onTabChange,
    isDesktop,
    isTabletUp,
}: IntelligenceContainerProps) {
    if (!isOpen) return null

    return (
        <>
            {/* Desktop View */}
            {isDesktop && (
                <aside className="hidden lg:block shrink-0 overflow-hidden transition-[width] duration-300 w-[420px]">
                    <div role="complementary" aria-label="Intelligence and research" className="h-full w-[420px]">
                        <IntelligencePanel
                            activeTab={activeTab}
                            onTabChange={onTabChange}
                            onClose={onClose}
                        />
                    </div>
                </aside>
            )}

            {/* Mobile/Tablet View */}
            {!isDesktop && (
                isTabletUp ? (
                    <SlideOver open={isOpen} onClose={onClose}>
                        <IntelligencePanel
                            activeTab={activeTab}
                            onTabChange={onTabChange}
                            onClose={onClose}
                        />
                    </SlideOver>
                ) : (
                    <BottomSheet open={isOpen} onClose={onClose}>
                        <IntelligencePanel
                            activeTab={activeTab}
                            onTabChange={onTabChange}
                            onClose={onClose}
                        />
                    </BottomSheet>
                )
            )}
        </>
    )
}
