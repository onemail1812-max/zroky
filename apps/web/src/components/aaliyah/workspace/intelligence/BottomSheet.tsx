"use client"

import * as React from "react"

import { FocusTrap } from "@/components/aaliyah/workspace/intelligence/FocusTrap"

export function BottomSheet({
  open,
  onClose,
  children,
}: {
  open: boolean
  onClose: () => void
  children: React.ReactNode
}) {
  React.useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-black/20"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      role="presentation"
    >
      <div className="absolute inset-x-0 bottom-0 h-[72vh] rounded-t-xl border-t border-borderSubtle bg-surface shadow-[0_-12px_36px_rgba(26,29,35,0.08)] animate-slide-up-soft">
        <div role="dialog" aria-modal="true" aria-label="Intelligence panel">
          <FocusTrap active onEscape={onClose}>
            {children}
          </FocusTrap>
        </div>
      </div>
    </div>
  )
}
