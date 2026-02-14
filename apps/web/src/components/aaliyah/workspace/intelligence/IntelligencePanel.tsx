"use client"

import * as React from "react"
import { BookOpen, Link2, ScrollText, Timer, X } from "lucide-react"

import { cn } from "@/lib/utils"
import type { IntelligenceTab } from "@/components/aaliyah/workspace/types"
import { PanelTabs } from "@/components/aaliyah/workspace/intelligence/PanelTabs"
import { PanelSection } from "@/components/aaliyah/workspace/intelligence/PanelSection"

const DEFAULT_COPY: Record<IntelligenceTab, { title: string; icon: React.ReactNode; items: string[]; empty: string }> = {
  Research: {
    title: "Research",
    icon: <BookOpen className="h-5 w-5" strokeWidth={1.5} />,
    items: [],
    empty: "No research yet. Use Analyze to generate a structured deep dive.",
  },
  Sources: {
    title: "Sources",
    icon: <Link2 className="h-5 w-5" strokeWidth={1.5} />,
    items: [],
    empty: "No sources available for this thread.",
  },
  Documents: {
    title: "Documents",
    icon: <ScrollText className="h-5 w-5" strokeWidth={1.5} />,
    items: [],
    empty: "No documents attached yet.",
  },
  Memory: {
    title: "Memory",
    icon: <BookOpen className="h-5 w-5" strokeWidth={1.5} />,
    items: [],
    empty: "No memory links for this thread.",
  },
  Timeline: {
    title: "Timeline",
    icon: <Timer className="h-5 w-5" strokeWidth={1.5} />,
    items: [],
    empty: "No timeline events recorded yet.",
  },
}

export function IntelligencePanel({
  activeTab,
  onTabChange,
  onClose,
  content,
}: {
  activeTab: IntelligenceTab
  onTabChange: (tab: IntelligenceTab) => void
  onClose: () => void
  content?: Partial<Record<IntelligenceTab, { items: string[] }>>
}) {
  const base = DEFAULT_COPY[activeTab]
  const items = content?.[activeTab]?.items ?? base.items

  return (
    <aside className="h-full w-full bg-surface border-l border-borderSubtle flex flex-col">
      <header className="h-14 border-b border-borderSubtle px-4 flex items-center justify-between">
        <div className="flex items-center gap-4 text-textSecondary">
          <span className="h-9 w-9 rounded-lg border border-borderSubtle bg-surfaceElevated flex items-center justify-center">
            {base.icon}
          </span>
          <div className="min-w-0">
            <div className="text-[13px] font-semibold text-textPrimary leading-5">Intelligence</div>
            <div className="text-[11px] text-textMuted leading-4">Hidden by default. Open when needed.</div>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close intelligence panel"
          title="Close"
          className={cn(
            "h-11 w-11 md:h-10 md:w-10 rounded-lg text-textSecondary",
            "hover:bg-surfaceElevated hover:text-textPrimary transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focusRing)]",
            "flex items-center justify-center"
          )}
        >
          <X className="h-5 w-5" strokeWidth={1.5} />
        </button>
      </header>

      <PanelTabs activeTab={activeTab} onChange={onTabChange} />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <PanelSection title={base.title} items={items} emptyLabel={base.empty} />

        <section className="rounded-xl border border-borderSubtle bg-surfaceElevated p-4">
          <div className="text-[11px] font-semibold tracking-[0.14em] text-textMuted">NOTES</div>
          <p className="mt-4 text-[13px] text-textSecondary leading-6">
            This panel preserves clarity in the main execution surface by holding evidence, sources, and deeper context in one place.
          </p>
        </section>
      </div>
    </aside>
  )
}
