"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Save, Loader2, Sparkles, User, Calendar, Shield, X, Mail } from "lucide-react"
import { getAaliyahSettings, updateAaliyahSettings, AaliyahSettings } from "@/lib/aaliyah/api"
import { cn } from "@/lib/utils"

const TIMES = ["07:00 AM", "08:00 AM", "09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM", "06:00 PM", "07:00 PM", "08:00 PM"]

interface GuidelinesFormProps {
    onClose?: () => void
}

export default function GuidelinesForm({ onClose }: GuidelinesFormProps) {
    const [activeTab, setActiveTab] = React.useState("features")
    const [saving, setSaving] = React.useState(false)
    const [message, setMessage] = React.useState("")

    const [config, setConfig] = React.useState({
        capabilities: [] as string[],
        organizeInbox: true,
        draftReplies: true,
        manageCalendar: true,

        draftTone: 'Professional',
        directness: 3,
        emojiUsage: true,
        draftDisclosure: true,
        examples: '',

        vipEmails: [] as string[],
        projectKeywords: [] as string[],
        vipRoles: [] as string[],

        workingHours: { start: "09:00 AM", end: "06:00 PM" },
        bufferTimeMins: 15,
        morningBriefingTime: "08:30 AM",

        trackFollowUps: true,
        followUpDays: 3,
        maxFollowUps: 2,
        attendMeetings: false,
        nodesMode: 'manual',
        defaultDuration: 30,
        alwaysRequireApproval: true,
        approvalRequiredTopics: [] as string[],
        vipSenders: [] as string[],
        autoSendEnabled: false,
        archiveLessImportant: false,
        newsletterPolicy: "archive",
        receiptsPolicy: "auto_label"
    })

    const [kwInput, setKwInput] = React.useState("")
    const [emailInput, setEmailInput] = React.useState("")

    React.useEffect(() => {
        getAaliyahSettings().then(data => {
            if (data) {
                setConfig(c => ({
                    ...c,
                    capabilities: data.capabilities || [],
                    organizeInbox: data.organize_inbox_enabled ?? true,
                    draftReplies: data.draft_replies_enabled ?? true,
                    manageCalendar: data.calendar_assist_enabled ?? true,

                    draftTone: data.draft_tone || 'Professional',
                    directness: data.directness ?? 3,
                    emojiUsage: data.emoji_usage ?? true,
                    draftDisclosure: data.draft_disclosure ?? true,
                    examples: data.examples || '',

                    vipEmails: data.vip_senders || [],
                    projectKeywords: data.project_keywords || [],
                    vipRoles: data.vip_roles || [],

                    workingHours: { start: data.working_hours_start || "09:00 AM", end: data.working_hours_end || "06:00 PM" },
                    bufferTimeMins: data.buffer_time_mins ?? 15,
                    morningBriefingTime: data.morning_briefing_time || "08:30 AM",

                    trackFollowUps: data.track_follow_ups ?? true,
                    followUpDays: data.follow_up_days || 3,
                    maxFollowUps: data.max_follow_ups || 2,
                    attendMeetings: data.attend_meetings ?? false,
                    nodesMode: data.notes_mode || 'manual',
                    defaultDuration: data.default_meeting_duration || 30,
                    alwaysRequireApproval: data.always_require_approval ?? true,
                    approvalRequiredTopics: data.approval_required_topics || [],
                    autoSendEnabled: data.auto_send_enabled ?? false,
                    archiveLessImportant: data.archive_less_important ?? false,
                    newsletterPolicy: data.newsletter_policy || "archive",
                    receiptsPolicy: data.receipts_policy || "auto_label"
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
            toggleCap(config.manageCalendar, "Manage your calendar")

            const payload: AaliyahSettings = {
                capabilities: caps,
                organize_inbox_enabled: config.organizeInbox,
                draft_replies_enabled: config.draftReplies,
                calendar_assist_enabled: config.manageCalendar,
                draft_tone: config.draftTone,
                directness: config.directness,
                emoji_usage: config.emojiUsage,
                draft_disclosure: config.draftDisclosure,
                examples: config.examples,
                vip_senders: config.vipEmails,
                project_keywords: config.projectKeywords,
                vip_roles: config.vipRoles,
                working_hours_start: config.workingHours.start,
                working_hours_end: config.workingHours.end,
                buffer_time_mins: config.bufferTimeMins,
                morning_briefing_time: config.morningBriefingTime,

                track_follow_ups: config.trackFollowUps,
                follow_up_days: config.followUpDays,
                max_follow_ups: config.maxFollowUps,
                attend_meetings: config.attendMeetings,
                notes_mode: config.nodesMode,
                default_meeting_duration: config.defaultDuration,
                always_require_approval: config.alwaysRequireApproval,
                approval_required_topics: config.approvalRequiredTopics,
                auto_send_enabled: config.autoSendEnabled,
                archive_less_important: config.archiveLessImportant,
                newsletter_policy: config.newsletterPolicy as "archive" | "tab" | "ignore" | undefined,
                receipts_policy: config.receiptsPolicy as "auto_label" | "ignore" | undefined
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
        { id: "features", label: "Features", icon: Sparkles },
        { id: "style", label: "Writing Style", icon: User },
        { id: "priority", label: "Priority", icon: Shield },
        { id: "schedule", label: "Schedule", icon: Calendar }
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
                    <span className="font-bold text-slate-900 tracking-tight">Guidelines</span>
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
                                {activeTab === 'features' && (
                                    <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden divide-y divide-slate-100 shadow-sm">
                                        <div className="p-6 flex items-center justify-between">
                                            <div>
                                                <h3 className="font-bold text-slate-900">Organize Inbox</h3>
                                                <p className="text-sm text-slate-500 mt-1">Automatically label incoming emails.</p>
                                            </div>
                                            <button onClick={() => setConfig(c => ({ ...c, organizeInbox: !c.organizeInbox }))} className={cn("glass-switch w-12 h-6 rounded-full flex items-center p-1", config.organizeInbox ? "active" : "")}>
                                                <div className={cn("knob w-4 h-4 rounded-full", config.organizeInbox ? "translate-x-6" : "")} />
                                            </button>
                                        </div>
                                        <div className="p-6 flex items-center justify-between">
                                            <div>
                                                <h3 className="font-bold text-slate-900">Draft Replies</h3>
                                                <p className="text-sm text-slate-500 mt-1">Write suggested replies for important emails.</p>
                                            </div>
                                            <button onClick={() => setConfig(c => ({ ...c, draftReplies: !c.draftReplies }))} className={cn("glass-switch w-12 h-6 rounded-full flex items-center p-1", config.draftReplies ? "active" : "")}>
                                                <div className={cn("knob w-4 h-4 rounded-full", config.draftReplies ? "translate-x-6" : "")} />
                                            </button>
                                        </div>
                                        <div className="p-6 flex items-center justify-between">
                                            <div>
                                                <h3 className="font-bold text-slate-900">Manage Calendar</h3>
                                                <p className="text-sm text-slate-500 mt-1">Help schedule and propose meeting times.</p>
                                            </div>
                                            <button onClick={() => setConfig(c => ({ ...c, manageCalendar: !c.manageCalendar }))} className={cn("glass-switch w-12 h-6 rounded-full flex items-center p-1", config.manageCalendar ? "active" : "")}>
                                                <div className={cn("knob w-4 h-4 rounded-full", config.manageCalendar ? "translate-x-6" : "")} />
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'style' && (
                                    <>
                                        <div className="space-y-3">
                                            <label className="font-bold text-slate-900">Writing Tone</label>
                                            <select className="w-full p-4 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 outline-none focus:border-black focus:ring-1 focus:ring-black font-medium transition-all" value={config.draftTone} onChange={e => setConfig(c => ({ ...c, draftTone: e.target.value }))}>
                                                <option value="Professional">Professional</option>
                                                <option value="Friendly">Friendly</option>
                                                <option value="Direct">Direct & Short</option>
                                                <option value="Formal">Formal</option>
                                            </select>
                                        </div>
                                        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden divide-y divide-slate-100 shadow-sm mt-6">
                                            <div className="p-6 flex items-center justify-between cursor-pointer group" onClick={() => setConfig(c => ({ ...c, emojiUsage: !c.emojiUsage }))}>
                                                <div>
                                                    <p className="font-bold text-slate-900 group-hover:text-black transition-colors">Use Emojis</p>
                                                    <p className="text-sm text-slate-500 mt-1">Allow emojis in drafts</p>
                                                </div>
                                                <button className={cn("glass-switch w-12 h-6 rounded-full flex items-center p-1", config.emojiUsage ? "active" : "")}>
                                                    <div className={cn("knob w-4 h-4 rounded-full", config.emojiUsage ? "translate-x-6" : "")} />
                                                </button>
                                            </div>
                                            <div className="p-6 flex items-center justify-between cursor-pointer group" onClick={() => setConfig(c => ({ ...c, draftDisclosure: !c.draftDisclosure }))}>
                                                <div>
                                                    <p className="font-bold text-slate-900 group-hover:text-black transition-colors">AI Disclosure</p>
                                                    <p className="text-sm text-slate-500 mt-1">Add an "AI drafted" signature at the bottom</p>
                                                </div>
                                                <button className={cn("glass-switch w-12 h-6 rounded-full flex items-center p-1", config.draftDisclosure ? "active" : "")}>
                                                    <div className={cn("knob w-4 h-4 rounded-full", config.draftDisclosure ? "translate-x-6" : "")} />
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {activeTab === 'priority' && (
                                    <>
                                        <div className="p-6 rounded-3xl border border-slate-200 bg-white shadow-sm space-y-6">
                                            <div>
                                                <h3 className="font-bold text-slate-900">Important Keywords</h3>
                                                <p className="text-sm text-slate-500 mt-1">Emails containing these words are marked important.</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <input value={kwInput} onChange={e => setKwInput(e.target.value)} onKeyDown={e => {
                                                    if (e.key === 'Enter' && kwInput.trim()) {
                                                        setConfig(c => ({ ...c, projectKeywords: [...c.projectKeywords, kwInput.trim()] }));
                                                        setKwInput("");
                                                    }
                                                }} placeholder="budget, urgent, proposal..." className="flex-1 p-3.5 border border-slate-200 bg-slate-50 text-slate-900 rounded-xl outline-none focus:border-black focus:ring-1 focus:ring-black font-medium placeholder:text-slate-400 transition-all" />
                                                <button onClick={() => {
                                                    if (kwInput.trim()) {
                                                        setConfig(c => ({ ...c, projectKeywords: [...c.projectKeywords, kwInput.trim()] }));
                                                        setKwInput("");
                                                    }
                                                }} className="px-6 py-2 bg-black hover:bg-slate-800 font-bold text-white rounded-xl transition-colors">Add</button>
                                            </div>
                                            {config.projectKeywords.length > 0 && (
                                                <div className="flex flex-wrap gap-2 pt-2">
                                                    {config.projectKeywords.map((tag, i) => (
                                                        <span key={i} className="px-3.5 py-1.5 bg-slate-100 text-slate-800 text-sm font-semibold rounded-lg flex items-center gap-2 border border-slate-200">
                                                            {tag} <X className="h-3.5 w-3.5 cursor-pointer text-slate-400 hover:text-black" onClick={() => setConfig(c => ({ ...c, projectKeywords: c.projectKeywords.filter((_, idx) => idx !== i) }))} />
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <div className="p-6 rounded-3xl border border-slate-200 bg-white shadow-sm space-y-6">
                                            <div>
                                                <h3 className="font-bold text-slate-900">VIP Email Addresses</h3>
                                                <p className="text-sm text-slate-500 mt-1">Emails from these people are always a priority.</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <input value={emailInput} onChange={e => setEmailInput(e.target.value)} onKeyDown={e => {
                                                    if (e.key === 'Enter' && emailInput.trim()) {
                                                        setConfig(c => ({ ...c, vipEmails: [...c.vipEmails, emailInput.trim()] }));
                                                        setEmailInput("");
                                                    }
                                                }} placeholder="boss@company.com" className="flex-1 p-3.5 border border-slate-200 bg-slate-50 text-slate-900 rounded-xl outline-none focus:border-black focus:ring-1 focus:ring-black font-medium placeholder:text-slate-400 transition-all" />
                                                <button onClick={() => {
                                                    if (emailInput.trim()) {
                                                        setConfig(c => ({ ...c, vipEmails: [...c.vipEmails, emailInput.trim()] }));
                                                        setEmailInput("");
                                                    }
                                                }} className="px-6 py-2 bg-black hover:bg-slate-800 font-bold text-white rounded-xl transition-colors">Add</button>
                                            </div>
                                            {config.vipEmails.length > 0 && (
                                                <div className="flex flex-wrap gap-2 pt-2">
                                                    {config.vipEmails.map((tag, i) => (
                                                        <span key={i} className="px-3.5 py-1.5 bg-slate-100 text-slate-800 text-sm font-semibold rounded-lg flex items-center gap-2 border border-slate-200">
                                                            {tag} <X className="h-3.5 w-3.5 cursor-pointer text-slate-400 hover:text-black" onClick={() => setConfig(c => ({ ...c, vipEmails: c.vipEmails.filter((_, idx) => idx !== i) }))} />
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}

                                {activeTab === 'schedule' && (
                                    <div className="space-y-6">
                                        <div className="space-y-3">
                                            <label className="font-bold text-slate-900">Working Hours</label>
                                            <div className="flex items-center gap-3">
                                                <select className="flex-1 p-3.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 outline-none focus:border-black focus:ring-1 focus:ring-black font-medium transition-all" value={config.workingHours.start} onChange={e => setConfig(c => ({ ...c, workingHours: { ...c.workingHours, start: e.target.value } }))}>
                                                    {TIMES.map(t => <option key={t}>{t}</option>)}
                                                </select>
                                                <span className="text-slate-500 font-bold px-2">TO</span>
                                                <select className="flex-1 p-3.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 outline-none focus:border-black focus:ring-1 focus:ring-black font-medium transition-all" value={config.workingHours.end} onChange={e => setConfig(c => ({ ...c, workingHours: { ...c.workingHours, end: e.target.value } }))}>
                                                    {TIMES.map(t => <option key={t}>{t}</option>)}
                                                </select>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <label className="font-bold text-slate-900 flex justify-between tracking-tight">
                                                Gap between meetings
                                                <span className="text-slate-500 font-normal">{config.bufferTimeMins} mins</span>
                                            </label>
                                            <div className="flex gap-2 p-1.5 bg-slate-50 border border-slate-200 rounded-2xl">
                                                {[0, 5, 10, 15].map(m => (
                                                    <button key={m} onClick={() => setConfig(c => ({ ...c, bufferTimeMins: m }))} className={cn("flex-1 py-3 text-sm font-bold rounded-xl transition-all", config.bufferTimeMins === m ? "bg-white text-black shadow-sm border border-slate-200" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100")}>
                                                        {m}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
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
