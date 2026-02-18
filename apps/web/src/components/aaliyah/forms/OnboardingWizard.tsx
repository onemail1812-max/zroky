"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  Check,
  ChevronRight,
  ChevronLeft,
  Plus,
  Lock,
  Clock,
  Calendar,
  Sparkles,
  Zap,
  Mic,
  User,
  Mail,
  ArrowRight,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"

// --- CSS ---
const STYLE = `
  .custom-scrollbar::-webkit-scrollbar { width: 4px; }
  .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 0, 0, 0.08); border-radius: 10px; }
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

  const progress = (step / 7) * 100

  return (
    <div className="flex h-screen w-full bg-white overflow-hidden font-sans text-zinc-900">
      <style dangerouslySetInnerHTML={{ __html: STYLE }} />

      {/* Left: Hero Image Section (Fixed) */}
      <div className="relative w-1/2 h-full hidden lg:block bg-zinc-50 border-r border-zinc-100/50">
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
            className="relative w-full h-full"
          >
            <img
              src="/Onboarding/aaliyah-onboarding.png"
              alt="Aaliyah System Interface"
              className="w-full h-full object-cover object-top"
            />
            <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-90" />
          </motion.div>
        </div>

        {/* Dynamic Context Badge based on step */}
        <motion.div
          className="absolute bottom-12 left-12 right-12 text-white"
          key={step}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl font-bold tracking-tight mb-2">
            {step === 1 && "Core Capabilities"}
            {step === 2 && "Temporal Architecture"}
            {step === 3 && "Neural Voice Model"}
            {step === 4 && "VIP Protocol"}
            {step === 5 && "Safety Layer"}
            {step === 6 && "Automation Rules"}
            {step === 7 && "System Initialization"}
          </h2>
          <p className="text-lg text-white/80 font-medium max-w-md">
            {step === 1 && "Select the modules I should activate for your workspace."}
            {step === 2 && "Defining your availability and meeting preferences."}
            {step === 3 && "Training my drafting engine to match your style."}
            {step === 4 && "Identifying contacts who bypass standard filters."}
            {step === 5 && "Establishing non-negotiable guardrails."}
            {step === 6 && "Configuring autonomous response capabilities."}
            {step === 7 && "Finalizing configuration and booting up."}
          </p>
        </motion.div>
      </div>

      {/* Right: Interaction Section */}
      <div className="w-full lg:w-1/2 h-full flex flex-col relative bg-white">

        {/* Progress Header */}
        <div className="h-20 px-8 flex items-center justify-between border-b border-zinc-50 shrink-0">
          <div className="flex gap-2 items-center">
            <span className="text-xs font-black text-zinc-300 uppercase tracking-widest">Setup</span>
            <span className="text-xs font-black text-zinc-900">{Math.round(progress)}%</span>
          </div>

          {/* Step dots */}
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5, 6, 7].map((s) => (
              <div key={s} className={cn("h-1.5 rounded-full transition-all duration-300",
                step >= s ? "bg-zinc-900" : "bg-zinc-100",
                step === s ? "w-6" : "w-1.5"
              )} />
            ))}
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="min-h-full flex flex-col justify-center p-8 sm:p-12 lg:p-16 max-w-2xl mx-auto w-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                {step === 1 && <Screen1 state={state} setState={setState} onNext={next} />}
                {step === 2 && <Screen2 state={state} setState={setState} onNext={next} />}
                {step === 3 && <Screen3 state={state} setState={setState} onNext={next} />}
                {step === 4 && <Screen4 state={state} setState={setState} onNext={next} />}
                {step === 5 && <Screen5 onNext={next} />}
                {step === 6 && <Screen6 state={state} setState={setState} onNext={next} />}
                {step === 7 && <Screen7 state={state} />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="h-24 px-8 border-t border-zinc-50 flex items-center justify-between shrink-0 bg-white/80 backdrop-blur-md">
          {step > 1 && step < 7 ? (
            <button onClick={back} className="flex items-center gap-2 text-zinc-400 hover:text-zinc-900 font-bold transition-all text-sm group px-4 py-2 hover:bg-zinc-50 rounded-xl">
              <ChevronLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
              Back
            </button>
          ) : <div />}

          {(step === 1 || step === 4) && (
            <button onClick={next} className="text-zinc-300 hover:text-zinc-900 text-xs font-bold uppercase tracking-widest px-4">
              Skip
            </button>
          )}
        </div>

      </div>
    </div>
  )
}

// --- Screen Components ---

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
      <div className="space-y-2">
        <h1 className="text-5xl lg:text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-500">
          System Modules
        </h1>
        <p className="text-zinc-500 font-medium text-lg">Select the capabilities I should initialize.</p>
      </div>

      <div className="grid gap-3">
        {capacities.map((item) => {
          const active = state.capabilities.includes(item.id)
          const Icon = item.icon
          return (
            <button
              key={item.id}
              onClick={() => toggle(item.id)}
              className={cn(
                "group w-full p-4 rounded-3xl border transition-all duration-300 text-left flex items-center gap-4 relative overflow-hidden",
                active
                  ? "bg-zinc-50 border-zinc-900 ring-1 ring-zinc-900"
                  : "bg-white border-zinc-100 hover:border-zinc-200 hover:bg-zinc-50/50"
              )}
            >
              <div className={cn(
                "h-12 w-12 rounded-2xl flex items-center justify-center transition-all duration-300 shrink-0",
                active ? "bg-zinc-900 text-white" : "bg-zinc-50 text-zinc-300 group-hover:bg-white group-hover:text-zinc-400 border border-zinc-100"
              )}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className={cn("text-sm font-black uppercase tracking-wide", active ? "text-zinc-900" : "text-zinc-500")}>{item.title}</h3>
                <p className={cn("text-xs font-medium leading-none mt-1", active ? "text-zinc-500" : "text-zinc-300")}>{item.desc}</p>
              </div>

              {active && (
                <div className="h-6 w-6 rounded-full bg-zinc-900 flex items-center justify-center shrink-0">
                  <Check className="h-3 w-3 text-white" strokeWidth={4} />
                </div>
              )}
            </button>
          )
        })}
      </div>

      <button onClick={onNext} className="charcoal-btn w-full h-16 text-white rounded-[24px] font-black text-sm shadow-xl flex items-center justify-center gap-3 group mt-4">
        Activate Modules
        <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
      </button>
    </div>
  )
}

function Screen2({ state, setState, onNext }: ScreenProps) {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-5xl lg:text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-500">
          Workflow Rhythm
        </h1>
        <p className="text-zinc-500 font-medium text-lg">Define your active hours and default meeting cadence.</p>
      </div>

      <div className="space-y-6">

        {/* Section 1: Active Hours */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <label className="text-[11px] font-black uppercase tracking-widest text-zinc-400">Active Hours Protocol</label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Start Time */}
            <div className="relative group">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <span className="text-xs font-bold text-zinc-400">START</span>
              </div>
              <select
                value={state.workingHours.start}
                onChange={(e) => setState((p) => ({ ...p, workingHours: { ...p.workingHours, start: e.target.value } }))}
                className="w-full h-16 pl-16 pr-4 rounded-2xl bg-zinc-50 border border-zinc-100 font-black text-lg text-zinc-900 outline-none appearance-none cursor-pointer hover:bg-white focus:bg-white focus:ring-1 focus:ring-zinc-200 transition-all shadow-sm"
              >
                {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {/* End Time */}
            <div className="relative group">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <span className="text-xs font-bold text-zinc-400">END</span>
              </div>
              <select
                value={state.workingHours.end}
                onChange={(e) => setState((p) => ({ ...p, workingHours: { ...p.workingHours, end: e.target.value } }))}
                className="w-full h-16 pl-14 pr-4 rounded-2xl bg-zinc-50 border border-zinc-100 font-black text-lg text-zinc-900 outline-none appearance-none cursor-pointer hover:bg-white focus:bg-white focus:ring-1 focus:ring-zinc-200 transition-all shadow-sm"
              >
                {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div className="p-5 rounded-[24px] bg-indigo-50/50 border border-indigo-100/50 flex gap-4">
            <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 text-indigo-500">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-sm font-black text-indigo-900">Protected Focus Zone</h4>
              <p className="text-xs text-indigo-700/80 font-medium mt-1 leading-relaxed">
                Outside these hours, I will activate "Deep Shield" mode to silence non-urgent notifications and decline low-priority meetings.
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: Meeting Duration */}
        <div className="space-y-3 pt-2">
          <label className="text-[11px] font-black uppercase tracking-widest text-zinc-400 pl-1">Standard Meeting Unit</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { m: 15, label: "Speed" },
              { m: 30, label: "Standard" },
              { m: 60, label: "Deep" }
            ].map((opt) => {
              const active = state.meetingDuration === opt.m
              return (
                <button
                  key={opt.m}
                  onClick={() => setState((p) => ({ ...p, meetingDuration: opt.m }))}
                  className={cn(
                    "group py-3 px-4 rounded-[18px] border transition-all duration-200 flex items-center justify-center gap-2",
                    active
                      ? "bg-zinc-900 text-white border-zinc-900 shadow-md"
                      : "bg-white text-zinc-400 border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50"
                  )}
                >
                  <span className={cn("text-sm font-black", active ? "text-white" : "text-zinc-900")}>{opt.m}m</span>
                  <span className={cn("text-[10px] font-bold uppercase tracking-wider", active ? "text-zinc-400" : "text-zinc-400 group-hover:text-zinc-500")}>({opt.label})</span>
                </button>
              )
            })}
          </div>
          <p className="text-xs text-zinc-400 font-medium pl-1">
            {state.meetingDuration === 15 && "Perfect for standups and quick check-ins."}
            {state.meetingDuration === 30 && "Ideal for standard syncs and 1:1s."}
            {state.meetingDuration === 60 && "Reserved for strategy sessions and deep dives."}
          </p>
        </div>

      </div>

      <button onClick={onNext} className="charcoal-btn w-full h-16 text-white rounded-[24px] font-black text-sm shadow-xl flex items-center justify-center gap-3">
        Confirm Schedule <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  )
}

function Screen3({ state, setState, onNext }: ScreenProps) {
  const tones = ["Professional", "Direct", "Friendly", "Casual"]

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-5xl lg:text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-500">
          Sonic Identity
        </h1>
        <p className="text-zinc-500 font-medium text-lg">Calibrate my writing voice to yours.</p>
      </div>

      <div className="space-y-6">
        <div className="space-y-3">
          <label className="text-[11px] font-black uppercase tracking-widest text-zinc-400 pl-1">Tone Profile</label>
          <div className="grid grid-cols-2 gap-2">
            {tones.map((t) => (
              <button key={t} onClick={() => setState((p) => ({ ...p, draftTone: t }))}
                className={cn("py-4 rounded-2xl border text-xs font-bold transition-all",
                  state.draftTone === t ? "bg-zinc-900 text-white border-zinc-900 shadow-md" : "bg-white text-zinc-400 border-zinc-100 hover:border-zinc-200 hover:bg-zinc-50")}
              >{t}</button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-[11px] font-black uppercase tracking-widest text-zinc-400 pl-1">Email Signature</label>
          <input value={state.signature} onChange={(e) => setState((p) => ({ ...p, signature: e.target.value }))}
            className="w-full glass-input rounded-2xl px-5 py-4 text-sm font-medium outline-none placeholder:text-zinc-300 bg-zinc-50 border-transparent focus:bg-white transition-all"
            placeholder="e.g. – Alex, CEO @ Zroky"
          />
        </div>

        <div className="space-y-3">
          <label className="text-[11px] font-black uppercase tracking-widest text-zinc-400 pl-1">Style Transfer (Optional)</label>
          <textarea rows={3} value={state.examples} onChange={(e) => setState((p) => ({ ...p, examples: e.target.value }))}
            className="w-full glass-input rounded-3xl px-5 py-4 text-xs font-medium outline-none resize-none placeholder:text-zinc-300 bg-zinc-50 border-transparent focus:bg-white transition-all"
            placeholder="Paste a few of your sent emails here. I'll analyze sentence structure and vocabulary."
          />
        </div>
      </div>

      <button onClick={onNext} className="charcoal-btn w-full h-16 text-white rounded-[24px] font-black text-sm shadow-xl flex items-center justify-center gap-3">
        Calibrate Voice <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  )
}

function Screen4({ state, setState, onNext }: ScreenProps) {
  const [input, setInput] = React.useState('')
  const addVip = () => { if (input.includes('@')) { setState((p) => ({ ...p, vips: [...p.vips, input] })); setInput('') } }
  const removeVip = (email: string) => setState((p) => ({ ...p, vips: p.vips.filter((v: string) => v !== email) }))

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-5xl lg:text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-500">
          VIP List
        </h1>
        <p className="text-zinc-500 font-medium text-lg">Senders that require immediate attention.</p>
      </div>

      <div className="space-y-6">
        <div className="flex gap-2">
          <input type="email" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addVip()}
            className="flex-1 glass-input rounded-[20px] px-5 py-4 text-sm font-medium outline-none placeholder:text-zinc-300 bg-zinc-50 focus:bg-white transition-all"
            placeholder="stakeholder@company.com"
          />
          <button onClick={addVip} className="bg-zinc-900 hover:bg-black text-white px-6 rounded-[20px] text-sm font-bold disabled:opacity-50 transition-colors" disabled={!input.includes('@')}>
            <Plus className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-[120px] p-4 rounded-3xl bg-zinc-50 border border-zinc-100 flex flex-wrap content-start gap-2">
          {state.vips.map((email: string) => (
            <div key={email} className="flex items-center gap-2 pl-3 pr-1 py-1.5 rounded-full bg-white border border-zinc-200 shadow-sm group">
              <span className="text-xs font-bold text-zinc-700">{email}</span>
              <button onClick={() => removeVip(email)} className="h-6 w-6 rounded-full hover:bg-zinc-100 flex items-center justify-center text-zinc-400 transition-colors">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          {state.vips.length === 0 && (
            <div className="w-full h-full flex flex-col items-center justify-center text-zinc-300 py-8 gap-2">
              <User className="h-8 w-8 opacity-20" />
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-300">List Empty</span>
            </div>
          )}
        </div>
      </div>

      <button onClick={onNext} className="charcoal-btn w-full h-16 text-white rounded-[24px] font-black text-sm shadow-xl flex items-center justify-center gap-3">
        Continue <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  )
}

function Screen5({ onNext }: { onNext: () => void }) {
  const rules = [
    { title: "Human-in-the-Loop", desc: "No emails are sent without your explicit approval." },
    { title: "Calendar Lock", desc: "I cannot delete existing meetings without confirmation." },
    { title: "Sensitive Data", desc: "Financial and legal topics are flagged for review." }
  ]

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-5xl lg:text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-500">
          Safety Core
        </h1>
        <p className="text-zinc-500 font-medium text-lg">Hard-coded rules I cannot override.</p>
      </div>

      <div className="grid gap-3">
        {rules.map((r, i) => (
          <div key={i} className="flex items-start gap-4 p-5 rounded-[24px] bg-zinc-50 hover:bg-white border border-transparent hover:border-zinc-200 transition-all hover:shadow-lg hover:shadow-black/5 group">
            <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center shrink-0 text-emerald-500 shadow-sm border border-zinc-100">
              <Lock className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-sm font-black text-zinc-900">{r.title}</h4>
              <p className="text-xs text-zinc-500 font-medium mt-1 leading-relaxed">{r.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <button onClick={onNext} className="charcoal-btn w-full h-16 text-white rounded-[24px] font-black text-sm shadow-xl flex items-center justify-center gap-3">
        Acknowledge Protocols <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  )
}

function Screen6({ state, setState, onNext }: ScreenProps) {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-5xl lg:text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-500">
          Auto Pilot
        </h1>
        <p className="text-zinc-500 font-medium text-lg">Enable safe, autonomous acknowledgements.</p>
      </div>

      <div className="p-8 rounded-[32px] bg-zinc-900 text-white space-y-8 relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/20 blur-[80px] rounded-full pointer-events-none" />

        <div className="flex items-center justify-between relative z-10">
          <div className="space-y-1">
            <h4 className="text-xl font-black text-white">Safe Mode</h4>
            <p className="text-xs text-zinc-400 font-medium max-w-[200px]">Allow me to auto-reply to simple confirmations (e.g. "Receipt confirmed").</p>
          </div>
          <button onClick={() => setState((p) => ({ ...p, safeAutoSend: !p.safeAutoSend }))}
            className={cn("relative w-16 h-9 rounded-full transition-all duration-300 shadow-inner", state.safeAutoSend ? "bg-emerald-500" : "bg-white/10")}>
            <div className={cn("absolute top-1 w-7 h-7 bg-white rounded-full transition-all shadow-md transform", state.safeAutoSend ? "translate-x-8" : "translate-x-1")} />
          </button>
        </div>

        <div className="space-y-3 relative z-10">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Allowed Replies</span>
          <div className="flex flex-wrap gap-2">
            {["\"Got it, thanks!\"", "\"Noted.\"", "\"Received and filed.\""].map((t, i) => (
              <div key={i} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-medium text-emerald-200 italic">{t}</div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-4 p-4 rounded-2xl bg-zinc-50">
        <Lock className="h-5 w-5 text-zinc-300 shrink-0" />
        <p className="text-xs text-zinc-400 font-medium leading-relaxed">
          I will never auto-reply to threads containing questions, negotiations, or negative sentiment.
        </p>
      </div>

      <button onClick={onNext} className="charcoal-btn w-full h-16 text-white rounded-[24px] font-black text-sm shadow-xl flex items-center justify-center gap-3">
        Complete Configuration <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  )
}

function Screen7({ state }: { state?: OnboardingState }) {
  const router = useRouter()
  const [saving, setSaving] = React.useState(false)
  const [done, setDone] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const handleLaunch = async () => {
    setSaving(true)
    setError(null)
    try {
      /* Dynamic import to avoid SSR issues if any */
      const { completeOnboarding } = await import("@/lib/aaliyah/api")

      /* Submit configuration */
      console.log("Submitting onboarding config:", state) // Debug log
      const res = await completeOnboarding({
        capabilities: state?.capabilities || [],
        working_hours_start: state?.workingHours?.start || "09:00 AM",
        working_hours_end: state?.workingHours?.end || "06:00 PM",
        meeting_duration: state?.meetingDuration || 30,
        draft_tone: state?.draftTone || "Professional",
        signature: state?.signature || undefined,
        vips: state?.vips || [],
        safe_auto_send: state?.safeAutoSend || false,
      })

      setDone(true)

      /* Optimistic update for immediate UX */
      if (typeof window !== "undefined") {
        window.localStorage.setItem("aaliyah_onboarding_completed", "true")
        if (res.workspace_id) {
          window.localStorage.setItem("workspace_id", res.workspace_id)
          window.localStorage.setItem("tenant_id", res.workspace_id)
          window.localStorage.setItem("x_workspace_id", res.workspace_id)
        }
      }

      /* Redirect after brief success state */
      setTimeout(() => {
        router.push('/aaliyahworkspace')
      }, 1500)
    } catch (err: any) {
      console.error("Onboarding complete failed", err)
      setError(err?.message || "Protocol initialization failed. Please check connection.")
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center text-center h-full w-full max-w-2xl mx-auto py-8">

      {/* Modern Typography - Single Line */}
      <div className="space-y-6 mb-12">
        <h1 className="text-6xl lg:text-8xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-zinc-900 via-zinc-700 to-zinc-400 whitespace-nowrap">
          {done ? "System Live." : "System Ready."}
        </h1>
        <p className="text-zinc-500 font-medium text-xl leading-relaxed max-w-md mx-auto">
          {done ? "Redirecting to Command Center..." : "Core protocols established. Aaliyah is standing by."}
        </p>
      </div>

      {/* Terminal Check List */}
      <div className="w-full max-w-md bg-zinc-50/80 backdrop-blur-sm border border-zinc-200/50 rounded-2xl p-6 space-y-4 mb-12 text-left shadow-sm">
        {["Workspace Connected", "Permissions Verified", "Draft & Schedule Engine Ready"].map((t, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + (i * 0.15) }}
            className="flex items-center justify-between text-xs font-bold font-mono tracking-tight text-zinc-600"
          >
            <div className="flex items-center gap-3">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
              {t}
            </div>
            <span className="text-emerald-600/80 font-black">OK</span>
          </motion.div>
        ))}
      </div>

      {/* Mega Launch Button */}
      <div className="w-full max-w-md space-y-4">
        <button
          onClick={handleLaunch}
          disabled={saving || done}
          className="group relative w-full h-20 bg-zinc-900 hover:bg-black text-white rounded-[28px] overflow-hidden transition-all shadow-2xl hover:shadow-zinc-900/30 hover:-translate-y-1 active:scale-[0.98] disabled:opacity-80 disabled:cursor-not-allowed"
        >
          <div className="relative z-10 flex items-center justify-center gap-3 h-full px-8">
            {saving ? (
              <>
                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span className="font-bold tracking-wide text-lg">Initializing...</span>
              </>
            ) : (
              <>
                <span className="font-black text-lg tracking-wide">Launch Terminal</span>
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
              </>
            )}
          </div>
        </button>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-red-500 text-xs font-bold bg-red-50 p-3 rounded-xl border border-red-100 flex items-center justify-center gap-2"
          >
            <span className="block h-2 w-2 rounded-full bg-red-500" />
            Error: {error}
          </motion.div>
        )}
      </div>

    </div>
  )
}
