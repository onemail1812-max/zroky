"use client"

import { useSystemStore } from "@/lib/aaliyah/store"
import { useEffect } from "react"

export default function DashboardPage() {
  const { pendingApprovals, queuedCount, escalations, fetchStatus } = useSystemStore()

  useEffect(() => {
    void fetchStatus()
  }, [fetchStatus])

  const riskLevel = escalations > 3 ? "HIGH" : escalations > 0 ? "MEDIUM" : "LOW"
  const riskColor = riskLevel === "HIGH" ? "text-red-600" : riskLevel === "MEDIUM" ? "text-amber-600" : "text-zinc-900"

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-end justify-between gap-6">
          <div>
            <div className="text-[11px] uppercase tracking-[0.22em] font-semibold text-zinc-500">Home</div>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-zinc-900">Dashboard</h1>
            <p className="mt-2 text-sm font-medium text-zinc-600">
              A high-level view of what Aaliyah is doing and what needs your approval.
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Approvals</div>
            <div className="mt-2 text-3xl font-black text-zinc-900">{pendingApprovals}</div>
            <div className="mt-1 text-sm text-zinc-600">Drafts and invites awaiting review.</div>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">In Queue</div>
            <div className="mt-2 text-3xl font-black text-zinc-900">{queuedCount}</div>
            <div className="mt-1 text-sm text-zinc-600">Items being triaged in the background.</div>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Risk</div>
            <div className={`mt-2 text-3xl font-black ${riskColor}`}>{riskLevel}</div>
            <div className="mt-1 text-sm text-zinc-600">High-risk topics escalate automatically.</div>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">What&apos;s Next</div>
          <div className="mt-3 text-sm text-zinc-700 leading-relaxed">
            Go to Workspace to review the stream and approve drafts. Aaliyah will surface anything ambiguous or risky.
          </div>
        </div>
      </div>
    </div>
  )
}

