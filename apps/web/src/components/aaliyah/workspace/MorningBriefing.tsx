"use client"

import * as React from "react"
import { format } from "date-fns"
import { CloudSun, ArrowRight, RefreshCw, AlertTriangle, ShieldAlert, LogIn } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { aaliyahApi } from "@/lib/aaliyah/api"
import { cn } from "@/lib/utils"
import { useSystemStore } from "@/lib/aaliyah/store"
import { SkeletonCard } from "@/components/ui/Skeleton"

interface GreetingState {
  headline: string
  greeting: string
  subtext: string
  cta_label: string
  cta_action: string
  state: "onboarding" | "error" | "reconnect" | "healthy" | "connected_not_synced"
}

interface BriefingData {
  content: string
  date: string
  status?: "ready" | "generating"
}

export function MorningBriefing() {
  const router = useRouter()
  const [greeting, setGreeting] = React.useState<GreetingState | null>(null)
  const [briefing, setBriefing] = React.useState<BriefingData | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [syncing, setSyncing] = React.useState(false)
  const { triggerSync, fetchStatus, fetchInbox } = useSystemStore()

  React.useEffect(() => {
    let alive = true

    async function fetchData() {
      try {
        // 1. Fetch Greeting (Health & State)
        const greetingRes = await aaliyahApi.get("/greeting")
        if (!alive) return
        const gData = greetingRes.data as GreetingState
        setGreeting(gData)

        // 2. If Healthy, fetch Briefing
        if (gData.state === "healthy") {
          try {
            const briefingRes = await aaliyahApi.get("/briefing")
            if (alive) {
              const data = briefingRes.data as BriefingData
              // If it's the fallback placeholder text, we can show a "Generate Briefing" button later
              setBriefing(data)
            }
          } catch (e) {
            // Briefing might not be ready, ignore
          }
        }
      } catch (e) {
        console.error("Failed to load greeting", e)
      } finally {
        if (alive) setLoading(false)
      }
    }

    void fetchData()

    // Listen for SSE briefing_ready event
    const handleBriefingReady = (event: CustomEvent) => {
      if (event.detail && event.detail.content) {
        setBriefing({
          content: event.detail.content,
          date: event.detail.date || new Date().toISOString(),
          status: "ready"
        })
        setSyncing(false)
      }
    }
    window.addEventListener("aaliyah:briefing_ready", handleBriefingReady as EventListener)

    return () => {
      alive = false
      window.removeEventListener("aaliyah:briefing_ready", handleBriefingReady as EventListener)
    }
  }, [])

  const handleAction = async () => {
    if (!greeting) return

    if (greeting.cta_action === "connect_email" || greeting.cta_action === "reconnect_email" || greeting.cta_action === "update_permissions") {
      router.push("/brain")
      return
    }

    if (greeting.cta_action === "retry_sync") {
      setSyncing(true)
      try {
        await triggerSync()
        await Promise.all([fetchStatus(), fetchInbox()])
        // Reload after short delay to refresh greeting
        setTimeout(() => window.location.reload(), 2000)
      } catch (err) {
        console.error("Manual sync failed", err)
        setSyncing(false)
      }
      return
    }

    // View Briefing is default behavior (scrolling or just showing it below)
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-6 animate-in">
        <SkeletonCard lines={2} />
      </div>
    )
  }

  if (!greeting) return null

  // State-based Styles
  const isError = greeting.state === "error" || greeting.state === "reconnect"
  const isOnboarding = greeting.state === "onboarding" || greeting.state === "connected_not_synced"

  const getGreetingText = () => {
    if (isError) return greeting.greeting
    const hour = new Date().getHours()
    if (hour < 12) return "Good Morning"
    if (hour < 17) return "Good Afternoon"
    return "Good Evening"
  }

  return (
    <div className="flex flex-col gap-6 animate-slide-in-soft">

      {/* Dynamic Greeting Card */}
      <article className={cn(
        "rounded-xl border p-8 transition-all relative overflow-hidden",
        isError ? "border-red-200 bg-red-50/50" :
          isOnboarding ? "border-zinc-200 bg-white shadow-sm" :
            "border-borderSubtle bg-surface hover:shadow-sm"
      )}>
        <header className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className={cn(
              "h-8 w-8 rounded-full flex items-center justify-center ring-1 ring-inset",
              isError ? "bg-red-100 text-red-600 ring-red-200" :
                isOnboarding ? "bg-zinc-900 text-white ring-zinc-900" :
                  "bg-surfaceElevated text-textPrimary ring-borderSubtle"
            )}>
              {isError ? <AlertTriangle className="h-4 w-4" /> :
                isOnboarding ? <LogIn className="h-4 w-4" /> :
                  <CloudSun className="h-4 w-4" />}
            </div>
            <span className={cn(
              "text-[11px] font-bold uppercase tracking-widest",
              isError ? "text-red-600" : "text-textMuted"
            )}>
              {greeting.headline}
            </span>
          </div>

          <h2 className={cn(
            "text-xl font-semibold mb-2",
            isError ? "text-red-900" : "text-textPrimary"
          )}>
            {getGreetingText()}, {greeting.greeting.split(',').pop()?.trim() || "User"}
          </h2>

          <p className={cn(
            "text-[14px] leading-relaxed max-w-xl",
            isError ? "text-red-700 font-medium" : "text-textSecondary"
          )}>
            {greeting.subtext}
          </p>

          <div className="mt-8">
            <button
              onClick={handleAction}
              disabled={syncing}
              className={cn(
                "inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-[13px] font-bold transition-all shadow-sm",
                isError ? "bg-red-600 text-white hover:bg-red-700 shadow-red-200" :
                  isOnboarding ? "bg-zinc-900 text-white hover:bg-black" :
                    "bg-white border border-borderSubtle text-textPrimary hover:bg-zinc-50"
              )}
            >
              {syncing ? <RefreshCw className="h-4 w-4 animate-spin" /> : null}
              {greeting.cta_label}
              {!syncing && <ArrowRight className="h-3.5 w-3.5" />}
            </button>
          </div>
        </header>
      </article>

      {/* Briefing Content (Only if Healthy & Available) */}
      {greeting.state === "healthy" && briefing && (
        <article className="group rounded-xl border border-borderSubtle bg-surface p-6 transition-all hover:border-borderStrong relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[11px] font-bold text-textMuted uppercase tracking-widest">Daily Briefing • {format(new Date(), "MMM do")}</h3>

            {/* Show Generate button if it's the fallback generic text or explicitly generating */}
            {(briefing.status === "generating" || briefing.content.includes("Check back in a moment")) && (
              <button
                disabled={true}
                className="inline-flex items-center gap-2 px-3 py-1 bg-zinc-100 text-zinc-600 rounded-md text-[11px] font-bold uppercase tracking-wider"
              >
                <RefreshCw className="h-3 w-3 animate-spin" />
                Generating...
              </button>
            )}

            {briefing.status !== "generating" && !briefing.content.includes("Check back in a moment") && (
              <button
                onClick={async () => {
                  setBriefing({ ...briefing, status: "generating" })
                  await aaliyahApi.get("/briefing?generate=true")
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-textMuted hover:text-textPrimary hover:bg-zinc-50 rounded text-[11px] font-bold uppercase tracking-wider transition-colors"
              >
                <RefreshCw className="h-3 w-3" />
                Refresh
              </button>
            )}
          </div>

          <div className="prose prose-sm max-w-none">
            <p className={cn(
              "text-[14px] leading-7 whitespace-pre-wrap transition-opacity duration-500",
              briefing.status === "generating" ? "text-textMuted opacity-50" : "text-textSecondary"
            )}>
              {briefing.content}
            </p>
          </div>
        </article>
      )}
    </div>
  )
}
