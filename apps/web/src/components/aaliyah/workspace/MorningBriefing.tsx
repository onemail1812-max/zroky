"use client"

import * as React from "react"
import { format } from "date-fns"
import { CloudSun } from "lucide-react"

import { aaliyahApi } from "@/lib/aaliyah/api"

interface BriefingData {
  content: string
  date: string
}

export function MorningBriefing() {
  const [data, setData] = React.useState<BriefingData | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    let alive = true

    async function fetchBriefing() {
      try {
        const response = await aaliyahApi.get("/briefing")
        if (!alive) return
        setData(response.data as BriefingData)
      } catch {
        // Intentionally quiet: this is a pinned view, not a blocking error.
      } finally {
        if (alive) setLoading(false)
      }
    }

    void fetchBriefing()
    return () => {
      alive = false
    }
  }, [])

  if (loading) {
    return (
      <article className="rounded-xl border border-borderSubtle bg-surface p-6 animate-pulse">
        <div className="h-4 w-40 rounded bg-borderSubtle opacity-70" />
        <div className="mt-4 h-3 w-56 rounded bg-borderSubtle opacity-60" />
        <div className="mt-6 h-3 w-full rounded bg-borderSubtle opacity-50" />
        <div className="mt-2 h-3 w-5/6 rounded bg-borderSubtle opacity-45" />
        <div className="mt-2 h-3 w-4/6 rounded bg-borderSubtle opacity-40" />
      </article>
    )
  }

  if (!data) {
    return (
      <article className="rounded-xl border border-borderSubtle bg-surface p-6 animate-slide-in-soft flex flex-col gap-3 min-h-[160px] justify-center items-center text-center">
        <CloudSun className="h-8 w-8 text-textMuted/50" strokeWidth={1} />
        <div className="text-[13px] text-textSecondary font-medium">Morning briefing unavailable</div>
      </article>
    )
  }

  return (
    <article className="group relative overflow-hidden rounded-xl border border-borderSubtle bg-surface p-6 transition-all hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:border-borderStrong animate-slide-in-soft">
      <div className="absolute top-0 right-0 p-4 opacity-0 transition-opacity group-hover:opacity-100">
        {/* Future 'Refresh' or 'Archive' actions could go here */}
      </div>

      <header className="flex items-center gap-3 mb-6">
        <div className="h-8 w-8 rounded-full bg-surfaceElevated flex items-center justify-center text-textPrimary ring-1 ring-borderSubtle">
          <CloudSun className="h-4 w-4" strokeWidth={1.5} />
        </div>
        <div>
          <h2 className="text-[14px] font-semibold text-textPrimary leading-none tracking-tight">Morning Briefing</h2>
          <p className="mt-1 text-[11px] text-textMuted font-medium uppercase tracking-widest">
            {format(new Date(data.date), "MMMM do")}
          </p>
        </div>
      </header>

      <div className="prose prose-sm max-w-none">
        <p className="text-[14px] text-textSecondary leading-7 whitespace-pre-wrap font-normal selection:bg-surfaceElevated selection:text-textPrimary">
          {data.content}
        </p>
      </div>

      <div className="mt-6 pt-4 border-t border-borderSubtle/50 flex items-center gap-4">
        <span className="text-[11px] font-medium text-textMuted">AI Generated • Executive Summary</span>
      </div>
    </article>
  )
}
