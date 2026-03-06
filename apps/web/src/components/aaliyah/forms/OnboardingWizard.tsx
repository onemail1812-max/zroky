"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  Check,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ArrowRight,
  Mail,
  Calendar,
  Sparkles,
  User,
  X,
  Loader2
} from "lucide-react"
import { cn } from "@/lib/utils"
// import { connectorService, ConnectedAccount, Provider } from "@/services/connector.service"
import { connectorService, ConnectedAccount, Provider } from "@/services/connector.service"
import { completeOnboarding } from "@/lib/aaliyah/api"

const TIMES = ["07:00 AM", "08:00 AM", "09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM", "06:00 PM", "07:00 PM", "08:00 PM", "09:00 PM"]

export type OnboardingState = {
  capabilities: string[]
  workingHours: { start: string; end: string }
  meetingDuration: number
  bufferTimeMins: number
  draftTone: string
  directness: number
  emojiUsage: boolean
  vips: string[]
  // required by backend but hidden defaults
  notesMode: string
  examples: string
  vipRoles: string[]
  alwaysRequireApproval: boolean
  approvalRequiredTopics: string[]
}

export default function OnboardingWizard({ onComplete }: { onComplete?: () => void } = {}) {
  const router = useRouter()
  const [step, setStep] = React.useState(1)
  const [state, setState] = React.useState<OnboardingState>({
    capabilities: ["Organize inbox", "Draft email replies"],
    workingHours: { start: "09:00 AM", end: "06:00 PM" },
    meetingDuration: 30,
    bufferTimeMins: 15,
    draftTone: 'Professional',
    directness: 3,
    emojiUsage: true,
    vips: [],
    notesMode: 'manual',
    examples: '',
    vipRoles: [],
    alwaysRequireApproval: true,
    approvalRequiredTopics: ["Financials", "Hiring"]
  })

  const [loading, setLoading] = React.useState(false)
  const [connectingProvider, setConnectingProvider] = React.useState<Provider | null>(null)

  // Ref for cleanup on unmount
  const cleanupRef = React.useRef<(() => void) | null>(null)

  React.useEffect(() => {
    return () => {
      if (cleanupRef.current) cleanupRef.current()
    }
  }, [])

  const [accounts, setAccounts] = React.useState<ConnectedAccount[]>([])

  React.useEffect(() => {
    connectorService.listAccounts().then(setAccounts).catch(console.error)
  }, [])

  const next = () => setStep((s) => Math.min(s + 1, 4))
  const back = () => setStep((s) => Math.max(s - 1, 1))

  const handleConnect = async (provider: Provider) => {
    if (connectingProvider) return;

    let cleanup: (() => void) | null = null;
    let timeoutId: any = null;
    let intervalId: any = null;

    try {
      setConnectingProvider(provider)
      const { authUrl } = await connectorService.getAuthUrl({ provider, serviceType: "email" })

      if (authUrl && typeof window !== "undefined") {
        const popup = window.open(authUrl, "oauth", "width=600,height=700")

        if (!popup) {
          alert("Popup blocked. Please allow popups for this site.");
          setConnectingProvider(null);
          return;
        }

        cleanup = () => {
          if (timeoutId) clearTimeout(timeoutId);
          if (intervalId) clearInterval(intervalId);
          window.removeEventListener("message", checkMessage);
          setConnectingProvider(null);
          cleanupRef.current = null;
        };

        cleanupRef.current = cleanup;

        const checkMessage = async (e: MessageEvent) => {
          if (e.data?.type === "oauth_complete") {
            if (cleanup) cleanup();
            const accts = await connectorService.listAccounts()
            setAccounts(accts)
          }
        };

        window.addEventListener("message", checkMessage)

        // Polling to detect manual closure
        intervalId = setInterval(() => {
          if (popup.closed) {
            console.log("Popup closed manually");
            if (cleanup) cleanup();
          }
        }, 1000);

        // Hard timeout (2 minutes)
        timeoutId = setTimeout(() => {
          if (!popup.closed) popup.close();
          console.log("OAuth connection timed out");
          if (cleanup) cleanup();
        }, 120000);
      }
    } catch (err) {
      console.error(err);
      alert(`Failed to connect to ${provider}`);
      setConnectingProvider(null);
    }
  }

  const complete = async () => {
    try {
      setLoading(true)
      await completeOnboarding({
        capabilities: state.capabilities,
        working_hours_start: state.workingHours.start,
        working_hours_end: state.workingHours.end,
        meeting_duration: state.meetingDuration,
        buffer_time_mins: state.bufferTimeMins,
        notes_mode: state.notesMode,
        draft_tone: state.draftTone,
        directness: state.directness,
        emoji_usage: state.emojiUsage,
        examples: state.examples,
        vips: state.vips,
        vip_roles: state.vipRoles,
        safe_auto_send: !state.alwaysRequireApproval,
        always_require_approval: state.alwaysRequireApproval,
        approval_required_topics: state.approvalRequiredTopics,
      })
      if (onComplete) {
        onComplete()
      } else {
        router.push("/aaliyahworkspace")
      }
    } catch (e: any) {
      console.error(e)
      setLoading(false)
      alert("Error saving setup.")
    }
  }

  const hasEmail = accounts.some(a => a.hasEmailAccess)

  return (
    <div className="flex min-h-screen w-full bg-zinc-50/50 items-center justify-center p-4 lg:p-12 font-sans text-zinc-900 selection:bg-zinc-200">

      {/* Main Container Card */}
      <div className="w-full max-w-5xl bg-white rounded-[2rem] shadow-2xl overflow-hidden flex h-[85vh] min-h-[600px] border border-zinc-100 relative">

        {/* Left: Hero Image Section */}
        <div className="relative w-1/2 h-full hidden lg:block bg-zinc-50 border-r border-zinc-100">
          <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
            <motion.div
              initial={{ scale: 1.05, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              className="relative w-full h-full"
            >
              <img
                src="/Onboarding/aaliyah-onboarding.png"
                alt="Aaliyah System Interface"
                className="w-full h-full object-cover object-top"
              />
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-90" />
            </motion.div>
          </div>
        </div>

        {/* Right: Interaction Section */}
        <div className="w-full lg:w-1/2 h-full flex flex-col relative bg-white">

          {/* Header Area */}
          <div className="flex items-center justify-between px-8 lg:px-10 pt-10 pb-6 shrink-0 relative z-20 border-b border-zinc-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-zinc-900 text-white rounded-xl flex items-center justify-center shadow-lg">
                <span className="font-bold tracking-tight text-xl">A</span>
              </div>
              <div>
                <span className="block font-bold text-zinc-900 text-lg leading-tight">Setup Aaliyah</span>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">Neural Initialization Flow</span>
              </div>
            </div>

            {/* Mobile Step Dots */}
            <div className="flex sm:hidden items-center gap-2">
              {[1, 2, 3, 4].map((s) => (
                <div
                  key={s}
                  className={cn(
                    "h-2 rounded-full transition-all duration-300",
                    step === s ? "w-4 bg-zinc-900" : step > s ? "w-2 bg-emerald-500" : "w-2 bg-zinc-200"
                  )}
                />
              ))}
            </div>

            {/* Premium Stepper Integration */}
            <div className="hidden sm:flex items-center gap-8">
              {[
                { id: 1, label: "Focus", icon: Sparkles },
                { id: 2, label: "Guardrails", icon: Calendar },
                { id: 3, label: "Style", icon: User },
                { id: 4, label: "Link", icon: Mail },
              ].map((s, i, arr) => {
                const isActive = step === s.id
                const isCompleted = step > s.id
                const isLast = i === arr.length - 1

                return (
                  <React.Fragment key={s.id}>
                    <div className="flex items-center gap-3 group">
                      <div className={cn(
                        "relative h-8 w-8 rounded-lg flex items-center justify-center transition-all duration-500",
                        isActive ? "bg-zinc-900 text-white shadow-md scale-110" : isCompleted ? "bg-emerald-500 text-white" : "bg-zinc-100 text-zinc-400"
                      )}>
                        {isCompleted ? <Check className="h-4 w-4" strokeWidth={3} /> : <s.icon className="h-4 w-4" />}
                        {isActive && (
                          <motion.div
                            layoutId="active-step-glow"
                            className="absolute -inset-1 rounded-xl border-2 border-zinc-900/10 animate-pulse"
                          />
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className={cn(
                          "text-[10px] font-bold uppercase tracking-wider transition-colors duration-300",
                          isActive ? "text-zinc-900" : isCompleted ? "text-emerald-600" : "text-zinc-400"
                        )}>
                          Step {s.id}
                        </span>
                        <span className={cn(
                          "text-[12px] font-bold tracking-tight transition-colors duration-300",
                          isActive ? "text-zinc-900" : isCompleted ? "text-zinc-600" : "text-zinc-400"
                        )}>
                          {s.label}
                        </span>
                      </div>
                    </div>
                    {!isLast && (
                      <div className={cn(
                        "h-[2px] w-6 rounded-full transition-colors duration-500",
                        isCompleted ? "bg-emerald-500" : "bg-zinc-100"
                      )} />
                    )}
                  </React.Fragment>
                )
              })}
            </div>

            {/* Mobile Progress (Simplified) */}
            <div className="flex sm:hidden items-center gap-1.5">
              {[1, 2, 3, 4].map((s) => (
                <div key={s} className={cn("h-1.5 rounded-full transition-all duration-500", step >= s ? "bg-zinc-900" : "bg-zinc-200", step === s ? "w-6" : "w-1.5")} />
              ))}
            </div>
          </div>

          {/* Scrollable Content Body */}
          <div className="flex-1 overflow-y-auto px-8 lg:px-10 py-8 custom-scrollbar relative z-10 pb-28">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="w-full max-w-md mx-auto"
              >
                {step === 1 && <Step1 state={state} setState={setState} />}
                {step === 2 && <Step2 state={state} setState={setState} />}
                {step === 3 && <Step3 state={state} setState={setState} />}
                {step === 4 && (
                  <div className="space-y-6">
                    <div>
                      <h1 className="text-2xl font-bold tracking-tight mb-2 text-zinc-900">Connected Accounts</h1>
                      <p className="text-zinc-600 text-sm font-medium">Link your email and calendar so Aaliyah can initialize protocols.</p>
                    </div>

                    <div className="flex gap-4">
                      {/* Google Connection */}
                      <button
                        onClick={() => handleConnect('google')}
                        disabled={!!connectingProvider}
                        aria-label="Connect with Google"
                        className={cn(
                          "flex-1 group relative flex items-center justify-center p-4 bg-white border border-zinc-200 hover:border-zinc-300 rounded-2xl transition-all shadow-sm hover:shadow-md text-center",
                          connectingProvider === 'google' && "bg-zinc-50 border-zinc-900 shadow-inner"
                        )}
                      >
                        <div className="flex items-center gap-3 relative z-10">
                          {connectingProvider === 'google' ? (
                            <Loader2 className="w-5 h-5 animate-spin text-zinc-900" />
                          ) : (
                            <img src="/Icons/google.png" alt="Google" className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
                          )}
                          <span className="font-semibold text-sm text-zinc-900 tracking-tight">
                            {connectingProvider === 'google' ? "Connecting..." : "Google"}
                          </span>
                        </div>
                      </button>

                      {/* Microsoft Connection */}
                      <button
                        onClick={() => handleConnect('microsoft')}
                        disabled={!!connectingProvider}
                        aria-label="Connect with Microsoft"
                        className={cn(
                          "flex-1 group relative flex items-center justify-center p-4 bg-white border border-zinc-200 hover:border-zinc-300 rounded-2xl transition-all shadow-sm hover:shadow-md text-center",
                          connectingProvider === 'microsoft' && "bg-zinc-50 border-zinc-900 shadow-inner"
                        )}
                      >
                        <div className="flex items-center gap-3 relative z-10">
                          {connectingProvider === 'microsoft' ? (
                            <Loader2 className="w-5 h-5 animate-spin text-zinc-900" />
                          ) : (
                            <img src="/Icons/outlook.png" alt="Microsoft" className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
                          )}
                          <span className="font-semibold text-sm text-zinc-900 tracking-tight">
                            {connectingProvider === 'microsoft' ? "Connecting..." : "Microsoft"}
                          </span>
                        </div>
                      </button>
                    </div>

                    {accounts.length > 0 && (
                      <div className="pt-6 border-t border-zinc-100 space-y-4">
                        <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Active Tunnels</p>
                        <div className="space-y-3">
                          {accounts.map(acc => (
                            <div key={acc.id} className="flex items-center gap-4 bg-zinc-50 p-4 rounded-2xl border border-zinc-200">
                              <div className="w-10 h-10 rounded-xl bg-white text-zinc-900 flex items-center justify-center font-bold shadow-sm border border-zinc-100">
                                {acc.email?.[0]?.toUpperCase()}
                              </div>
                              <div>
                                <p className="font-bold text-sm text-zinc-900">{acc.email}</p>
                                <p className="text-xs font-medium text-zinc-500 mt-0.5">{acc.provider}</p>
                              </div>
                              <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 rounded-full border border-emerald-100">
                                <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[10px] font-bold text-emerald-700 tracking-wide">Linked</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Locked Footer Navigation */}
          <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-8 border-t border-zinc-100 bg-white/95 backdrop-blur-sm z-50">
            <div className="flex justify-between items-center max-w-md mx-auto">
              {step > 1 ? (
                <button
                  onClick={back}
                  aria-label="Go back to previous step"
                  className="px-5 py-2.5 font-bold text-sm text-zinc-500 hover:text-zinc-900 transition-colors flex items-center gap-2 rounded-xl hover:bg-zinc-100"
                >
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
              ) : <div />}

              {step < 4 ? (
                <button
                  onClick={next}
                  aria-label="Continue to next step"
                  className="group flex items-center justify-center px-6 py-3 bg-zinc-900 hover:bg-black text-white rounded-xl transition-all shadow-md active:scale-95"
                >
                  <span className="font-bold text-sm tracking-wide mr-2">Continue</span>
                  <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </button>
              ) : (
                <button onClick={complete} disabled={loading || !hasEmail} className="group flex items-center justify-center px-6 py-3 bg-zinc-900 hover:bg-black text-white rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:active:scale-100">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  <span className="font-bold text-sm tracking-wide">{loading ? "Initializing..." : "Complete Setup"}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Step1({ state, setState }: { state: OnboardingState, setState: React.Dispatch<React.SetStateAction<OnboardingState>> }) {
  const capacities = [
    { id: "Organize inbox", title: "Organize Inbox", desc: "Auto-labels and categorizes incoming mail.", icon: Mail },
    { id: "Draft email replies", title: "Draft Replies", desc: "Generates context-aware contextual drafts.", icon: Sparkles },
    { id: "Manage your calendar", title: "Manage Calendar", desc: "Negotiates meeting structures and buffers.", icon: Calendar },
  ]

  const toggle = (id: string) => {
    setState((prev: OnboardingState) => ({
      ...prev,
      capabilities: prev.capabilities.includes(id)
        ? prev.capabilities.filter(c => c !== id)
        : [...prev.capabilities, id]
    }))
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight mb-2 text-zinc-900">Core Focus</h1>
        <p className="text-zinc-600 text-sm font-medium">Select the fundamental capabilities you wish to activate for my primary execution protocols.</p>
      </div>
      <div className="space-y-3">
        {capacities.map(c => {
          const active = state.capabilities.includes(c.id)
          return (
            <button
              key={c.id}
              onClick={() => toggle(c.id)}
              aria-pressed={active}
              aria-label={`Toggle ${c.title} capability`}
              className={cn(
                "w-full flex items-center gap-4 p-4 rounded-2xl border text-left transition-all duration-300 group",
                active ? "border-zinc-900 bg-white shadow-md ring-1 ring-zinc-900" : "border-zinc-200 bg-zinc-50 hover:bg-white hover:border-zinc-300"
              )}
            >
              <div className={cn("p-2.5 rounded-xl transition-colors", active ? "bg-zinc-900 text-white" : "bg-white border border-zinc-200 text-zinc-500 group-hover:text-zinc-900")}>
                <c.icon className="w-5 h-5" />
              </div>

              <div className="flex-1">
                <h3 className={cn("font-bold text-base transition-colors", active ? "text-zinc-900" : "text-zinc-700 group-hover:text-zinc-900")}>{c.title}</h3>
                <p className={cn("text-xs mt-0.5 transition-colors", active ? "text-zinc-600 font-medium" : "text-zinc-500")}>{c.desc}</p>
              </div>

              <div className={cn("w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all shadow-sm", active ? "bg-emerald-500 border-emerald-500 scale-110" : "border-zinc-300 bg-zinc-100 group-hover:bg-white")}>
                {active && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Step2({ state, setState }: { state: OnboardingState, setState: React.Dispatch<React.SetStateAction<OnboardingState>> }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight mb-2 text-zinc-900">Temporal Guardrails</h1>
        <p className="text-zinc-600 text-sm font-medium">Establish strict boundaries for when and how I handle your schedule.</p>
      </div>

      <div className="space-y-6">
        <div className="space-y-3">
          <div className="flex flex-col gap-0.5">
            <label className="text-xs font-bold text-zinc-800 uppercase tracking-wider">Operating Window</label>
            <p className="text-[10px] text-zinc-500 font-medium">The specific hours during which I am authorized to schedule meetings.</p>
          </div>
          <div className="flex items-center gap-3 bg-zinc-50 p-1.5 rounded-2xl border border-zinc-200">
            <select
              aria-label="Working hours start time"
              className="flex-1 p-3 rounded-xl bg-white border border-zinc-200 text-zinc-900 text-sm font-semibold outline-none focus:border-zinc-400 transition-all shadow-sm" value={state.workingHours.start} onChange={e => setState((p: OnboardingState) => ({ ...p, workingHours: { ...p.workingHours, start: e.target.value } }))}>
              {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <ArrowRight className="w-4 h-4 text-zinc-400 shrink-0" />
            <select
              aria-label="Working hours end time"
              className="flex-1 p-3 rounded-xl bg-white border border-zinc-200 text-zinc-900 text-sm font-semibold outline-none focus:border-zinc-400 transition-all shadow-sm" value={state.workingHours.end} onChange={e => setState((p: OnboardingState) => ({ ...p, workingHours: { ...p.workingHours, end: e.target.value } }))}>
              {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-end">
            <div className="flex flex-col gap-0.5">
              <label className="text-xs font-bold text-zinc-800 uppercase tracking-wider">Default Duration</label>
              <p className="text-[10px] text-zinc-500 font-medium">Standard length for any meeting I propose or schedule for you.</p>
            </div>
            <span className="text-sm font-bold text-zinc-500">{state.meetingDuration} mins</span>
          </div>
          <div className="flex gap-2 p-1.5 bg-zinc-50 border border-zinc-200 rounded-2xl">
            {[15, 30, 45, 60].map(m => (
              <button
                key={m}
                onClick={() => setState((p: OnboardingState) => ({ ...p, meetingDuration: m }))}
                aria-pressed={state.meetingDuration === m}
                className={cn("flex-1 py-3 text-sm font-bold rounded-xl transition-all shadow-sm", state.meetingDuration === m ? "bg-white text-zinc-900 border border-zinc-200" : "text-zinc-500 border border-transparent hover:text-zinc-900 hover:bg-zinc-100")}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-end">
            <div className="flex flex-col gap-0.5">
              <label className="text-xs font-bold text-zinc-800 uppercase tracking-wider">Mandatory Buffer</label>
              <p className="text-[10px] text-zinc-500 font-medium">Guaranteed breathing room required between back-to-back sessions.</p>
            </div>
            <span className="text-sm font-bold text-zinc-500">{state.bufferTimeMins} mins</span>
          </div>
          <div className="flex gap-2 p-1.5 bg-zinc-50 border border-zinc-200 rounded-2xl">
            {[0, 5, 10, 15].map(m => (
              <button
                key={m}
                onClick={() => setState((p: OnboardingState) => ({ ...p, bufferTimeMins: m }))}
                aria-pressed={state.bufferTimeMins === m}
                className={cn("flex-1 py-3 text-sm font-bold rounded-xl transition-all shadow-sm", state.bufferTimeMins === m ? "bg-white text-zinc-900 border border-zinc-200" : "text-zinc-500 border border-transparent hover:text-zinc-900 hover:bg-zinc-100")}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function Step3({ state, setState }: { state: OnboardingState, setState: React.Dispatch<React.SetStateAction<OnboardingState>> }) {
  const [vipInput, setVipInput] = React.useState("")
  const addVip = () => {
    if (vipInput.trim() && !state.vips.includes(vipInput.trim())) {
      setState((p: OnboardingState) => ({ ...p, vips: [...p.vips, vipInput.trim()] }))
      setVipInput("")
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight mb-2 text-zinc-900">Communication Output</h1>
        <p className="text-zinc-600 text-sm font-medium">Define the stylistic and structural boundaries for my generated content.</p>
      </div>

      <div className="space-y-6">
        <div className="space-y-3">
          <label className="text-xs font-bold text-zinc-800">Linguistic Tone</label>
          <select
            aria-label="Linguistic Tone select"
            className="w-full p-3.5 border border-zinc-200 rounded-xl bg-white text-zinc-900 text-sm font-semibold outline-none focus:border-zinc-400 transition-all shadow-sm" value={state.draftTone} onChange={e => setState((p: OnboardingState) => ({ ...p, draftTone: e.target.value }))}>
            <option value="Professional">Professional & Polished</option>
            <option value="Friendly">Friendly & Enthusiastic</option>
            <option value="Direct">Direct & Concise</option>
            <option value="Formal">Highly Formal</option>
          </select>
        </div>

        <div className="flex items-center justify-between p-4 border border-zinc-200 rounded-xl bg-white shadow-sm">
          <div>
            <h3 className="font-bold text-sm text-zinc-900">Emoji Utilization</h3>
            <p className="text-xs font-medium text-zinc-500 mt-0.5">Permit emojis in outbound drafts 🚀</p>
          </div>
          <button
            onClick={() => setState((p: OnboardingState) => ({ ...p, emojiUsage: !p.emojiUsage }))}
            aria-label="Toggle emoji usage"
            aria-pressed={state.emojiUsage}
            className={cn("glass-switch w-12 h-6 rounded-full flex items-center p-1 cursor-pointer outline-none", state.emojiUsage ? "active" : "")}
          >
            <div className={cn("knob w-4 h-4 rounded-full shadow-sm", state.emojiUsage ? "translate-x-6" : "")} />
          </button>
        </div>

        <div className="space-y-3 pt-2">
          <div>
            <label className="flex items-center gap-2">
              <span className="text-xs font-bold text-zinc-800">VIP Enclave</span>
              <span className="text-[10px] px-1.5 py-0.5 bg-zinc-100 text-zinc-500 rounded font-bold uppercase tracking-widest">Optional</span>
            </label>
            <p className="text-xs font-medium text-zinc-500 mt-1">Designate addresses that unconditionally bypass automated filtering.</p>
          </div>
          <div className="flex gap-2">
            <input
              value={vipInput}
              onChange={e => setVipInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addVip()}
              placeholder="ceo@company.com"
              aria-label="VIP email address"
              className="flex-1 p-3.5 border border-zinc-200 bg-white shadow-sm text-zinc-900 text-sm font-semibold rounded-xl outline-none focus:border-zinc-400 placeholder:text-zinc-400 placeholder:font-normal transition-all" />
            <button onClick={addVip} className="px-5 bg-zinc-900 hover:bg-black text-white rounded-xl text-sm font-bold shadow-md active:scale-95 transition-all">Add</button>
          </div>
          {state.vips.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {state.vips.map((v, i) => (
                <div key={v} className="px-3 py-1.5 bg-zinc-100 text-zinc-700 text-xs font-bold rounded-lg flex items-center gap-2 border border-zinc-200 shadow-sm">
                  {v}
                  <button
                    onClick={() => setState((p: OnboardingState) => ({ ...p, vips: p.vips.filter((_: string, idx: number) => idx !== i) }))}
                    aria-label={`Remove VIP ${v}`}
                    className="text-zinc-400 hover:text-zinc-600 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
