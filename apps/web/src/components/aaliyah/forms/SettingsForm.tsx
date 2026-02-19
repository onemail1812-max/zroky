"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Save,
    Loader2,
    Mail,
    Zap,
    Clock,
    Calendar,
    Shield,
    Check,
    Lock,
    X,
    ChevronRight,
    AlertTriangle,
    FileText,
    Inbox,
    Archive,
    Search,
    Mic,
    Settings as SettingsIcon,
    Users,
    Trash2,
    Plus
} from "lucide-react"
import { getAaliyahSettings, updateAaliyahSettings, AaliyahSettings } from "@/lib/aaliyah/api"
import { cn } from "@/lib/utils"

const TIMES = ["08:00 AM", "09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM", "06:00 PM", "07:00 PM", "08:00 PM"]
const FOLLOW_UP_DAYS = [2, 3, 5, 7]
const MAX_FOLLOW_UPS = [1, 2, 3]
const DURATIONS = [15, 30, 60]

interface SettingsFormProps {
    onClose?: () => void
}

export default function SettingsForm({ onClose }: SettingsFormProps) {
    const [activeTab, setActiveTab] = React.useState("inbox")
    const [saving, setSaving] = React.useState(false)
    const [message, setMessage] = React.useState("")

    const [config, setConfig] = React.useState({
        // 1. Inbox & Autopilot
        organizeInbox: true,
        draftReplies: true,
        archiveLowPriority: false,
        trackFollowUps: false,
        followUpDays: 3,
        maxFollowUps: 2,

        // 2. Meetings
        manageCalendar: false,
        attendMeetings: false,
        workingHours: { start: "09:00 AM", end: "06:00 PM" },
        defaultDuration: 30,
        notesMode: 'manual', // 'manual' | 'auto'

        // 4. Safe Auto-Send
        safeAutoSend: false,

        // 5. Global Laws
        alwaysRequireApproval: true,
        approvalRequiredTopics: [] as string[],

        // Hidden state to prevent data loss
        capabilities: [] as string[],
        draftTone: 'Professional',
        signature: '',
        examples: '',
        vip_senders: [] as string[]
    })

    React.useEffect(() => {
        getAaliyahSettings()
            .then(data => {
                if (data) {
                    setConfig({
                        organizeInbox: data.organize_inbox_enabled,
                        draftReplies: data.draft_replies_enabled,
                        archiveLowPriority: data.archive_less_important,
                        trackFollowUps: data.track_follow_ups,
                        followUpDays: data.follow_up_days || 3,
                        maxFollowUps: data.max_follow_ups || 2,
                        manageCalendar: data.calendar_assist_enabled,
                        attendMeetings: data.attend_meetings || false,
                        workingHours: {
                            start: data.working_hours_start,
                            end: data.working_hours_end
                        },
                        defaultDuration: data.default_meeting_duration,
                        notesMode: (data.notes_mode as any) || 'manual',
                        safeAutoSend: data.auto_send_enabled,
                        alwaysRequireApproval: data.always_require_approval ?? true,
                        approvalRequiredTopics: data.approval_required_topics || [],
                        capabilities: data.capabilities || [],
                        draftTone: data.draft_tone || 'Professional',
                        signature: data.signature || '',
                        examples: data.examples || '',
                        vip_senders: data.vip_senders || []
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
                organize_inbox_enabled: config.organizeInbox,
                draft_replies_enabled: config.draftReplies,
                archive_less_important: config.archiveLowPriority,
                track_follow_ups: config.trackFollowUps,
                follow_up_days: config.followUpDays,
                max_follow_ups: config.maxFollowUps,
                calendar_assist_enabled: config.manageCalendar,
                attend_meetings: config.attendMeetings,
                working_hours_start: config.workingHours.start,
                working_hours_end: config.workingHours.end,
                default_meeting_duration: config.defaultDuration,
                notes_mode: config.notesMode,
                auto_send_enabled: config.safeAutoSend,
                always_require_approval: config.alwaysRequireApproval,
                approval_required_topics: config.approvalRequiredTopics,
                capabilities: config.capabilities,
                draft_tone: config.draftTone,
                signature: config.signature,

                examples: config.examples,
                vip_senders: config.vip_senders
            }
            await updateAaliyahSettings(payload)
            setMessage("Configuration saved.")
            setTimeout(() => setMessage(""), 3000)
        } catch (err) {
            console.error(err)
            setMessage("Failed to save.")
        } finally {
            setSaving(false)
        }
    }

    const tabs = [
        { id: "inbox", label: "Inbox & Autopilot", icon: Inbox },
        { id: "meetings", label: "Meetings", icon: Calendar },
        { id: "safety", label: "Safety Laws", icon: Shield },
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
                    <div className="h-10 w-10 bg-zinc-900 rounded-xl flex items-center justify-center text-white shadow-lg shadow-zinc-200">
                        <SettingsIcon className="h-5 w-5" />
                    </div>
                    <div>
                        <span className="block font-bold text-zinc-900 text-sm">System Config</span>
                        <span className="block text-[10px] uppercase font-bold text-emerald-600 tracking-wider">Online</span>
                    </div>
                </div>

                <div className="space-y-1 w-full flex-1">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            data-testid={`settings-tab-${tab.id}`}
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
                            <p className="text-zinc-400 text-xs font-medium">Configure operational parameters.</p>
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

                    {/* 1. Inbox & Autopilot */}
                    {activeTab === 'inbox' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

                            {/* Organization */}
                            <div className="bg-white border border-zinc-100 rounded-2xl p-6 shadow-sm">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center"><Inbox className="h-4 w-4" /></div>
                                        <div>
                                            <h3 className="text-sm font-bold text-zinc-900">Organize Inbox</h3>
                                            <p className="text-xs text-zinc-500">Labels emails and moves newsletters/receipts/notifications to Cleaned.</p>
                                        </div>
                                    </div>
                                    <Toggle
                                        enabled={config.organizeInbox}
                                        onChange={() => setConfig({ ...config, organizeInbox: !config.organizeInbox })}
                                    />
                                </div>
                            </div>

                            {/* Drafting */}
                            <div className="bg-white border border-zinc-100 rounded-2xl p-6 shadow-sm">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center"><FileText className="h-4 w-4" /></div>
                                        <div>
                                            <h3 className="text-sm font-bold text-zinc-900">Draft Email Replies</h3>
                                            <p className="text-xs text-zinc-500">Prepares reply drafts in Needs Reply.</p>
                                        </div>
                                    </div>
                                    <Toggle
                                        enabled={config.draftReplies}
                                        onChange={() => setConfig({ ...config, draftReplies: !config.draftReplies })}
                                    />
                                </div>
                            </div>

                            {/* Archiving */}
                            <div className="bg-white border border-zinc-100 rounded-2xl p-6 shadow-sm">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 bg-orange-50 text-orange-600 rounded-lg flex items-center justify-center"><Archive className="h-4 w-4" /></div>
                                        <div>
                                            <h3 className="text-sm font-bold text-zinc-900">Archive Less Important Emails</h3>
                                            <p className="text-xs text-zinc-500">Archives low-priority emails automatically.</p>
                                        </div>
                                    </div>
                                    <Toggle
                                        enabled={config.archiveLowPriority}
                                        onChange={() => setConfig({ ...config, archiveLowPriority: !config.archiveLowPriority })}
                                    />
                                </div>
                            </div>

                            {/* Follow-ups */}
                            <div className="bg-white border border-zinc-100 rounded-2xl p-6 shadow-sm transition-all">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center"><Search className="h-4 w-4" /></div>
                                        <div>
                                            <h3 className="text-sm font-bold text-zinc-900">Track Follow-ups</h3>
                                            <p className="text-xs text-zinc-500">Monitor threads waiting for reply.</p>
                                        </div>
                                    </div>
                                    <Toggle
                                        enabled={config.trackFollowUps}
                                        onChange={() => setConfig({ ...config, trackFollowUps: !config.trackFollowUps })}
                                    />
                                </div>

                                <AnimatePresence>
                                    {config.trackFollowUps && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="pt-4 border-t border-zinc-100 mt-4 space-y-4">
                                                <div>
                                                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-2">Follow-up After (Days)</label>
                                                    <div className="flex gap-2">
                                                        {FOLLOW_UP_DAYS.map(d => (
                                                            <button
                                                                key={d}
                                                                onClick={() => setConfig({ ...config, followUpDays: d })}
                                                                className={cn(
                                                                    "flex-1 py-1.5 rounded-lg text-xs font-bold border transition-colors",
                                                                    config.followUpDays === d ? "bg-zinc-900 text-white border-zinc-900" : "bg-white text-zinc-500 border-zinc-200 hover:bg-zinc-50"
                                                                )}
                                                            >
                                                                {d}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-2">Max Follow-ups</label>
                                                    <div className="flex gap-2">
                                                        {MAX_FOLLOW_UPS.map(d => (
                                                            <button
                                                                key={d}
                                                                onClick={() => setConfig({ ...config, maxFollowUps: d })}
                                                                className={cn(
                                                                    "flex-1 py-1.5 rounded-lg text-xs font-bold border transition-colors",
                                                                    config.maxFollowUps === d ? "bg-zinc-900 text-white border-zinc-900" : "bg-white text-zinc-500 border-zinc-200 hover:bg-zinc-50"
                                                                )}
                                                            >
                                                                {d}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                            {/* VIP Registry */}
                            <div className="bg-white border border-zinc-100 rounded-2xl p-6 shadow-sm mt-6">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="h-8 w-8 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center"><Users className="h-4 w-4" /></div>
                                    <div>
                                        <h3 className="text-sm font-bold text-zinc-900">Priority Registry (VIPs)</h3>
                                        <p className="text-xs text-zinc-500">Emails from these senders bypass filters and always require review.</p>
                                    </div>
                                </div>
                                <ListManager
                                    items={config.vip_senders}
                                    placeholder="Enter email or domain (e.g. boss@corp.com)"
                                    onChange={(vips) => setConfig({ ...config, vip_senders: vips })}
                                />
                            </div>

                            {/* Aaliyah Persona */}
                            <div className="bg-white border border-zinc-100 rounded-2xl p-6 shadow-sm mt-6">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="h-8 w-8 bg-zinc-900 text-white rounded-lg flex items-center justify-center"><Mic className="h-4 w-4" /></div>
                                    <div>
                                        <h3 className="text-sm font-bold text-zinc-900">Aaliyah Persona</h3>
                                        <p className="text-xs text-zinc-500">Tone, signature, and examples used for drafting.</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-2">Draft Tone</label>
                                        <select
                                            value={config.draftTone}
                                            onChange={(e) => setConfig({ ...config, draftTone: e.target.value })}
                                            className="w-full bg-zinc-50 border-0 rounded-lg py-2 pl-3 pr-8 text-xs font-bold"
                                            data-testid="settings-draft-tone"
                                        >
                                            <option value="Professional">Professional</option>
                                            <option value="Direct">Direct</option>
                                            <option value="Friendly">Friendly</option>
                                            <option value="Casual">Casual</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-2">Email Signature</label>
                                        <input
                                            value={config.signature}
                                            onChange={(e) => setConfig({ ...config, signature: e.target.value })}
                                            className="w-full bg-zinc-50 border-zinc-200 rounded-lg py-2 px-3 text-xs font-medium focus:ring-1 focus:ring-zinc-900"
                                            placeholder="e.g. – Alex, CEO @ Zroky"
                                            data-testid="settings-signature"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-2">Style Transfer Examples</label>
                                        <textarea
                                            value={config.examples}
                                            onChange={(e) => setConfig({ ...config, examples: e.target.value })}
                                            className="w-full bg-zinc-50 border-zinc-200 rounded-lg py-2 px-3 text-xs font-medium min-h-[100px] resize-none focus:ring-1 focus:ring-zinc-900"
                                            placeholder="Paste example emails here..."
                                            data-testid="settings-examples"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}


                    {/* 2. Meetings */}
                    {activeTab === 'meetings' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* Calendar Management */}
                            <div className="bg-white border border-zinc-100 rounded-2xl p-6 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center"><Calendar className="h-4 w-4" /></div>
                                        <div>
                                            <h3 className="text-sm font-bold text-zinc-900">Manage Your Calendar</h3>
                                            <p className="text-xs text-zinc-500">Prepares scheduling, updates, and cancellations (always requires review).</p>
                                        </div>
                                    </div>
                                    <Toggle
                                        enabled={config.manageCalendar}
                                        onChange={() => setConfig({ ...config, manageCalendar: !config.manageCalendar })}
                                    />
                                </div>
                            </div>

                            {/* Attend Meetings */}
                            <div className="bg-white border border-zinc-100 rounded-2xl p-6 shadow-sm">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 bg-pink-50 text-pink-600 rounded-lg flex items-center justify-center"><Mic className="h-4 w-4" /></div>
                                        <div>
                                            <h3 className="text-sm font-bold text-zinc-900">Attend Meetings & Take Notes</h3>
                                            <p className="text-xs text-zinc-500">Aaliyah will join and transcribe.</p>
                                        </div>
                                    </div>
                                    <Toggle
                                        enabled={config.attendMeetings}
                                        onChange={() => setConfig({ ...config, attendMeetings: !config.attendMeetings })}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-2">Operating Window</label>
                                        <div className="flex gap-2">
                                            <select
                                                value={config.workingHours.start}
                                                onChange={(e) => setConfig({ ...config, workingHours: { ...config.workingHours, start: e.target.value } })}
                                                className="w-full bg-zinc-50 border-0 rounded-lg py-2 pl-3 pr-8 text-xs font-bold"
                                            >
                                                {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
                                            </select>
                                            <select
                                                value={config.workingHours.end}
                                                onChange={(e) => setConfig({ ...config, workingHours: { ...config.workingHours, end: e.target.value } })}
                                                className="w-full bg-zinc-50 border-0 rounded-lg py-2 pl-3 pr-8 text-xs font-bold"
                                            >
                                                {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-2">Default Duration</label>
                                        <div className="flex gap-2">
                                            {DURATIONS.map(d => (
                                                <button
                                                    key={d}
                                                    onClick={() => setConfig({ ...config, defaultDuration: d })}
                                                    className={cn(
                                                        "flex-1 py-2 rounded-lg text-xs font-bold border transition-colors",
                                                        config.defaultDuration === d ? "bg-zinc-900 text-white border-zinc-900" : "bg-white text-zinc-500 border-zinc-200"
                                                    )}
                                                >
                                                    {d}m
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="col-span-2 mt-2">
                                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-2">Notes Mode</label>
                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => setConfig({ ...config, notesMode: 'manual' })}
                                                className={cn("flex-1 p-3 rounded-xl border text-left", config.notesMode === 'manual' ? "bg-zinc-900 border-zinc-900 text-white" : "border-zinc-200 text-zinc-500")}
                                            >
                                                <div className="text-xs font-bold">Manual (Default)</div>
                                            </button>
                                            <button
                                                onClick={() => setConfig({ ...config, notesMode: 'auto' })}
                                                className={cn("flex-1 p-3 rounded-xl border text-left", config.notesMode === 'auto' ? "bg-zinc-900 border-zinc-900 text-white" : "border-zinc-200 text-zinc-500")}
                                            >
                                                <div className="text-xs font-bold">Auto (Requires Consent)</div>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 3. Safety Laws (Locked) */}
                    {activeTab === 'safety' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

                            {/* Safe Auto-Send Toggle */}
                            <div className="bg-zinc-950 rounded-2xl p-6 text-white shadow-xl shadow-zinc-200/50">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 bg-white/10 rounded-xl flex items-center justify-center"><Check className="h-5 w-5" /></div>
                                        <div>
                                            <h3 className="text-sm font-bold">Safe Auto-Send</h3>
                                            <p className="text-xs text-zinc-400">Allow autonomous low-risk responses.</p>
                                        </div>
                                    </div>
                                    <Toggle
                                        enabled={config.safeAutoSend}
                                        onChange={() => setConfig({ ...config, safeAutoSend: !config.safeAutoSend })}
                                        dark
                                    />
                                </div>

                                {config.safeAutoSend && (
                                    <div className="bg-white/5 rounded-xl p-4 border border-white/10 text-xs leading-relaxed text-zinc-300">
                                        Aaliyah is authorized to send <strong>only</strong> these acknowledgements:
                                        <ul className="list-disc pl-4 mt-2 space-y-1 text-white/80">
                                            <li>“Got it—thanks!”</li>
                                            <li>“Received, thank you.”</li>
                                            <li>“Noted. I’ll check and revert.”</li>
                                        </ul>
                                        <div className="mt-2 pt-2 border-t border-white/10 text-white/50 italic">
                                            Everything else = draft or approvals.
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Global Gate / Policy */}
                            <div className="bg-white border border-zinc-100 rounded-2xl p-6 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center"><Shield className="h-4 w-4" /></div>
                                        <div>
                                            <h3 className="text-sm font-bold text-zinc-900">Global Executive Review</h3>
                                            <p className="text-xs text-zinc-500">Force review for ALL actionable outgoing emails.</p>
                                        </div>
                                    </div>
                                    <Toggle
                                        enabled={config.alwaysRequireApproval}
                                        onChange={() => setConfig({ ...config, alwaysRequireApproval: !config.alwaysRequireApproval })}
                                    />
                                </div>
                            </div>

                            {/* Approvals Required / Sensitive Topics */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <AlertTriangle className="h-3 w-3 text-amber-500" />
                                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Sensitive Topic Registry</span>
                                </div>

                                <div className="bg-amber-50/50 rounded-2xl border border-amber-100 p-6">
                                    <p className="text-xs text-zinc-500 mb-4">Any email containing these keywords will be locked for review, even if Auto-Send is enabled.</p>
                                    <ListManager
                                        items={config.approvalRequiredTopics}
                                        placeholder="Add keyword (e.g. 'Partnership')"
                                        onChange={(topics) => setConfig({ ...config, approvalRequiredTopics: topics })}
                                        dark={false}
                                    />
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
                        data-testid="settings-save-btn"
                        className="bg-zinc-900 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-zinc-200 hover:bg-zinc-900 hover:translate-y-px transition-all flex items-center gap-2 disabled:opacity-70"
                    >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        {saving ? "Saving..." : "Save Configuration"}
                    </button>
                </div>
            </div>
        </motion.div>
    )
}

function ListManager({ items, placeholder, onChange, dark = false }: { items: string[], placeholder: string, onChange: (items: string[]) => void, dark?: boolean }) {
    const [input, setInput] = React.useState("")

    const handleAdd = () => {
        if (!input.trim()) return
        if (items.includes(input.trim())) {
            setInput("")
            return
        }
        onChange([...items, input.trim()])
        setInput("")
    }

    const handleRemove = (item: string) => {
        onChange(items.filter(i => i !== item))
    }

    return (
        <div className="space-y-3">
            <div className="flex gap-2">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                    placeholder={placeholder}
                    className={cn(
                        "flex-1 px-3 py-2 rounded-lg text-xs font-medium border focus:outline-none focus:ring-2",
                        dark
                            ? "bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:ring-white/20"
                            : "bg-zinc-50 border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:ring-zinc-900/5"
                    )}
                />
                <button
                    onClick={handleAdd}
                    className={cn(
                        "px-3 py-2 rounded-lg flex items-center justify-center transition-all",
                        dark ? "bg-white/10 text-white hover:bg-white/20" : "bg-zinc-900 text-white hover:bg-zinc-800"
                    )}
                >
                    <Plus className="h-4 w-4" />
                </button>
            </div>

            <div className="flex flex-wrap gap-2">
                <AnimatePresence>
                    {items.map((item) => (
                        <motion.div
                            key={item}
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            className={cn(
                                "flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-full border text-[10px] font-bold tracking-tight",
                                dark
                                    ? "bg-white/5 border-white/10 text-white/90"
                                    : "bg-white border-zinc-200 text-zinc-600 shadow-sm"
                            )}
                        >
                            <span>{item}</span>
                            <button
                                onClick={() => handleRemove(item)}
                                className={cn(
                                    "p-0.5 rounded-full transition-colors",
                                    dark ? "hover:bg-white/10 text-white/50" : "hover:bg-zinc-100 text-zinc-400"
                                )}
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </motion.div>
                    ))}
                </AnimatePresence>
                {items.length === 0 && (
                    <span className="text-[10px] text-zinc-400 italic py-2">No entries yet.</span>
                )}
            </div>
        </div>
    )
}

function Toggle({ enabled, onChange, dark = false }: { enabled: boolean, onChange: () => void, dark?: boolean }) {
    return (
        <button
            onClick={onChange}
            className={cn(
                "w-12 h-7 rounded-full transition-colors relative",
                enabled
                    ? (dark ? "bg-emerald-500" : "bg-zinc-900")
                    : (dark ? "bg-white/20" : "bg-zinc-200")
            )}
        >
            <div className={cn(
                "absolute top-1 bottom-1 w-5 rounded-full transition-transform bg-white shadow-sm",
                enabled ? "translate-x-6" : "translate-x-1"
            )} />
        </button>
    )
}
