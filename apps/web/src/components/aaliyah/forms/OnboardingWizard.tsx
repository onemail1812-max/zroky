"use client"

import * as React from "react"
import Image from "next/image"
import { AnimatePresence, motion } from "framer-motion"
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  Lock,
  Mail,
  Shield,
  Sparkles,
  Tag,
  Wand2,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { updateLabelingPreferences } from "@/lib/aaliyah/api"
import { connectorService } from "@/services/connector.service"

type StepKey = "autopilot" | "taxonomy" | "email" | "calendar" | "persona" | "safety" | "ready"

type Step = {
  key: StepKey
  title: string
  description: string
  kicker: string
  icon: React.ReactNode
}

const STEPS: Step[] = [
  {
    key: "autopilot",
    kicker: "Autopilot",
    title: "Choose How Aaliyah Helps",
    description: "Pick what Aaliyah can do automatically. Everything sensitive stays review-first.",
    icon: <Wand2 className="h-4 w-4" />,
  },
  {
    key: "taxonomy",
    kicker: "Taxonomy",
    title: "Define Your Inbox Categories",
    description: "These labels keep outcomes predictable and explainable.",
    icon: <Tag className="h-4 w-4" />,
  },
  {
    key: "email",
    kicker: "Email",
    title: "Connect Your Mail",
    description: "Connect Gmail or Outlook. Only one email provider can be active at a time.",
    icon: <Mail className="h-4 w-4" />,
  },
  {
    key: "calendar",
    kicker: "Calendar",
    title: "Sync Your Calendar (Optional)",
    description: "Aaliyah can read availability and prepare scheduling drafts for review.",
    icon: <CalendarDays className="h-4 w-4" />,
  },
  {
    key: "persona",
    kicker: "Persona",
    title: "Customize Your Assistant",
    description: "Set the tone and signature for Aaliyah's drafts.",
    icon: <Sparkles className="h-4 w-4" />,
  },
  {
    key: "safety",
    kicker: "Safety",
    title: "Review The Guardrails",
    description: "No silent sends. No meeting accepts/declines. Undo everywhere.",
    icon: <Shield className="h-4 w-4" />,
  },
  {
    key: "ready",
    kicker: "Ready",
    title: "System Online",
    description: "Connections are set. Aaliyah is ready to triage and draft, review-first.",
    icon: <Sparkles className="h-4 w-4" />,
  },
]

const DEFAULT_LABELS = ["Urgent", "Newsletter", "Meeting", "FYI", "Awaiting Reply", "High Priority", "Actioned"]
const OPTIONAL_LABELS: string[] = []

type CapabilityKey = "draftReplies" | "organizeLabels" | "archiveLowPriority" | "manageCalendar"

type Capability = {
  key: CapabilityKey
  title: string
  description: string
  icon: React.ReactNode
}

const CAPABILITIES: Capability[] = [
  {
    key: "draftReplies",
    title: "Draft Replies",
    description: "Prepare drafts for review. Never sends automatically.",
    icon: <Mail className="h-4 w-4" />,
  },
  {
    key: "organizeLabels",
    title: "Smart Labels",
    description: "Apply labels for predictable triage and follow-up.",
    icon: <Tag className="h-4 w-4" />,
  },
  {
    key: "archiveLowPriority",
    title: "Filter Noise",
    description: "Archive low priority messages with undo.",
    icon: <Sparkles className="h-4 w-4" />,
  },
  {
    key: "manageCalendar",
    title: "Calendar Assist",
    description: "Read availability. Draft scheduling replies for review.",
    icon: <CalendarDays className="h-4 w-4" />,
  },
]

function Pill({
  selected,
  onClick,
  children,
  disabled,
}: {
  selected?: boolean
  onClick?: () => void
  children: React.ReactNode
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition-colors border",
        selected ? "bg-zinc-900 text-white border-zinc-900" : "bg-white text-zinc-800 border-zinc-200 hover:border-zinc-300",
        disabled && "opacity-40 cursor-not-allowed hover:border-zinc-200"
      )}
    >
      {children}
    </button>
  )
}

function ProviderCard({
  title,
  subtitle,
  icon,
  connected,
  disabled,
  connecting,
  onClick,
  lockedReason,
}: {
  title: string
  subtitle: string
  icon: React.ReactNode
  connected: boolean
  disabled: boolean
  connecting: boolean
  onClick: () => void
  lockedReason?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || connecting || connected}
      className={cn(
        "w-full rounded-2xl border bg-white p-4 text-left transition-colors",
        connected ? "border-zinc-900/30" : "border-zinc-200 hover:border-zinc-300",
        disabled && !connected && "opacity-50 cursor-not-allowed hover:border-zinc-200"
      )}
    >
      <div className="flex items-start gap-4">
        <div
          className={cn(
            "h-10 w-10 rounded-xl flex items-center justify-center border bg-zinc-50",
            connected ? "border-zinc-900/30" : "border-zinc-200"
          )}
        >
          {connecting ? (
            <div className="h-5 w-5 rounded-full border-2 border-zinc-900/60 border-t-transparent animate-spin" />
          ) : connected ? (
            <Check className="h-5 w-5 text-zinc-900" strokeWidth={3} />
          ) : (
            icon
          )}
        </div>

        <div className="flex-1">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-sm font-extrabold tracking-tight text-zinc-900">{title}</div>
              <div className="mt-1 text-xs font-medium text-zinc-600 leading-relaxed">{subtitle}</div>
            </div>

            {disabled && !connected && lockedReason ? (
              <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-[11px] font-semibold text-zinc-700">
                <Lock className="h-3.5 w-3.5" />
                {lockedReason}
              </div>
            ) : connected ? (
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-semibold text-white">
                <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                Connected
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-[11px] font-semibold text-zinc-900">
                Connect
                <ArrowRight className="h-3.5 w-3.5" />
              </div>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}

export default function OnboardingWizard() {
  const leftCardRef = React.useRef<HTMLDivElement | null>(null)
  const [leftCardHeight, setLeftCardHeight] = React.useState<number | null>(null)

  // Hydration-safe State Persistence
  const [stepIndex, setStepIndex] = React.useState(0)
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true);
    const saved = sessionStorage.getItem('onboarding_step_index');
    if (saved) {
      setStepIndex(parseInt(saved, 10));
    }
  }, []);

  React.useEffect(() => {
    if (mounted) {
      sessionStorage.setItem('onboarding_step_index', stepIndex.toString());
    }
  }, [stepIndex, mounted]);
  const step = STEPS[stepIndex]

  const [capabilities, setCapabilities] = React.useState<Record<CapabilityKey, boolean>>({
    draftReplies: true,
    organizeLabels: true,
    archiveLowPriority: false,
    manageCalendar: false,
  })

  const [selectedLabels, setSelectedLabels] = React.useState<string[]>(["Urgent", "Meeting", "FYI", "Awaiting Reply"])

  const [connectedProviders, setConnectedProviders] = React.useState<string[]>([])
  const [connectingProvider, setConnectingProvider] = React.useState<string | null>(null)
  const [connectionError, setConnectionError] = React.useState<string | null>(null)

  const [accountsLoaded, setAccountsLoaded] = React.useState(false)

  // Persona State
  const [draftTone, setDraftTone] = React.useState("professional")
  const [signature, setSignature] = React.useState("")
  const [autoSend, setAutoSend] = React.useState(false)

  const isConnected = React.useCallback((p: string) => connectedProviders.includes(p), [connectedProviders])
  const gmailConnected = isConnected("gmail")
  const outlookConnected = isConnected("outlook")

  const toggleLabel = (label: string) => {
    setSelectedLabels((prev) => (prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]))
  }

  const syncConnectedProviders = React.useCallback(async () => {
    try {
      const accounts = await connectorService.listAccounts()
      const next: string[] = []

      for (const account of accounts) {
        if (account.status !== "active") continue

        if (account.provider === "google") {
          if (account.hasEmailAccess) next.push("gmail")
          if (account.hasCalendarAccess) next.push("gcal")
        }

        if (account.provider === "microsoft") {
          if (account.hasEmailAccess) next.push("outlook")
          if (account.hasCalendarAccess) next.push("ocal")
        }
      }

      setConnectedProviders(next)
    } catch (e) {
      console.warn("Failed to sync connected accounts", e)
    } finally {
      setAccountsLoaded(true)
    }
  }, [])

  React.useEffect(() => {
    void syncConnectedProviders()
  }, [syncConnectedProviders])

  React.useEffect(() => {
    const el = leftCardRef.current
    if (!el) return

    const update = () => {
      const h = Math.round(el.getBoundingClientRect().height)
      setLeftCardHeight(Number.isFinite(h) && h > 0 ? h : null)
    }

    update()
    const ro = new ResizeObserver(() => update())
    ro.observe(el)

    return () => ro.disconnect()
  }, [])

  const handleConnect = async (provider: string) => {
    if (connectedProviders.includes(provider)) return
    setConnectingProvider(provider)
    setConnectionError(null)

    try {
      const providerMap: Record<string, { provider: "google" | "microsoft"; serviceType: "email" | "calendar" }> = {
        gmail: { provider: "google", serviceType: "email" },
        outlook: { provider: "microsoft", serviceType: "email" },
        gcal: { provider: "google", serviceType: "calendar" },
        ocal: { provider: "microsoft", serviceType: "calendar" },
      }

      const config = providerMap[provider]
      if (config) {
        await connectorService.connect(config)
        await syncConnectedProviders()
      }
    } catch (error) {
      console.error("Connection failed:", error)
      setConnectionError(error instanceof Error ? error.message : "Connection failed")
    } finally {
      setConnectingProvider(null)
    }
  }

  const persistLabelPreferences = React.useCallback(async () => {
    try {
      await updateLabelingPreferences({
        enabled_labels: selectedLabels,
        auto_label_enabled: true,
        auto_sync_interval_seconds: 120,
      })
    } catch (error) {
      console.warn("Failed to persist labeling preferences", error)
    }
  }, [selectedLabels])

  const canGoBack = stepIndex > 0
  const canGoNext = stepIndex < STEPS.length - 1
  const nextStep = async () => {
    if (step.key === "taxonomy") {
      await persistLabelPreferences()
    }
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1))
  }
  const prevStep = () => setStepIndex((i) => Math.max(i - 1, 0))
  const progress = Math.round(((stepIndex + 1) / STEPS.length) * 100)
  const rightPanelStyle =
    leftCardHeight !== null
      ? ({ "--aaliyah-left-card-h": `${leftCardHeight}px` } as React.CSSProperties &
        Record<"--aaliyah-left-card-h", string>)
      : undefined

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-[var(--font-body)]">
      <div className="mx-auto max-w-7xl px-6 min-h-screen py-16 flex items-center">
        <div className="w-full">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,720px)_minmax(0,420px)] lg:items-stretch">
            {/* Left: Primary Card */}
            <div className="w-full max-w-[760px] mx-auto lg:mx-0">
              <div
                ref={leftCardRef}
                className="rounded-2xl border border-zinc-200 bg-white shadow-[0_24px_70px_-60px_rgba(0,0,0,0.35)]"
              >
                <div className="px-6 sm:px-8 py-6 border-b border-zinc-200">
                  <div className="flex items-start justify-between gap-6">
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.22em] font-semibold text-zinc-500">
                        Aaliyah Onboarding
                      </div>
                      <div className="mt-1 text-lg font-extrabold tracking-tight text-zinc-900 font-[var(--font-display)]">
                        Aaliyah (Executive Assistant)
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[11px] font-semibold text-zinc-500">
                        Step {String(stepIndex + 1).padStart(2, "0")} / {String(STEPS.length).padStart(2, "0")}
                      </div>
                      <div className="mt-2 h-1.5 w-32 rounded-full bg-zinc-100 overflow-hidden">
                        <motion.div
                          className="h-full bg-zinc-900"
                          initial={{ width: "0%" }}
                          animate={{ width: `${progress}%` }}
                          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="px-6 sm:px-8 py-8 min-h-[460px] sm:min-h-[520px]">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={step.key}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <div className="text-[11px] uppercase tracking-[0.22em] font-semibold text-zinc-500">{step.kicker}</div>
                      <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-zinc-900 font-[var(--font-display)]">
                        {step.title}
                      </h2>
                      <p className="mt-2 text-sm font-medium text-zinc-600 leading-relaxed">{step.description}</p>

                      <div className="mt-6">
                        {step.key === "autopilot" && (
                          <div className="space-y-3">
                            {CAPABILITIES.map((cap) => {
                              const enabled = !!capabilities[cap.key]
                              return (
                                <button
                                  key={cap.key}
                                  type="button"
                                  onClick={() => setCapabilities((prev) => ({ ...prev, [cap.key]: !prev[cap.key] }))}
                                  className={cn(
                                    "w-full rounded-2xl border bg-white p-4 text-left transition-colors",
                                    enabled ? "border-zinc-900/30" : "border-zinc-200 hover:border-zinc-300"
                                  )}
                                >
                                  <div className="flex items-start gap-4">
                                    <div
                                      className={cn(
                                        "h-10 w-10 rounded-xl border flex items-center justify-center",
                                        enabled ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-zinc-50 text-zinc-900"
                                      )}
                                    >
                                      {cap.icon}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center justify-between gap-4">
                                        <div className="text-sm font-extrabold tracking-tight text-zinc-900">{cap.title}</div>
                                        <div
                                          className={cn(
                                            "inline-flex items-center justify-center h-6 w-6 rounded-full border",
                                            enabled ? "border-zinc-900 bg-zinc-900" : "border-zinc-300 bg-white"
                                          )}
                                        >
                                          {enabled && <Check className="h-4 w-4 text-white" strokeWidth={3} />}
                                        </div>
                                      </div>
                                      <div className="mt-1 text-xs font-medium text-zinc-600 leading-relaxed">{cap.description}</div>
                                    </div>
                                  </div>
                                </button>
                              )
                            })}
                          </div>
                        )}

                        {step.key === "taxonomy" && (
                          <div className="space-y-8">
                            <div>
                              <div className="text-xs font-semibold tracking-[0.18em] uppercase text-zinc-500">Active Categories</div>
                              <div className="mt-4 flex flex-wrap gap-2.5">
                                {DEFAULT_LABELS.map((label) => (
                                  <Pill key={label} selected={selectedLabels.includes(label)} onClick={() => toggleLabel(label)}>
                                    {label}
                                  </Pill>
                                ))}
                              </div>
                            </div>

                            {OPTIONAL_LABELS.length > 0 && (
                              <div className="border-t border-dashed border-zinc-200 pt-6">
                                <div className="text-xs font-semibold tracking-[0.18em] uppercase text-zinc-500">Optional</div>
                                <div className="mt-4 flex flex-wrap gap-2.5">
                                  {OPTIONAL_LABELS.map((label) => (
                                    <Pill key={label} selected={selectedLabels.includes(label)} onClick={() => toggleLabel(label)}>
                                      {label}
                                    </Pill>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {step.key === "email" && (
                          <div className="space-y-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                              <ProviderCard
                                title="Gmail"
                                subtitle="Reads and drafts only. Review-first."
                                icon={<Image src="/Icons/gmail.png" alt="Gmail" width={20} height={20} className="object-contain" />}
                                connected={gmailConnected}
                                disabled={!accountsLoaded || outlookConnected}
                                connecting={connectingProvider === "gmail"}
                                onClick={() => handleConnect("gmail")}
                                lockedReason={outlookConnected ? "Outlook active" : undefined}
                              />

                              <ProviderCard
                                title="Outlook"
                                subtitle="Microsoft Graph connection for Mail."
                                icon={<Image src="/Icons/outlook.png" alt="Outlook" width={20} height={20} className="object-contain" />}
                                connected={outlookConnected}
                                disabled={!accountsLoaded || gmailConnected}
                                connecting={connectingProvider === "outlook"}
                                onClick={() => handleConnect("outlook")}
                                lockedReason={gmailConnected ? "Gmail active" : undefined}
                              />
                            </div>

                            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                              <div className="flex items-start gap-3">
                                <AlertCircle className="h-5 w-5 text-zinc-700 mt-0.5" />
                                <div className="text-sm font-medium text-zinc-700 leading-relaxed">
                                  Only one email provider can be active. This avoids split behavior across inboxes.
                                  <div className="text-xs text-zinc-500 mt-1">
                                    To switch later, revoke the active provider first.
                                  </div>
                                  <div className="text-xs text-zinc-500 mt-2">
                                    If OAuth opens and closes immediately, allow popups for this site and retry.
                                  </div>
                                </div>
                              </div>
                            </div>

                            {connectionError && (
                              <div className="rounded-2xl border border-red-200 bg-white px-4 py-3 text-sm font-semibold text-red-700">
                                {connectionError}
                              </div>
                            )}
                          </div>
                        )}

                        {step.key === "calendar" && (
                          <div className="space-y-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                              <ProviderCard
                                title="Google Calendar"
                                subtitle="Read events and availability."
                                icon={
                                  <Image
                                    src="/Icons/google-calender.png"
                                    alt="Google Calendar"
                                    width={20}
                                    height={20}
                                    className="object-contain"
                                  />
                                }
                                connected={isConnected("gcal")}
                                disabled={!accountsLoaded}
                                connecting={connectingProvider === "gcal"}
                                onClick={() => handleConnect("gcal")}
                              />

                              <ProviderCard
                                title="Outlook Calendar"
                                subtitle="Microsoft Calendar access."
                                icon={
                                  <Image
                                    src="/Icons/outlook-calender.png"
                                    alt="Outlook Calendar"
                                    width={20}
                                    height={20}
                                    className="object-contain"
                                  />
                                }
                                connected={isConnected("ocal")}
                                disabled={!accountsLoaded}
                                connecting={connectingProvider === "ocal"}
                                onClick={() => handleConnect("ocal")}
                              />
                            </div>

                            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                              <div className="flex items-start gap-3">
                                <AlertCircle className="h-5 w-5 text-zinc-700 mt-0.5" />
                                <div className="text-sm font-medium text-zinc-700 leading-relaxed">
                                  Calendar is optional. Aaliyah will not accept or decline meetings automatically.
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {step.key === "persona" && (
                          <div className="space-y-6">
                            <div className="space-y-3">
                              <label className="text-sm font-bold text-zinc-900">Draft Tone</label>
                              <div className="flex gap-3">
                                {["Professional", "Casual", "Direct", "Friendly"].map((t) => (
                                  <button
                                    key={t}
                                    onClick={() => setDraftTone(t.toLowerCase())}
                                    className={cn(
                                      "px-4 py-2 rounded-xl text-sm font-semibold border transition-all",
                                      draftTone === t.toLowerCase()
                                        ? "border-zinc-900 bg-zinc-900 text-white"
                                        : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300"
                                    )}
                                  >
                                    {t}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="space-y-3">
                              <label className="text-sm font-bold text-zinc-900">Email Signature</label>
                              <textarea
                                value={signature}
                                onChange={(e) => setSignature(e.target.value)}
                                placeholder="Best,\n[Your Name]"
                                className="w-full h-24 p-3 rounded-xl border border-zinc-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-zinc-900/10 resize-none"
                              />
                            </div>

                            <div className="flex items-center justify-between rounded-xl border border-zinc-200 p-4">
                              <div>
                                <div className="text-sm font-bold text-zinc-900">Enable Auto-Send?</div>
                                <div className="text-xs text-zinc-500">
                                  If confident, Aaliyah can send replies without review.
                                </div>
                              </div>
                              <button
                                onClick={() => setAutoSend(!autoSend)}
                                className={cn(
                                  "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                                  autoSend ? "bg-zinc-900" : "bg-zinc-200"
                                )}
                              >
                                <span
                                  className={cn(
                                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                                    autoSend ? "translate-x-6" : "translate-x-1"
                                  )}
                                />
                              </button>
                            </div>
                          </div>
                        )}

                        {step.key === "safety" && (
                          <div className="space-y-4">
                            <div className="rounded-2xl border border-zinc-200 bg-white p-5">
                              <div className="text-xs font-semibold tracking-[0.18em] uppercase text-zinc-500">Autonomy Ladder</div>
                              <div className="mt-4 space-y-2 text-sm font-semibold text-zinc-800">
                                <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2">
                                  <span>Read inbox</span>
                                  <span className="inline-flex items-center rounded-full bg-emerald-600 px-2.5 py-0.5 text-[11px] font-black text-white">
                                    AUTO
                                  </span>
                                </div>
                                <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2">
                                  <span>Label / archive</span>
                                  <span className="inline-flex items-center rounded-full bg-emerald-600 px-2.5 py-0.5 text-[11px] font-black text-white">
                                    AUTO
                                  </span>
                                </div>
                                <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2">
                                  <span>Draft replies</span>
                                  <span className="inline-flex items-center rounded-full bg-amber-600 px-2.5 py-0.5 text-[11px] font-black text-white">
                                    REVIEW
                                  </span>
                                </div>
                                <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2">
                                  <span>Send email</span>
                                  <span className="inline-flex items-center rounded-full bg-rose-600 px-2.5 py-0.5 text-[11px] font-black text-white">
                                    BLOCKED
                                  </span>
                                </div>
                                <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2">
                                  <span>Accept / decline meetings</span>
                                  <span className="inline-flex items-center rounded-full bg-rose-600 px-2.5 py-0.5 text-[11px] font-black text-white">
                                    BLOCKED
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="rounded-2xl border border-zinc-200 bg-white p-5">
                              <div className="text-xs font-semibold tracking-[0.18em] uppercase text-zinc-500">Explain + Undo</div>
                              <div className="mt-4 space-y-3 text-sm font-medium text-zinc-700 leading-relaxed">
                                <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                                  <div className="text-xs font-semibold text-zinc-500">What I did</div>
                                  <div className="mt-1 font-semibold text-zinc-900">Labeled as Finance.</div>
                                </div>
                                <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                                  <div className="text-xs font-semibold text-zinc-500">Why</div>
                                  <div className="mt-1 font-semibold text-zinc-900">Contains invoice and payment terms.</div>
                                </div>
                                <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                                  <div className="text-xs font-semibold text-zinc-500">Undo</div>
                                  <div className="mt-1 font-semibold text-zinc-900">One click, always available.</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {step.key === "ready" && (
                          <div className="space-y-4">
                            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                              <div className="text-sm font-extrabold text-zinc-900">Connection Status</div>
                              <div className="mt-2 text-sm text-zinc-700">
                                Email:{" "}
                                <span className="font-black text-zinc-900">
                                  {gmailConnected ? "Gmail" : outlookConnected ? "Outlook" : "Not connected"}
                                </span>
                              </div>
                              <div className="mt-1 text-sm text-zinc-700">
                                Calendar:{" "}
                                <span className="font-black text-zinc-900">
                                  {isConnected("gcal")
                                    ? "Google Calendar"
                                    : isConnected("ocal")
                                      ? "Outlook Calendar"
                                      : "Not connected"}
                                </span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={async () => {
                                await persistLabelPreferences()
                                // Persist Persona
                                try {
                                  await fetch("/api/v1/aaliyah/settings", {
                                    method: "PUT",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                      auto_send_enabled: autoSend,
                                      draft_tone: draftTone,
                                      signature: signature,
                                    })
                                  })
                                } catch (e) {
                                  console.error("Failed to save settings", e)
                                }

                                window.location.href = "/aaliyahworkspace"
                              }}
                              className="w-full rounded-2xl bg-zinc-900 text-white py-3 text-sm font-extrabold hover:bg-zinc-800 transition-colors"
                            >
                              Launch Workspace
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>

                <div className="px-6 sm:px-8 py-5 border-t border-zinc-200">
                  <div className="flex items-center justify-between gap-4">
                    <button
                      type="button"
                      onClick={prevStep}
                      disabled={!canGoBack}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
                        "bg-white border-zinc-200 text-zinc-900 hover:border-zinc-300",
                        !canGoBack && "opacity-40 cursor-not-allowed hover:border-zinc-200"
                      )}
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back
                    </button>

                    {canGoNext && (
                      <button
                        type="button"
                        onClick={nextStep}
                        className={cn(
                          "inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-extrabold transition-colors",
                          "bg-zinc-900 text-white hover:bg-zinc-800"
                        )}
                      >
                        Continue
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Aaliyah Visual (aligned to card height on desktop) */}
            <div
              className="w-full max-w-[520px] mx-auto lg:mx-0 lg:max-w-none"
              style={rightPanelStyle}
            >
              <div className="relative w-full aspect-[16/11] lg:aspect-auto lg:h-[var(--aaliyah-left-card-h)] rounded-3xl overflow-hidden border border-zinc-200 bg-white">
                <Image
                  src="/Onboarding/aaliyah-onboarding.jpg"
                  alt="Aaliyah"
                  fill
                  priority
                  className="object-cover object-[50%_25%]"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
