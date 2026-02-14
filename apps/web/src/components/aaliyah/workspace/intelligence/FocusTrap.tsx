"use client"

import * as React from "react"

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",")

function getFocusable(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((el) => !el.hasAttribute("disabled"))
}

export function FocusTrap({
  active,
  onEscape,
  children,
}: {
  active: boolean
  onEscape?: () => void
  children: React.ReactNode
}) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const previouslyFocused = React.useRef<HTMLElement | null>(null)

  React.useEffect(() => {
    if (!active) return
    previouslyFocused.current = (document.activeElement as HTMLElement | null) ?? null

    const container = containerRef.current
    if (!container) return
    const focusables = getFocusable(container)
    const target = focusables[0] ?? container
    window.setTimeout(() => target.focus(), 0)

    return () => {
      previouslyFocused.current?.focus?.()
    }
  }, [active])

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!active) return
    if (event.key === "Escape") {
      onEscape?.()
      return
    }
    if (event.key !== "Tab") return

    const container = containerRef.current
    if (!container) return
    const focusables = getFocusable(container)
    if (focusables.length === 0) return

    const first = focusables[0]
    const last = focusables[focusables.length - 1]
    const current = document.activeElement as HTMLElement | null

    if (event.shiftKey) {
      if (!current || current === first) {
        event.preventDefault()
        last.focus()
      }
    } else {
      if (current === last) {
        event.preventDefault()
        first.focus()
      }
    }
  }

  return (
    <div ref={containerRef} onKeyDown={onKeyDown} tabIndex={-1}>
      {children}
    </div>
  )
}

