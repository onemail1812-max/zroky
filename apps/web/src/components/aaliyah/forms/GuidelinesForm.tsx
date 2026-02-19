"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Save,
    Sparkles,
    Shield,
    Loader2,
    Mail,
    Zap,
    Clock,
    Calendar,
    Mic,
    User,
    Check,
    Plus,
    Lock,
    Command,
    Terminal,
    Search,
    X,
    Settings,
    ChevronRight
} from "lucide-react"
import { getAaliyahSettings, updateAaliyahSettings, AaliyahSettings } from "@/lib/aaliyah/api"
import { cn } from "@/lib/utils"

const TIMES = ["08:00 AM", "09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM", "06:00 PM", "07:00 PM", "08:00 PM"]

interface GuidelinesFormProps {
    onClose?: () => void
}

export default function GuidelinesForm({ onClose }: GuidelinesFormProps) {
    const [activeTab, setActiveTab] = React.useState("modules")
    const [saving, setSaving] = React.useState(false)
    const [message, setMessage] = React.useState("")

    // Unified state tracking everything
    const [state, setState] = React.useState({
        capabilities: ["Organize inbox", "Draft email replies", "Track follow-ups"],
        workingHours: { start: "09:00 AM", end: "06:00 PM" },
        meetingDuration: 30,
        notesMode: 'manual',
        draftTone: 'Professional',
        signature: '',
        examples: '',
        vips: [] as string[],
        safeAutoSend: false,
        // Hidden state to prevent data loss on save
        archive_less_important: false,
        follow_up_days: 3,
        max_follow_ups: 2
    })

    const [vipInput, setVipInput] = React.useState('')

    React.useEffect(() => {
        // Hydrate in background
        getAaliyahSettings()
            .then(data => {
                if (data) {
                    setState({
                        capabilities: data.capabilities || ["Organize inbox", "Draft email replies", "Track follow-ups"],
                        workingHours: {
                            start: data.working_hours_start,
                            end: data.working_hours_end
                        },
                        meetingDuration: data.default_meeting_duration,
                        notesMode: data.notes_mode || 'manual',
                        draftTone: data.draft_tone || 'Professional',
                        signature: data.signature || '',
                        examples: data.examples || '',
                        vips: data.vip_senders || [],
                        safeAutoSend: data.auto_send_enabled,
                        archive_less_important: data.archive_less_important,
                        follow_up_days: data.follow_up_days || 3,
                        max_follow_ups: data.max_follow_ups || 2
                    })
                }
            })
            .catch(console.error)
    }, [])

    const handleSave = async () => {
        setSaving(true)
        setMessage("")
        try {
            const payload: AaliyahSettings = {
                capabilities: state.capabilities,
                working_hours_start: state.workingHours.start,
                working_hours_end: state.workingHours.end,
                default_meeting_duration: state.meetingDuration,
                notes_mode: state.notesMode,
                draft_tone: state.draftTone,
                signature: state.signature,
                examples: state.examples,
                vip_senders: state.vips,
                auto_send_enabled: state.safeAutoSend,
                archive_less_important: state.capabilities.includes("Archive noise"),
                follow_up_days: state.follow_up_days,
                max_follow_ups: state.max_follow_ups,
                // These are also updated by this form to keep consistency
                organize_inbox_enabled: state.capabilities.includes("Organize inbox"),
                draft_replies_enabled: state.capabilities.includes("Draft email replies"),
                track_follow_ups: state.capabilities.includes("Track follow-ups"),
                calendar_assist_enabled: state.capabilities.includes("Manage calendar"),
                attend_meetings: state.capabilities.includes("Meeting intelligence")
            }
            await updateAaliyahSettings(payload)
            setMessage("Protocols deployed.")
            setTimeout(() => setMessage(""), 3000)
        } catch (err) {
            console.error(err)
            setMessage("Update failed.")
        } finally {
            setSaving(false)
        }
    }

    const toggleCapability = (id: string) => {
        setState(prev => ({
            ...prev,
            capabilities: prev.capabilities.includes(id)
                ? prev.capabilities.filter(c => c !== id)
                : [...prev.capabilities, id]
        }))
    }

    const addVip = () => {
        if (vipInput.includes('@')) {
            setState(prev => ({ ...prev, vips: [...prev.vips, vipInput] }))
            setVipInput('')
        }
    }

    const tabs = [
        { id: "modules", label: "Neural Modules", icon: Zap },
        { id: "rhythm", label: "Tempo & Rhythm", icon: Clock },
        { id: "persona", label: "Persona & Voice", icon: User },
        { id: "security", label: "VIPs", icon: Shield },
    ]

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-5xl mx-auto bg-white min-h-[700px] rounded-3xl shadow-2xl border border-zinc-100 flex overflow-hidden my-12"
        >
            {/* Sidebar */}
            <div className="w-72 bg-zinc-50 border-r border-zinc-100 p-6 flex flex-col items-start gap-2 shrink-0">
                <div className="flex items-center gap-2 mb-8 px-3 w-full">
                    <div className="h-10 w-10 bg-zinc-950 rounded-xl flex items-center justify-center text-white shadow-lg shadow-zinc-200">
                        <Terminal className="h-5 w-5" />
                    </div>
                    <div>
                        <span className="block font-bold text-zinc-900 text-sm">Command Center</span>
                        <span className="block text-[10px] uppercase font-bold text-emerald-600 tracking-wider">System Online</span>
                    </div>
                </div>

                <div className="space-y-1 w-full flex-1">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all group",
                                activeTab === tab.id
                                    ? "bg-white text-zinc-900 shadow-sm border border-zinc-100 ring-1 ring-zinc-50"
                                    : "text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100/50"
                            )}
                        >
                            <tab.icon className={cn("h-4 w-4 transition-colors", activeTab === tab.id ? "text-zinc-900" : "text-zinc-400 group-hover:text-zinc-600")} />
                            {tab.label}
                            {activeTab === tab.id && (
                                <ChevronRight className="h-3 w-3 ml-auto text-zinc-300" />
                            )}
                        </button>
                    ))}
                </div>

                {/* Save Status - moved to bottom of sidebar */}
                <div className="w-full pt-6 border-t border-zinc-200/50">
                    <AnimatePresence>
                        {message && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                className={cn(
                                    "px-3 py-2 rounded-lg text-[10px] font-bold border flex items-center gap-2 mb-4",
                                    message.includes("failed")
                                        ? "bg-red-50 text-red-600 border-red-100"
                                        : "bg-emerald-50 text-emerald-600 border-emerald-100"
                                )}
                            >
                                {message.includes("failed") ? <Shield className="h-3 w-3" /> : <Check className="h-3 w-3" />}
                                {message}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 flex flex-col min-w-0 bg-white relative">
                <div className="flex-1 p-10 overflow-y-auto custom-scrollbar pb-32">
                    <div className="flex justify-between items-start mb-8">
                        <div>
                            <h2 className="text-2xl font-bold text-zinc-900 capitalize tracking-tight mb-1">{tabs.find(t => t.id === activeTab)?.label}</h2>
                            <p className="text-zinc-400 text-xs font-medium">Configure advanced parameters for this sector.</p>
                        </div>
                        {onClose && (
                            <button
                                onClick={onClose}
                                className="h-8 w-8 rounded-full bg-zinc-50 hover:bg-zinc-100 border border-zinc-100 flex items-center justify-center transition-colors text-zinc-400 hover:text-zinc-900"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>

                    {/* render content based on tab */}
                    {activeTab === 'modules' && (
                        <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {[
                                { id: "Organize inbox", title: "Inbox Zero", icon: Mail, desc: "Auto-triage & labeling" },
                                { id: "Draft email replies", title: "Draft Engine", icon: Sparkles, desc: "Context-aware replies" },
                                { id: "Archive noise", title: "Signal Filter", icon: Shield, desc: "Suppress low-value noise" },
                                { id: "Track follow-ups", title: "Loop Tracker", icon: Search, desc: "Monitor pending replies" },
                                { id: "Manage calendar", title: "Time Guard", icon: Calendar, desc: "Conflict protection" },
                                { id: "Meeting intelligence", title: "Briefing Agent", icon: Mic, desc: "Prep & minutes" },
                            ].map((mod) => {
                                const active = state.capabilities.includes(mod.id)
                                return (
                                    <button
                                        key={mod.id}
                                        onClick={() => toggleCapability(mod.id)}
                                        className={cn(
                                            "relative p-5 rounded-2xl border text-left transition-all duration-300 group overflow-hidden h-32 flex flex-col justify-between hover:scale-[1.02]",
                                            active
                                                ? "bg-zinc-900 border-zinc-900 text-white shadow-xl shadow-zinc-200"
                                                : "bg-white border-zinc-200 hover:border-zinc-300 text-zinc-500 hover:bg-zinc-50"
                                        )}
                                    >
                                        <div className="flex justify-between items-start w-full">
                                            <div className={cn(
                                                "h-8 w-8 rounded-lg flex items-center justify-center transition-colors",
                                                active ? "bg-zinc-800 text-white" : "bg-zinc-100 text-zinc-400 group-hover:bg-white group-hover:shadow-sm"
                                            )}>
                                                <mod.icon className="h-4 w-4" />
                                            </div>
                                            {active && (
                                                <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse" />
                                            )}
                                        </div>
                                        <div>
                                            <h3 className={cn("text-xs font-bold uppercase tracking-wide mb-1", active ? "text-white" : "text-zinc-900")}>
                                                {mod.title}
                                            </h3>
                                            <p className={cn("text-[10px] font-medium leading-relaxed", active ? "text-zinc-400" : "text-zinc-400")}>
                                                {mod.desc}
                                            </p>
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    )}

                    {activeTab === 'rhythm' && (
                        <div className="space-y-8 max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="space-y-4">
                                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Operating Window</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="relative">
                                        <select
                                            value={state.workingHours.start}
                                            onChange={(e) => setState({ ...state, workingHours: { ...state.workingHours, start: e.target.value } })}
                                            className="w-full appearance-none bg-zinc-50 hover:bg-zinc-100 transition-colors border-0 rounded-xl px-4 py-3.5 text-xs font-bold text-zinc-900 focus:ring-1 focus:ring-zinc-950 cursor-pointer"
                                        >
                                            {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </div>
                                    <div className="relative">
                                        <select
                                            value={state.workingHours.end}
                                            onChange={(e) => setState({ ...state, workingHours: { ...state.workingHours, end: e.target.value } })}
                                            className="w-full appearance-none bg-zinc-50 hover:bg-zinc-100 transition-colors border-0 rounded-xl px-4 py-3.5 text-xs font-bold text-zinc-900 focus:ring-1 focus:ring-zinc-950 cursor-pointer"
                                        >
                                            {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Default Meeting Duration</label>
                                <div className="flex gap-3">
                                    {[15, 30, 60].map(d => (
                                        <button
                                            key={d}
                                            onClick={() => setState({ ...state, meetingDuration: d })}
                                            className={cn(
                                                "flex-1 py-3 rounded-xl text-xs font-bold transition-all border",
                                                state.meetingDuration === d
                                                    ? "bg-zinc-950 text-white border-zinc-950 shadow-md"
                                                    : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50"
                                            )}
                                        >
                                            {d} minutes
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'persona' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Tone Matrix</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {["Professional", "Direct", "Friendly", "Casual"].map(tone => (
                                            <button
                                                key={tone}
                                                onClick={() => setState({ ...state, draftTone: tone })}
                                                className={cn(
                                                    "py-3 px-3 rounded-xl text-[10px] font-bold uppercase tracking-wide transition-all border",
                                                    state.draftTone === tone
                                                        ? "bg-zinc-950 text-white border-zinc-950 shadow-md"
                                                        : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50"
                                                )}
                                            >
                                                {tone}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Signature Block</label>
                                    <div className="relative group h-full">
                                        <textarea
                                            value={state.signature}
                                            onChange={(e) => setState({ ...state, signature: e.target.value })}
                                            className="w-full h-[108px] bg-zinc-50 group-hover:bg-zinc-100 transition-colors border-0 rounded-xl px-4 py-3 text-xs font-medium focus:ring-1 focus:ring-zinc-950 placeholder:text-zinc-300 resize-none"
                                            placeholder="e.g. Sent from Aaliyah HQ..."
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-zinc-900 rounded-2xl p-8 shadow-2xl shadow-zinc-200 overflow-hidden relative border border-zinc-800">
                                <div className="absolute top-0 right-0 p-8 opacity-10">
                                    <Command className="h-64 w-64 text-white transform rotate-12 translate-x-12 -translate-y-12" />
                                </div>

                                <div className="relative z-10 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-white font-bold text-sm tracking-tight">Context Injection</h3>
                                        <span className="text-[10px] font-bold bg-white/10 text-white/60 px-2 py-0.5 rounded-md uppercase tracking-wider border border-white/5">Optional</span>
                                    </div>
                                    <p className="text-zinc-400 text-xs max-w-lg leading-relaxed font-medium">
                                        Provide raw email samples to calibrate the neural engine's mimicry of your personal syntax and vocabulary.
                                    </p>
                                    <textarea
                                        rows={3}
                                        value={state.examples}
                                        onChange={(e) => setState({ ...state, examples: e.target.value })}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-4 text-xs font-mono text-zinc-300 focus:outline-none focus:border-white/20 resize-none placeholder:text-zinc-600 focus:ring-1 focus:ring-white/20 transition-all custom-scrollbar"
                                        placeholder="// Paste stylistic examples here..."
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'security' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* VIP Input */}
                            <div className="space-y-4">
                                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Priority Registry (VIPs)</label>
                                <div className="flex gap-3">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-4 top-3.5 h-4 w-4 text-zinc-300" />
                                        <input
                                            type="email"
                                            value={vipInput}
                                            onChange={(e) => setVipInput(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && addVip()}
                                            className="w-full bg-zinc-50 border-0 rounded-xl pl-11 pr-4 py-3 text-sm font-medium focus:ring-1 focus:ring-zinc-950"
                                            placeholder="Add VIP domain or email..."
                                        />
                                    </div>
                                    <button
                                        onClick={addVip}
                                        disabled={!vipInput}
                                        className="bg-zinc-950 text-white px-6 rounded-xl hover:bg-zinc-800 transition-colors disabled:opacity-50 font-bold text-sm"
                                    >
                                        Add
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-3 mt-4">
                                    {state.vips.length > 0 ? (
                                        state.vips.map((email) => (
                                            <div key={email} className="group flex items-center justify-between p-3 rounded-xl bg-white border border-zinc-200 hover:border-zinc-300 transition-colors shadow-sm">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center text-xs font-black text-zinc-900">
                                                        {email.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="text-sm font-bold text-zinc-700">{email}</span>
                                                </div>
                                                <button
                                                    onClick={() => setState({ ...state, vips: state.vips.filter(v => v !== email) })}
                                                    className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-zinc-50 rounded-lg text-zinc-400 hover:text-red-500 transition-all"
                                                >
                                                    <X className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="col-span-2 text-center py-10 border-2 border-dashed border-zinc-100 rounded-2xl bg-zinc-50/50">
                                            <p className="text-zinc-400 text-xs font-medium">No active VIPs in registry.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                </div>

                {/* Footer Actions */}
                <div className="absolute bottom-0 left-0 w-full p-6 border-t border-zinc-100 bg-white flex justify-end gap-3 z-10">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-zinc-950 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-zinc-200 hover:bg-zinc-900 hover:translate-y-px transition-all flex items-center gap-2 disabled:opacity-70"
                    >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        {saving ? "Saving..." : "Save Configuration"}
                    </button>
                </div>
            </div>
        </motion.div>
    )
}
