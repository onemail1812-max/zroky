"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import type { IntelligenceTab } from "@/components/aaliyah/workspace/types"

const TABS: IntelligenceTab[] = ["Research", "Sources", "Documents", "Memory", "Timeline"]

export function PanelTabs({
  activeTab,
  onChange,
}: {
  activeTab: IntelligenceTab
  onChange: (tab: IntelligenceTab) => void
}) {
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const index = TABS.indexOf(activeTab)
    if (event.key === "ArrowRight") {
      event.preventDefault()
      onChange(TABS[Math.min(TABS.length - 1, index + 1)])
    } else if (event.key === "ArrowLeft") {
      event.preventDefault()
      onChange(TABS[Math.max(0, index - 1)])
    }
  }

  return (
    <div
      role="tablist"
      aria-label="Intelligence tabs"
      className="border-b border-borderSubtle px-4 py-2 flex flex-wrap gap-2"
      onKeyDown={onKeyDown}
    >
      {TABS.map((tab) => (
        <button
          key={tab}
          type="button"
          role="tab"
          aria-selected={tab === activeTab}
          onClick={() => onChange(tab)}
          className={cn(
            "h-11 md:h-10 px-4 rounded-lg border text-[12px] font-medium transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focusRing)]",
            tab === activeTab
              ? "bg-surface border-borderSubtle text-textPrimary"
              : "bg-transparent border-transparent text-textMuted hover:bg-surfaceElevated hover:text-textPrimary"
          )}
        >
          {tab}
        </button>
      ))}
    </div>
  )
}
