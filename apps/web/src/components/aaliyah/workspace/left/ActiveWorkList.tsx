"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import type { ConversationSummary } from "@/components/aaliyah/workspace/types"
import { ActiveWorkItem } from "@/components/aaliyah/workspace/left/ActiveWorkItem"

function groupLabel(item: ConversationSummary) {
  if (item.status === "Completed") return "Completed"
  if (item.timestamp.toLowerCase().includes("yesterday")) return "Yesterday"
  return "Today"
}

function SkeletonRow() {
  return (
    <div className="rounded-lg border border-borderSubtle bg-surface px-4 py-4">
      <div className="h-3 w-2/3 rounded bg-borderSubtle opacity-70" />
      <div className="mt-2 h-3 w-5/6 rounded bg-borderSubtle opacity-60" />
    </div>
  )
}

export function ActiveWorkList({
  items,
  selectedId,
  loading,
  onOpen,
}: {
  items: ConversationSummary[]
  selectedId: string
  loading?: boolean
  onOpen: (id: string) => void
}) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const itemRefs = React.useRef<Array<HTMLButtonElement | null>>([])

  const grouped = React.useMemo(() => {
    const groups: Record<string, ConversationSummary[]> = {}
    for (const item of items) {
      const key = groupLabel(item)
      if (!groups[key]) groups[key] = []
      groups[key].push(item)
    }

    const order = ["Today", "Yesterday", "Completed"]
    return order
      .filter((key) => (groups[key] || []).length > 0)
      .map((key) => ({ key, items: groups[key] }))
  }, [items])

  const flatItems = React.useMemo(() => grouped.flatMap((g) => g.items), [grouped])
  const indexById = React.useMemo(() => new Map(flatItems.map((item, index) => [item.id, index])), [flatItems])

  const focusIndex = (index: number) => {
    const btn = itemRefs.current[index]
    if (btn) btn.focus()
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (flatItems.length === 0) return
    const activeId = (document.activeElement as HTMLElement | null)?.getAttribute?.("data-item-id") ?? null
    const currentIndex = activeId ? (indexById.get(activeId) ?? -1) : -1

    if (event.key === "ArrowDown") {
      event.preventDefault()
      focusIndex(Math.min(flatItems.length - 1, currentIndex + 1 <= 0 ? 0 : currentIndex + 1))
    } else if (event.key === "ArrowUp") {
      event.preventDefault()
      focusIndex(currentIndex <= 0 ? flatItems.length - 1 : Math.max(0, currentIndex - 1))
    } else if (event.key === "Home") {
      event.preventDefault()
      focusIndex(0)
    } else if (event.key === "End") {
      event.preventDefault()
      focusIndex(flatItems.length - 1)
    } else if (event.key === "Enter") {
      event.preventDefault()
      const item = flatItems[Math.max(0, currentIndex)]
      if (item) onOpen(item.id)
    }
  }

  return (
    <section>
      <h3 className="text-[11px] font-semibold tracking-[0.14em] text-textMuted">ACTIVE WORK</h3>

      <div
        ref={containerRef}
        className="mt-2"
        role="listbox"
        aria-label="Active work"
        tabIndex={0}
        onKeyDown={onKeyDown}
      >
        {loading && (
          <div className="space-y-2 animate-pulse">
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </div>
        )}

        {!loading && flatItems.length === 0 && (
          <div className="rounded-lg border border-borderSubtle bg-surface p-4 text-[13px] text-textSecondary">
            All clear for now.
          </div>
        )}

        {!loading &&
          grouped.map((group) => (
            <div key={group.key} className={cn("space-y-2", group.key !== grouped[0]?.key && "mt-4")}>
              <div className="text-[11px] font-medium text-textMuted">{group.key}</div>
              <div className="space-y-2">
                {group.items.map((item) => {
                  const index = indexById.get(item.id) ?? 0
                  return (
                    <ActiveWorkItem
                      key={item.id}
                      item={item}
                      selected={item.id === selectedId}
                      onOpen={onOpen}
                      buttonRef={(node) => {
                        itemRefs.current[index] = node
                        if (node) node.setAttribute("data-item-id", item.id)
                      }}
                    />
                  )
                })}
              </div>
            </div>
          ))}
      </div>
    </section>
  )
}
