"use client"

import * as React from "react"
import { ArrowUp, Mic, Paperclip, Slash } from "lucide-react"

import { cn } from "@/lib/utils"

function ComposerIconButton({
  title,
  onClick,
  disabled,
  children,
}: {
  title: string
  onClick?: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={title}
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "h-9 w-9 rounded-full text-textSecondary flex items-center justify-center transition-all duration-200",
        "hover:bg-surfaceElevated hover:text-textPrimary hover:shadow-sm",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focusRing)]",
        disabled && "opacity-40 cursor-not-allowed hover:bg-transparent hover:shadow-none"
      )}
    >
      {children}
    </button>
  )
}

export function Composer({
  value,
  disabled,
  onChange,
  onSend,
}: {
  value: string
  disabled: boolean
  onChange: (value: string) => void
  onSend: () => void
}) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }, [value])

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 px-4 pb-8 md:px-0 md:pb-10 flex justify-center z-20">
      <div className="pointer-events-auto w-full max-w-3xl rounded-2xl border border-borderSubtle bg-surface shadow-[0_8px_40px_-12px_rgba(0,0,0,0.1)] transition-all hover:shadow-[0_12px_48px_-12px_rgba(0,0,0,0.12)] hover:border-borderStrong">
        <div className="flex items-end gap-3 p-3">
          <div className="flex gap-1 pb-1">
            <ComposerIconButton title="Commands">
              <Slash className="h-4 w-4" strokeWidth={2} />
            </ComposerIconButton>
            <ComposerIconButton title="Attach" disabled={disabled}>
              <Paperclip className="h-4 w-4" strokeWidth={2} />
            </ComposerIconButton>
          </div>

          <textarea
            ref={textareaRef}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault()
                onSend()
              }
            }}
            rows={1}
            placeholder="Review Q3 strategy..."
            aria-label="Message to Aaliyah"
            data-testid="composer-textarea"
            className="flex-1 max-h-[200px] bg-transparent py-2.5 text-[15px] leading-relaxed text-textPrimary placeholder:text-textMuted/60 focus:outline-none resize-none scrollbar-hide"
          />

          <div className="flex items-end gap-2 pb-1">
            <button
              type="button"
              onClick={onSend}
              aria-label="Send"
              title="Send"
              data-testid="composer-send-btn"
              disabled={disabled || !value.trim()}
              className={cn(
                "h-9 w-9 rounded-full flex items-center justify-center transition-all duration-300",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-textPrimary",
                value.trim() && !disabled
                  ? "bg-textPrimary text-surface shadow-md hover:scale-105 hover:bg-black"
                  : "bg-surfaceElevated text-textMuted cursor-not-allowed opacity-50"
              )}
            >
              <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
