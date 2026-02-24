"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Save, Loader2, Mail, Calendar, Activity, X, Check, Link2 } from "lucide-react"
import { getAaliyahSettings, updateAaliyahSettings, AaliyahSettings } from "@/lib/aaliyah/api"
import { cn } from "@/lib/utils"

interface SettingsFormProps {
    onClose?: () => void
}

export default function SettingsForm({ onClose }: SettingsFormProps) {
    const [activeTab, setActiveTab] = React.useState("accounts")
    const [saving, setSaving] = React.useState(false)
    const [message, setMessage] = React.useState("")

    const [config, setConfig] = React.useState({
        capabilities: [] as string[],

        organizeInbox: true,
        draftReplies: true,
        trackFollowUps: true,
        manageCalendar: true,
        attendMeetings: false,

        followUpDays: 3,
        maxFollowUps: 2,
        notesMode: 'manual',

        workingHours: { start: "09:00 AM", end: "06:00 PM" },
        defaultDuration: 30,
        alwaysRequireApproval: true,
        approvalRequiredTopics: [] as string[],
        draftTone: 'Professional',
        signature: '',
        examples: '',
        vip_senders: [] as string[],
        safeAutoSend: false,
        archiveLowPriority: false,

        emoji_usage: true,
        directness: 3,
        draft_disclosure: true,
        vip_roles: [] as string[],
        project_keywords: [] as string[],
        buffer_time_mins: 15,
        morning_briefing_time: "08:30 AM",
        focus_blocks: [] as string[],
        newsletter_policy: "archive",
        receipts_policy: "auto_label"
    })

    React.useEffect(() => {
        getAaliyahSettings().then(data => {
            if (data) {
                setConfig(c => ({
                    ...c,
                    capabilities: data.capabilities || [],
                    organizeInbox: data.organize_inbox_enabled ?? true,
                    draftReplies: data.draft_replies_enabled ?? true,
                    trackFollowUps: data.track_follow_ups ?? true,
                    manageCalendar: data.calendar_assist_enabled ?? true,
                    attendMeetings: data.attend_meetings ?? false,
                    followUpDays: data.follow_up_days || 3,
                    maxFollowUps: data.max_follow_ups || 2,
                    notesMode: data.notes_mode || 'manual',
                    workingHours: { start: data.working_hours_start || "09:00 AM", end: data.working_hours_end || "06:00 PM" },
                    defaultDuration: data.default_meeting_duration || 30,
                    alwaysRequireApproval: data.always_require_approval ?? true,
                    approvalRequiredTopics: data.approval_required_topics || [],
                    draftTone: data.draft_tone || 'Professional',
                    signature: data.signature || "",
                    examples: data.examples || "",
                    vip_senders: data.vip_senders || [],
                    safeAutoSend: data.auto_send_enabled ?? false,
                    archiveLowPriority: data.archive_less_important ?? false,

                    emoji_usage: data.emoji_usage ?? true,
                    directness: data.directness ?? 3,
                    draft_disclosure: data.draft_disclosure ?? true,
                    vip_roles: data.vip_roles || [],
                    project_keywords: data.project_keywords || [],
                    buffer_time_mins: data.buffer_time_mins ?? 15,
                    morning_briefing_time: data.morning_briefing_time || "08:30 AM",
                    focus_blocks: data.focus_blocks || [],
                    newsletter_policy: data.newsletter_policy || "archive",
                    receipts_policy: data.receipts_policy || "auto_label"
                }))
            }
        }).catch(console.error)
    }, [])

    const handleSave = async () => {
        setSaving(true)
        setMessage("")
        try {
            const caps = [...config.capabilities]
            const toggleCap = (add: boolean, name: string) => {
                const idx = caps.indexOf(name)
                if (add && idx === -1) caps.push(name)
                if (!add && idx > -1) caps.splice(idx, 1)
            }
            toggleCap(config.organizeInbox, "Organize inbox")
            toggleCap(config.draftReplies, "Draft email replies")
            toggleCap(config.trackFollowUps, "Track follow-ups")
            toggleCap(config.manageCalendar, "Manage your calendar")
            toggleCap(config.attendMeetings, "Attend meetings and take notes")
            toggleCap(config.archiveLowPriority, "Archive less important emails")

            const payload: AaliyahSettings = {
                capabilities: caps,
                organize_inbox_enabled: config.organizeInbox,
                draft_replies_enabled: config.draftReplies,
                track_follow_ups: config.trackFollowUps,
                follow_up_days: config.followUpDays,
                max_follow_ups: config.maxFollowUps,
                calendar_assist_enabled: config.manageCalendar,
                attend_meetings: config.attendMeetings,
                notes_mode: config.notesMode,

                working_hours_start: config.workingHours.start,
                working_hours_end: config.workingHours.end,
                default_meeting_duration: config.defaultDuration,
                auto_send_enabled: config.safeAutoSend,
                always_require_approval: config.alwaysRequireApproval,
                approval_required_topics: config.approvalRequiredTopics,
                draft_tone: config.draftTone,
                signature: config.signature,
                examples: config.examples,
                vip_senders: config.vip_senders,
                archive_less_important: config.archiveLowPriority,

                emoji_usage: config.emoji_usage,
                directness: config.directness,
                draft_disclosure: config.draft_disclosure,
                vip_roles: config.vip_roles,
                project_keywords: config.project_keywords,
                buffer_time_mins: config.buffer_time_mins,
                morning_briefing_time: config.morning_briefing_time,
                focus_blocks: config.focus_blocks,
                newsletter_policy: config.newsletter_policy as any,
                receipts_policy: config.receipts_policy as any
            }
            await updateAaliyahSettings(payload)
            setConfig(c => ({ ...c, capabilities: caps }))
            setMessage("Saved successfully.")
            setTimeout(() => setMessage(""), 3000)
        } catch (err) {
            console.error(err)
            setMessage("Failed.")
        } finally {
            setSaving(false)
        }
    }

    const tabs = [
        { id: "accounts", label: "Accounts", icon: Link2 },
        { id: "inbox", label: "Emails", icon: Mail },
        { id: "meetings", label: "Meetings", icon: Calendar },
        { id: "debug", label: "System Status", icon: Activity },
    ]

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-4xl bg-white h-[80vh] lg:h-[700px] rounded-3xl shadow-xl flex flex-col sm:flex-row border border-slate-200 overflow-hidden relative font-sans text-slate-900 selection:bg-slate-200"
            onClick={(e) => e.stopPropagation()}
        >
            <style dangerouslySetInnerHTML={{
                __html: `
              .custom-scrollbar::-webkit-scrollbar { width: 4px; }
              .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
              .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 0, 0, 0.1); border-radius: 10px; }
              .glass-switch { transition: all 0.3s; }
              .glass-switch.active { background: black; }
              .glass-switch:not(.active) { background: #e2e8f0; } /* slate-200 */
              .glass-switch .knob { transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1); background: white; }
            `}} />

            {/* Sidebar */}
            <div className="w-full sm:w-[240px] bg-slate-50/50 border-r border-slate-200 p-6 flex flex-col items-start gap-4 shrink-0">
                <div className="flex items-center gap-3 mb-6">
                    <div className="h-9 w-9 bg-black text-white rounded-xl flex items-center justify-center font-black shadow-sm">
                        <Mail className="h-4 w-4" />
                    </div>
                    <span className="font-bold text-slate-900 tracking-tight">Settings</span>
                </div>

                <div className="space-y-1.5 w-full flex-1">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-300",
                                activeTab === tab.id
                                    ? "bg-white text-black shadow-sm border border-slate-200"
                                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                            )}
                        >
                            <tab.icon className={cn("h-4 w-4", activeTab === tab.id ? "text-black" : "text-slate-400")} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="w-full pt-6 mt-auto border-t border-slate-200">
                    <button onClick={handleSave} disabled={saving} className="w-full py-3 bg-black hover:bg-slate-800 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-50 active:scale-95">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : <Save className="h-4 w-4 text-white" />}
                        {saving ? "Saving..." : "Save Changes"}
                    </button>
                    <AnimatePresence>
                        {message && (
                            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }} className="mt-4 text-[10px] font-bold text-slate-600 uppercase tracking-widest text-center">
                                {message}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 flex flex-col min-w-0 bg-transparent">
                <div className="h-20 px-10 flex items-center justify-between border-b border-slate-100 bg-white shrink-0">
                    <h2 className="text-xl font-bold text-slate-900 tracking-tight">{tabs.find(t => t.id === activeTab)?.label}</h2>
                    {onClose && (
                        <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="p-2.5 bg-slate-50 rounded-full text-slate-500 hover:text-black transition-colors border border-slate-200 hover:bg-slate-100">
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>

                <div className="flex-1 p-10 overflow-y-auto custom-scrollbar">
                    <div className="max-w-xl mx-auto">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-6"
                            >
                                {activeTab === 'inbox' && (
                                    <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                                            <div>
                                                <h3 className="font-bold text-slate-900">Organize Emails</h3>
                                                <p className="text-sm text-slate-500 mt-1">Automatically label incoming emails.</p>
                                            </div>
                                            <button onClick={() => setConfig(c => ({ ...c, organizeInbox: !c.organizeInbox }))} className={cn("glass-switch w-12 h-6 rounded-full flex items-center p-1", config.organizeInbox ? "active" : "")}>
                                                <div className={cn("knob w-4 h-4 rounded-full", config.organizeInbox ? "translate-x-6" : "")} />
                                            </button>
                                        </div>
                                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                                            <div>
                                                <h3 className="font-bold text-slate-900">Draft Replies</h3>
                                                <p className="text-sm text-slate-500 mt-1">Provide reply suggestions.</p>
                                            </div>
                                            <button onClick={() => setConfig(c => ({ ...c, draftReplies: !c.draftReplies }))} className={cn("glass-switch w-12 h-6 rounded-full flex items-center p-1", config.draftReplies ? "active" : "")}>
                                                <div className={cn("knob w-4 h-4 rounded-full", config.draftReplies ? "translate-x-6" : "")} />
                                            </button>
                                        </div>
                                        <div className="p-6 space-y-6">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h3 className="font-bold text-slate-900">Track Pending Replies</h3>
                                                    <p className="text-sm text-slate-500 mt-1">Remind you if someone hasn't replied.</p>
                                                </div>
                                                <button onClick={() => setConfig(c => ({ ...c, trackFollowUps: !c.trackFollowUps }))} className={cn("glass-switch w-12 h-6 rounded-full flex items-center p-1", config.trackFollowUps ? "active" : "")}>
                                                    <div className={cn("knob w-4 h-4 rounded-full", config.trackFollowUps ? "translate-x-6" : "")} />
                                                </button>
                                            </div>

                                            {config.trackFollowUps && (
                                                <div className="pt-6 border-t border-slate-100 flex gap-4">
                                                    <div className="flex-1">
                                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Wait Days</label>
                                                        <select className="w-full p-3.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 outline-none focus:border-black focus:ring-1 focus:ring-black font-medium transition-all" value={config.followUpDays} onChange={e => setConfig(c => ({ ...c, followUpDays: Number(e.target.value) }))}>
                                                            {[2, 3, 5, 7].map(d => <option key={d} value={d}>{d} Days</option>)}
                                                        </select>
                                                    </div>
                                                    <div className="flex-1">
                                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Max Attempts</label>
                                                        <select className="w-full p-3.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 outline-none focus:border-black focus:ring-1 focus:ring-black font-medium transition-all" value={config.maxFollowUps} onChange={e => setConfig(c => ({ ...c, maxFollowUps: Number(e.target.value) }))}>
                                                            {[1, 2, 3].map(d => <option key={d} value={d}>{d} Emails</option>)}
                                                        </select>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'meetings' && (
                                    <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                                            <div>
                                                <h3 className="font-bold text-slate-900">Manage Calendar</h3>
                                                <p className="text-sm text-slate-500 mt-1">Enable Aaliyah to read your availability.</p>
                                            </div>
                                            <button onClick={() => setConfig(c => ({ ...c, manageCalendar: !c.manageCalendar }))} className={cn("glass-switch w-12 h-6 rounded-full flex items-center p-1", config.manageCalendar ? "active" : "")}>
                                                <div className={cn("knob w-4 h-4 rounded-full", config.manageCalendar ? "translate-x-6" : "")} />
                                            </button>
                                        </div>
                                        <div className="p-6 space-y-6">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h3 className="font-bold text-slate-900">Attend Meetings</h3>
                                                    <p className="text-sm text-slate-500 mt-1">Join calls to take notes automatically.</p>
                                                </div>
                                                <button onClick={() => setConfig(c => ({ ...c, attendMeetings: !c.attendMeetings }))} className={cn("glass-switch w-12 h-6 rounded-full flex items-center p-1", config.attendMeetings ? "active" : "")}>
                                                    <div className={cn("knob w-4 h-4 rounded-full", config.attendMeetings ? "translate-x-6" : "")} />
                                                </button>
                                            </div>

                                            {config.attendMeetings && (
                                                <div className="pt-6 border-t border-slate-100">
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3">Notes Format</label>
                                                    <div className="flex gap-2 p-1.5 bg-slate-50 border border-slate-200 rounded-2xl">
                                                        <button onClick={() => setConfig(c => ({ ...c, notesMode: "manual" }))} className={cn("flex-1 py-3 text-sm font-bold rounded-xl transition-all", config.notesMode === "manual" ? "bg-white text-black shadow-sm border border-slate-200" : "text-slate-500 hover:text-black hover:bg-slate-100")}>Summary</button>
                                                        <button onClick={() => setConfig(c => ({ ...c, notesMode: "auto" }))} className={cn("flex-1 py-3 text-sm font-bold rounded-xl transition-all", config.notesMode === "auto" ? "bg-white text-black shadow-sm border border-slate-200" : "text-slate-500 hover:text-black hover:bg-slate-100")}>Full Transcript</button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'accounts' && (
                                    <div className="space-y-4">
                                        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                                            <div className="p-6 border-b border-slate-100">
                                                <h3 className="font-bold text-slate-900">Connected Accounts</h3>
                                                <p className="text-sm text-slate-500 mt-1">Connect your email and calendar to unlock Aaliyah's full potential.</p>
                                            </div>
                                            <div className="p-6 space-y-4">
                                                {/* Gmail */}
                                                <div className="flex items-center justify-between p-4 border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                                                            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
                                                                <path d="M22 6.5V17.5C22 18.88 20.88 20 19.5 20H4.5C3.12 20 2 18.88 2 17.5V6.5C2 5.12 3.12 4 4.5 4H19.5C20.88 4 22 5.12 22 6.5Z" fill="#EA4335" fillOpacity="0.1" />
                                                                <path d="M22 6L12 13L2 6" stroke="#EA4335" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                            </svg>
                                                        </div>
                                                        <div>
                                                            <h4 className="font-bold text-slate-900 text-sm">Gmail</h4>
                                                            <p className="text-xs text-slate-500">Connect your Google account for email and calendar</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => window.location.href = '/api/v1/connectors/oauth/google/init?service_type=email'}
                                                        className="px-5 py-2.5 bg-black hover:bg-slate-800 text-white rounded-xl text-sm font-bold transition-all active:scale-95 shadow-sm"
                                                    >
                                                        Connect
                                                    </button>
                                                </div>

                                                {/* Outlook */}
                                                <div className="flex items-center justify-between p-4 border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                                                            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
                                                                <path d="M20 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4Z" fill="#0078D4" fillOpacity="0.1" />
                                                                <path d="M22 6L12 13L2 6" stroke="#0078D4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                            </svg>
                                                        </div>
                                                        <div>
                                                            <h4 className="font-bold text-slate-900 text-sm">Outlook</h4>
                                                            <p className="text-xs text-slate-500">Connect your Microsoft account for email and calendar</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => window.location.href = '/api/v1/connectors/oauth/microsoft/init?service_type=email'}
                                                        className="px-5 py-2.5 bg-black hover:bg-slate-800 text-white rounded-xl text-sm font-bold transition-all active:scale-95 shadow-sm"
                                                    >
                                                        Connect
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'debug' && (
                                    <div className="p-8 rounded-3xl border border-slate-200 bg-slate-50 text-sm font-mono text-slate-500 space-y-4 shadow-sm">
                                        <div className="flex justify-between font-bold border-b border-slate-200 pb-4 mb-4 text-slate-700">
                                            <span>System Status</span>
                                            <span className="text-emerald-600 font-bold flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Active
                                            </span>
                                        </div>
                                        <p className="flex items-center gap-3"><Check className="w-4 h-4 text-emerald-500" /> APIs Connected</p>
                                        <p className="flex items-center gap-3"><Check className="w-4 h-4 text-emerald-500" /> Webhooks Operating</p>
                                        <p className="flex items-center gap-3"><Check className="w-4 h-4 text-emerald-500" /> Background sync is idle</p>
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </motion.div>
    )
}
