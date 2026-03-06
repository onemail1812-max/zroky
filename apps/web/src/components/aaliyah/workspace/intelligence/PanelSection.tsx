"use client"

import * as React from "react"
import { EmptyState } from "@/components/ui/EmptyState"
import { Info } from "lucide-react"

export function PanelSection({
  title,
  items,
  emptyLabel,
}: {
  title: string
  items: string[]
  emptyLabel: string
}) {
  return (
    <section className="rounded-xl border border-borderSubtle bg-surface p-4">
      <div className="text-[11px] font-semibold tracking-[0.14em] text-textMuted">{title.toUpperCase()}</div>
      {items.length === 0 ? (
        <div className="mt-4 rounded-xl border border-borderSubtle bg-white/40 overflow-hidden">
          <EmptyState
            icon={Info}
            title="No Data"
            description={emptyLabel}
            className="p-4 py-8"
          />
        </div>
      ) : (
        <ul className="mt-4 space-y-2 text-[13px] text-textSecondary leading-6">
          {items.map((item) => (
            <li key={item} className="pl-4 relative">
              <span className="absolute left-0 top-[10px] h-1 w-1 rounded-full bg-textMuted" aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
