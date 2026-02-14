"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

export function WorkingView({
  open,
  steps,
  activeIndex,
  onCancel,
  detail,
}: {
  open: boolean
  steps: string[]
  activeIndex: number
  onCancel: () => void
  detail?: string
}) {
  const [showDetails, setShowDetails] = React.useState(false)

  React.useEffect(() => {
    if (!open) setShowDetails(false)
  }, [open])

  if (!open) return null

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-[color:rgba(246,247,249,0.90)] backdrop-blur-[1px] px-6">
      <div className="w-full max-w-xl rounded-xl border border-borderSubtle bg-surface p-6">
        <h2 className="text-[20px] font-semibold text-textPrimary">Aaliyah is working...</h2>

        <div className="mt-6 space-y-2">
          {steps.map((step, index) => {
            const isActive = index === activeIndex
            const isDone = index < activeIndex
            return (
              <div key={step} className="flex items-center gap-2 text-[14px] text-textSecondary">
                <span
                  className={cn(
                    "h-2.5 w-2.5 rounded-full",
                    isActive && "bg-infoExecuting animate-pulse-soft",
                    isDone && "bg-successOnline",
                    !isActive && !isDone && "bg-borderSubtle"
                  )}
                  aria-hidden="true"
                />
                <span>{step}</span>
              </div>
            )
          })}
        </div>

        {detail && (
          <div className="mt-6">
            <button
              type="button"
              onClick={() => setShowDetails((prev) => !prev)}
              className="h-11 rounded-lg border border-borderSubtle bg-surfaceElevated px-4 text-[13px] font-medium text-textSecondary hover:bg-surface transition-colors"
            >
              {showDetails ? "Hide details" : "View details"}
            </button>

            {showDetails && (
              <div className="mt-4 rounded-lg border border-borderSubtle bg-surfaceElevated p-4 text-[12px] text-textSecondary leading-6">
                {detail}
              </div>
            )}
          </div>
        )}

        <div className="mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="h-11 rounded-lg border border-borderSubtle bg-surface px-4 text-[13px] font-medium text-textPrimary hover:bg-surfaceElevated transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
