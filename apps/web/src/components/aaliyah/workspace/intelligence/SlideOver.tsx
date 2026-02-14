"use client"

import * as React from "react"

import { FocusTrap } from "@/components/aaliyah/workspace/intelligence/FocusTrap"

export function SlideOver({
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
      <div className="absolute right-0 top-0 h-full w-[420px] max-w-[92vw] bg-surface border-l border-borderSubtle shadow-[0_12px_36px_rgba(26,29,35,0.08)] animate-slide-in-soft">
        <div role="dialog" aria-modal="true" aria-label="Intelligence panel">
          <FocusTrap active onEscape={onClose}>
            {children}
          </FocusTrap>
        </div>
      </div>
    </div>
  )
}
