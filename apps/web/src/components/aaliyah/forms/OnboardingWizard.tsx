"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Check,
  ChevronRight,
  ChevronLeft,
  Plus,
  X,
  Shield,
  Lock,
  Clock,
  Calendar,
  Sparkles,
  Zap,
  Mic,
  User,
  Mail,
  ArrowRight,
  MessageSquare
} from "lucide-react"
import { cn } from "@/lib/utils"

// --- CSS ---
const STYLE = `
  .custom-scrollbar::-webkit-scrollbar {
    width: 4px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.08);
    border-radius: 10px;
  }
  .glass-card {
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    border: 1px solid rgba(0, 0, 0, 0.05);
    box-shadow: 
      0 4px 6px -1px rgba(0, 0, 0, 0.01),
      0 20px 60px -10px rgba(0, 0, 0, 0.05);
  }
  .glass-input {
    background: rgba(255, 255, 255, 0.5);
    border: 1px solid rgba(0, 0, 0, 0.08);
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .glass-input:focus {
    background: white;
    border-color: rgba(0, 0, 0, 0.2);
    box-shadow: 0 5px 15px -5px rgba(0, 0, 0, 0.05);
  }
  .charcoal-btn {
    background: #18181b;
    transition: all 0.3s ease;
  }
  .charcoal-btn:hover {
    background: #27272a;
    transform: translateY(-1px);
  }
  .charcoal-btn:active {
    transform: translateY(0px) scale(0.98);
  }
  body {
    background-color: #fcfcfc;
  }
`

// --- Types ---
type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7

type OnboardingState = {
  capabilities: string[]
  workingHours: { start: string; end: string }
  meetingDuration: number
  notesMode: 'manual' | 'auto'
  draftTone: string
  signature: string
  examples: string
  vips: string[]
  safeAutoSend: boolean
}

interface ScreenProps {
  state: OnboardingState
  setState: React.Dispatch<React.SetStateAction<OnboardingState>>
  onNext: () => void
}

const TIMES = ["08:00 AM", "09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM", "06:00 PM", "07:00 PM", "08:00 PM"]

export default function OnboardingWizard() {
  const [step, setStep] = React.useState<Step>(1)
  const [state, setState] = React.useState<OnboardingState>({
    capabilities: ["Organize inbox", "Draft email replies", "Track follow-ups"],
    workingHours: { start: "09:00 AM", end: "06:00 PM" },
    meetingDuration: 30,
    notesMode: 'manual',
    draftTone: 'Professional',
    signature: '',
    examples: '',
    vips: [],
    safeAutoSend: false
  })

  const next = () => setStep((s) => Math.min(s + 1, 7) as Step)
  const back = () => setStep((s) => Math.max(s - 1, 1) as Step)

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 font-sans selection:bg-zinc-900 selection:text-white overflow-hidden">
      <style dangerouslySetInnerHTML={{ __html: STYLE }} />

      {/* Ambient Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-zinc-100/50 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-zinc-50 blur-[100px] rounded-full pointer-events-none" />

      <div className="w-full max-w-xl relative z-10">
        {/* Compact Progress Tracking */}
        <div className="mb-8 flex flex-col items-center">
          <div className="flex gap-2 items-center">
            {[1, 2, 3, 4, 5, 6, 7].map((s) => (
              <div
                key={s}
                className={cn(
                  "h-1 rounded-full transition-all duration-500",
                  step === s ? "w-8 bg-zinc-900" : (step > s ? "w-3 bg-zinc-200" : "w-3 bg-zinc-100")
                )}
              />
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, scale: 0.99, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.01, y: -5 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="glass-card rounded-[40px] p-8 sm:p-12 overflow-hidden relative shadow-2xl"
          >
            {step === 1 && <Screen1 state={state} setState={setState} onNext={next} />}
            {step === 2 && <Screen2 state={state} setState={setState} onNext={next} />}
            {step === 3 && <Screen3 state={state} setState={setState} onNext={next} />}
            {step === 4 && <Screen4 state={state} setState={setState} onNext={next} />}
            {step === 5 && <Screen5 onNext={next} />}
            {step === 6 && <Screen6 state={state} setState={setState} onNext={next} />}
            {step === 7 && <Screen7 />}
          </motion.div>
        </AnimatePresence>

        {/* Compact Footer */}
        {step < 7 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 flex items-center justify-between px-8">
            {step > 1 ? (
              <button onClick={back} className="flex items-center gap-2 text-zinc-400 hover:text-zinc-900 font-bold transition-all text-xs group">
                <ChevronLeft className="h-3 w-3 group-hover:-translate-x-0.5 transition-transform" />
                Back
              </button>
            ) : <div />}

            {(step === 1 || step === 4) && (
              <button onClick={next} className="text-zinc-300 hover:text-zinc-900 text-xs font-bold">
                Skip for now
              </button>
            )}
          </motion.div>
        )}
      </div>
    </div>
  )
}

// --- Screen Components (Optimized for Height) ---

function Screen1({ state, setState, onNext }: ScreenProps) {
  const capacities = [
    { id: "Organize inbox", title: "Smart Inbox Triage", desc: "Automate labels & clean noise.", icon: Mail },
    { id: "Draft email replies", title: "AI Draft Engine", desc: "Replies in your unique voice.", icon: Sparkles },
    { id: "Archive less important emails", title: "Intelligent Archiving", desc: "Clear newsletters automatically.", icon: Zap },
    { id: "Track follow-ups", title: "Response Tracking", desc: "Watch for pending replies.", icon: Clock },
    { id: "Manage your calendar", title: "Executive Calendar", desc: "Smart scheduling assistants.", icon: Calendar },
    { id: "Attend meetings and take notes", title: "Meeting Intelligence", desc: "AI briefs & recorded minutes.", icon: Mic }
  ]

  const toggle = (id: string) => {
    setState((prev: OnboardingState) => ({
      ...prev,
      capabilities: prev.capabilities.includes(id)
        ? prev.capabilities.filter((c: string) => c !== id)
        : [...prev.capabilities, id]
    }))
  }

  return (
    <div className="space-y-8">
      <div className="text-left space-y-1">
        <h1 className="text-3xl font-black text-zinc-900 tracking-tight leading-none">Modules</h1>
        <p className="text-zinc-400 font-medium text-sm">Select how I should assist you.</p>
      </div>

      <div className="space-y-3 max-h-[320px] overflow-y-auto pr-2 custom-scrollbar">
        {capacities.map((item) => {
          const active = state.capabilities.includes(item.id)
          const Icon = item.icon
          return (
            <button
              key={item.id}
              onClick={() => toggle(item.id)}
              className={cn(
                "group w-full p-4 rounded-3xl border transition-all duration-500 text-left flex items-center gap-4 relative overflow-hidden",
                active
                  ? "bg-white border-zinc-900 shadow-[0_10px_30px_-5px_rgba(0,0,0,0.06)] scale-[1.01]"
                  : "bg-zinc-50/50 border-transparent hover:border-zinc-200 hover:bg-white"
              )}
            >
              <div className={cn(
                "h-11 w-11 rounded-2xl flex items-center justify-center transition-all duration-500 shrink-0",
                active ? "bg-zinc-900 text-white shadow-lg" : "bg-white text-zinc-300 shadow-sm border border-zinc-100"
              )}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className={cn("text-xs font-black uppercase tracking-widest", active ? "text-zinc-900" : "text-zinc-500")}>{item.title}</h3>
                <p className={cn("mt-1 text-[10px] font-bold leading-none", active ? "text-zinc-400" : "text-zinc-300")}>{item.desc}</p>
              </div>

              {active && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="h-6 w-6 rounded-full bg-zinc-900 flex items-center justify-center shadow-lg shrink-0"
                >
                  <Check className="h-3 w-3 text-white" strokeWidth={5} />
                </motion.div>
              )}
            </button>
          )
        })}
      </div>

      <button onClick={onNext} className="charcoal-btn w-full h-16 text-white rounded-[28px] font-black text-sm shadow-2xl flex items-center justify-center gap-3 group">
        Initialize Selected Modules
        <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
      </button>
    </div>
  )
}

function Screen2({ state, setState, onNext }: ScreenProps) {
  return (
    <div className="space-y-8">
      <div className="text-left space-y-1">
        <h1 className="text-2xl font-black text-zinc-900 tracking-tight">Workflow Rhythm</h1>
        <p className="text-zinc-400 font-medium text-sm">Defining schedules and guardrails.</p>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-300">Start Time</label>
            <select
              value={state.workingHours.start}
              onChange={(e) => setState((p: OnboardingState) => ({ ...p, workingHours: { ...p.workingHours, start: e.target.value } }))}
              className="w-full glass-input rounded-2xl px-4 py-3 text-xs font-black outline-none appearance-none cursor-pointer"
            >
              {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-300">End Time</label>
            <select
              value={state.workingHours.end}
              onChange={(e) => setState((p: any) => ({ ...p, workingHours: { ...p.workingHours, end: e.target.value } }))}
              className="w-full glass-input rounded-2xl px-4 py-3 text-xs font-black outline-none appearance-none cursor-pointer"
            >
              {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-300">Meeting Mins</label>
            <div className="flex glass-input p-1 rounded-2xl">
              {[15, 30, 60].map((d) => (
                <button key={d} onClick={() => setState((p: any) => ({ ...p, meetingDuration: d }))}
                  className={cn("flex-1 py-1.5 text-[10px] font-black rounded-xl transition-all", state.meetingDuration === d ? "bg-zinc-900 text-white" : "text-zinc-400")}
                >{d}M</button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-300">Notes Mode</label>
            <div className="flex glass-input p-1 rounded-2xl">
              {['manual', 'auto'].map((m) => (
                <button key={m} onClick={() => setState((p: OnboardingState) => ({ ...p, notesMode: m as 'manual' | 'auto' }))}
                  className={cn("flex-1 py-1.5 text-[10px] font-black rounded-xl transition-all capitalize", state.notesMode === m ? "bg-zinc-900 text-white" : "text-zinc-400")}
                >{m}</button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-zinc-50 flex items-center gap-4">
          <Clock className="h-5 w-5 text-zinc-300 shrink-0" />
          <p className="text-[10px] font-bold text-zinc-400 leading-relaxed italic">Appointments will be prioritized within these hours.</p>
        </div>
      </div>

      <button onClick={onNext} className="charcoal-btn w-full h-14 text-white rounded-[24px] font-black text-sm shadow-xl flex items-center justify-center gap-2">
        Continue <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  )
}

function Screen3({ state, setState, onNext }: ScreenProps) {
  const tones = ["Professional", "Direct", "Friendly", "Casual"]

  return (
    <div className="space-y-8">
      <div className="text-left space-y-1">
        <h1 className="text-2xl font-black text-zinc-900 tracking-tight">Writing Voice</h1>
        <p className="text-zinc-400 font-medium text-sm">Authentic drafts from day one.</p>
      </div>

      <div className="space-y-5">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-300">Draft Tone</label>
          <div className="grid grid-cols-4 gap-2">
            {tones.map((t) => (
              <button key={t} onClick={() => setState((p: OnboardingState) => ({ ...p, draftTone: t }))}
                className={cn("py-2.5 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all",
                  state.draftTone === t ? "bg-zinc-900 text-white border-zinc-900" : "bg-white text-zinc-400 border-zinc-100")}
              >{t}</button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-300">Signature</label>
          <input value={state.signature} onChange={(e) => setState((p: OnboardingState) => ({ ...p, signature: e.target.value }))}
            className="w-full glass-input rounded-2xl px-4 py-3 text-xs font-black outline-none italic placeholder:text-zinc-200"
            placeholder="– Your Name, Identity @ Company"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-300">Neural Training (Optional)</label>
          <textarea rows={2} value={state.examples} onChange={(e) => setState((p: OnboardingState) => ({ ...p, examples: e.target.value }))}
            className="w-full glass-input rounded-2xl px-4 py-3 text-[11px] font-medium outline-none resize-none placeholder:text-zinc-200"
            placeholder="Paste recent replies to train my tone engine."
          />
        </div>
      </div>

      <button onClick={onNext} className="charcoal-btn w-full h-14 text-white rounded-[24px] font-black text-sm shadow-xl flex items-center justify-center gap-2">
        Continue <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  )
}

function Screen4({ state, setState, onNext }: ScreenProps) {
  const [input, setInput] = React.useState('')
  const addVip = () => { if (input.includes('@')) { setState((p: OnboardingState) => ({ ...p, vips: [...p.vips, input] })); setInput('') } }
  const removeVip = (email: string) => setState((p: OnboardingState) => ({ ...p, vips: p.vips.filter((v: string) => v !== email) }))

  return (
    <div className="space-y-8">
      <div className="text-left space-y-1">
        <h1 className="text-2xl font-black text-zinc-900 tracking-tight">VIP Protocol</h1>
        <p className="text-zinc-400 font-medium text-sm">Protected senders who bypass filters.</p>
      </div>

      <div className="space-y-5">
        <div className="flex gap-2">
          <input type="email" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addVip()}
            className="flex-1 glass-input rounded-2xl px-4 py-3 text-xs font-black outline-none placeholder:text-zinc-200"
            placeholder="manager@company.com"
          />
          <button onClick={addVip} className="charcoal-btn text-white px-6 rounded-2xl text-xs font-black disabled:opacity-50" disabled={!input.includes('@')}>Add</button>
        </div>

        <div className="flex flex-wrap gap-2 max-h-[120px] overflow-y-auto pr-1 custom-scrollbar">
          {state.vips.map((email: string) => (
            <div key={email} className="flex items-center gap-2 pl-4 pr-1 py-1.5 rounded-full bg-zinc-50 border border-zinc-100 group">
              <span className="text-[10px] font-black text-zinc-800">{email}</span>
              <button onClick={() => removeVip(email)} className="h-6 w-6 rounded-full hover:bg-white flex items-center justify-center text-zinc-300">
                <Plus className="h-4 w-4 rotate-45" strokeWidth={3} />
              </button>
            </div>
          ))}
          {state.vips.length === 0 && <div className="w-full py-6 border border-dashed border-zinc-100 rounded-2xl flex flex-col items-center justify-center text-zinc-200 gap-1">
            <User className="h-6 w-6 opacity-20" />
            <span className="text-[9px] font-black uppercase tracking-widest">No VIPs added</span>
          </div>}
        </div>

        <div className="bg-zinc-50 p-4 rounded-3xl border border-zinc-100 flex items-center gap-4">
          <Sparkles className="h-4 w-4 text-zinc-300 shrink-0" />
          <p className="text-[10px] font-bold text-zinc-400 italic">VIPs are prioritized and clearly flagged in your terminal.</p>
        </div>
      </div>

      <button onClick={onNext} className="charcoal-btn w-full h-14 text-white rounded-[24px] font-black text-sm shadow-xl flex items-center justify-center gap-2">
        Continue <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  )
}

function Screen5({ onNext }: { onNext: () => void }) {
  const rules = [
    { title: "No Blind Dispatch", desc: "Explicit review for every draft." },
    { title: "Protected Schedule", desc: "Calendar changes require approval." },
    { title: "High-Risk Guard", desc: "Sensitive topics flagged for review." }
  ]

  return (
    <div className="space-y-8">
      <div className="text-left space-y-1">
        <h1 className="text-2xl font-black text-zinc-900 tracking-tight">Safety Protocols</h1>
        <p className="text-zinc-400 font-medium text-sm">Always active and non-negotiable.</p>
      </div>

      <div className="grid gap-2">
        {rules.map((r, i) => (
          <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-white border border-zinc-100 hover:border-zinc-300 transition-all">
            <Check className="h-4 w-4 text-emerald-500 shrink-0" strokeWidth={5} />
            <div>
              <h4 className="text-[11px] font-black text-zinc-800 leading-none">{r.title}</h4>
              <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest mt-1">{r.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="p-5 rounded-3xl bg-zinc-50 flex items-center gap-4">
        <Lock className="h-4 w-4 text-zinc-300" />
        <div className="flex flex-wrap gap-2">
          {["Legal", "Pricing", "Angry", "Hiring"].map(tag => (
            <span key={tag} className="text-[9px] font-black uppercase text-zinc-400">{tag}</span>
          ))}
        </div>
      </div>

      <button onClick={onNext} className="charcoal-btn w-full h-14 text-white rounded-[24px] font-black text-sm shadow-xl flex items-center justify-center gap-2">
        Confirm Protocols <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  )
}

function Screen6({ state, setState, onNext }: ScreenProps) {
  return (
    <div className="space-y-8">
      <div className="text-left space-y-1">
        <h1 className="text-2xl font-black text-zinc-900 tracking-tight">Acknowledgements</h1>
        <p className="text-zinc-400 font-medium text-sm">Save time with safe, common updates.</p>
      </div>

      <div className="p-6 rounded-3xl bg-white border border-zinc-100 space-y-5">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h4 className="text-[13px] font-black text-zinc-800 leading-none">Safe Auto-Send</h4>
            <p className="text-[10px] text-zinc-400 font-bold">Only pre-approved status acks.</p>
          </div>
          <button onClick={() => setState((p: OnboardingState) => ({ ...p, safeAutoSend: !p.safeAutoSend }))}
            className={cn("relative w-12 h-6 rounded-full transition-all duration-300", state.safeAutoSend ? "bg-emerald-500" : "bg-zinc-200")}>
            <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-all", state.safeAutoSend ? "left-7" : "left-1")} />
          </button>
        </div>
        <div className="grid gap-2">
          {["\"Got it—thanks!\"", "\"Noted to revert.\""].map((t, i) => (
            <div key={i} className="px-4 py-3 rounded-xl border border-zinc-50 text-[10px] font-black text-zinc-600 bg-zinc-50/50 italic">{t}</div>
          ))}
        </div>
      </div>

      <div className="flex items-start gap-4 p-4">
        <Lock className="h-4 w-4 text-zinc-300 shrink-0" />
        <p className="text-[10px] font-bold text-zinc-400 leading-relaxed italic">Aaliyah never auto-sends negotiations, pricing, or hiring threads.</p>
      </div>

      <button onClick={onNext} className="charcoal-btn w-full h-14 text-white rounded-[24px] font-black text-sm shadow-xl flex items-center justify-center gap-2">
        Finalize Workflow <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  )
}

function Screen7() {
  return (
    <div className="space-y-10 py-4 text-center">
      <div className="relative">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="mx-auto w-24 h-24 bg-zinc-900 rounded-[36px] flex items-center justify-center shadow-2xl relative z-10"
        ><Zap className="h-10 w-10 text-white fill-white" /></motion.div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-zinc-50 blur-[60px] rounded-full -z-10" />
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-black text-zinc-900 tracking-tighter">Primed.</h1>
        <p className="text-zinc-400 font-bold text-sm max-w-[240px] mx-auto">Elevating focus while preserving total control.</p>
      </div>

      <div className="max-w-[320px] mx-auto grid gap-2">
        {["Neural Triage Active", "Draft Engine Primed", "VIP Protocol Online"].map((item, i) => (
          <div key={i} className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-zinc-50 border border-zinc-100">
            <Check className="h-3 w-3 text-zinc-900" strokeWidth={6} />
            <span className="text-[11px] font-black text-zinc-800 uppercase tracking-tight">{item}</span>
          </div>
        ))}
      </div>

      <button onClick={() => window.location.href = '/aaliyahworkspace'}
        className="charcoal-btn w-full h-16 text-white rounded-[28px] font-black text-lg transition-all"
      >Launch Terminal</button>
    </div>
  )
}
