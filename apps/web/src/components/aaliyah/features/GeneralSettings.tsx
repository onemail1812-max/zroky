"use client"

import * as React from "react"
import { Loader2, Save, Check } from "lucide-react"
import { getAaliyahSettings, updateAaliyahSettings, AaliyahSettings } from "@/lib/aaliyah/api"
import { ToggleCard } from "@/components/aaliyah/ui/ToggleCard"
import { Input } from "@/components/aaliyah/ui/Input"
import { Button } from "@/components/aaliyah/ui/Button"

export function GeneralSettings() {
    const [loading, setLoading] = React.useState(true)
    const [settings, setSettings] = React.useState<AaliyahSettings | null>(null)
    const [saving, setSaving] = React.useState(false)
    const [saved, setSaved] = React.useState(false)
    const [error, setError] = React.useState<string | null>(null)
    const savedTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

    // Cleanup timeout on unmount
    React.useEffect(() => {
        return () => { if (savedTimerRef.current) clearTimeout(savedTimerRef.current) }
    }, [])

    React.useEffect(() => {
        loadSettings()
    }, [])

    async function loadSettings() {
        try {
            setLoading(true)
            const data = await getAaliyahSettings()
            setSettings(data)
        } catch (err) {
            console.error(err)
            setError("Failed to load settings.")
        } finally {
            setLoading(false)
        }
    }

    async function saveChange(patch: Partial<AaliyahSettings>) {
        if (!settings) return
        const previousSettings = { ...settings } // Snapshot before change
        const newSettings = { ...settings, ...patch }
        setSettings(newSettings) // Optimistic update
        setSaving(true)
        setSaved(false)
        setError(null)
        // Clear any pending "saved" dismiss timer
        if (savedTimerRef.current) {
            clearTimeout(savedTimerRef.current)
            savedTimerRef.current = null
        }
        try {
            await updateAaliyahSettings(newSettings)
            setSaved(true)
            savedTimerRef.current = setTimeout(() => setSaved(false), 3000)
        } catch (err) {
            console.error(err)
            setError("Failed to save changes.")
            setSettings(previousSettings) // Revert using snapshot, not stale closure
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-zinc-400" /></div>
    }

    if (!settings) {
        return <div className="p-4 text-red-500">Error loading settings.</div>
    }

    return (
        <div className="space-y-12 max-w-2xl pb-20">
            {/* Inbox & Autopilot */}
            <section className="space-y-6">
                <div>
                    <h2 className="text-xl font-bold tracking-tight">Inbox & Autopilot</h2>
                    <p className="text-sm text-zinc-500 mt-1">Control how Aaliyah manages your communications.</p>
                </div>

                <div className="grid gap-4">
                    <ToggleCard
                        title="Organize Inbox"
                        description="Automatically categorize and prioritize incoming emails."
                        checked={settings.organize_inbox_enabled}
                        onCheckedChange={(checked) => saveChange({ organize_inbox_enabled: checked })}
                    />
                    <ToggleCard
                        title="Draft Replies"
                        description="Generate draft responses for emails that require a reply."
                        checked={settings.draft_replies_enabled}
                        onCheckedChange={(checked) => saveChange({ draft_replies_enabled: checked })}
                    />
                    <ToggleCard
                        title="Intelligent Noise Suppression"
                        description="Automatically archive low-priority notifications and mass communications to protect your primary inbox focus."
                        checked={settings.archive_less_important}
                        onCheckedChange={(checked) => saveChange({ archive_less_important: checked })}
                    />
                    <ToggleCard
                        title="Track Follow-ups"
                        description="Monitor sent emails and notify you if no reply is received."
                        checked={settings.track_follow_ups}
                        onCheckedChange={(checked) => saveChange({ track_follow_ups: checked })}
                    />
                </div>
            </section>

            {/* Meetings & Scheduling */}
            <section className="space-y-6">
                <div>
                    <h2 className="text-xl font-bold tracking-tight">Meetings & Scheduling</h2>
                    <p className="text-sm text-zinc-500 mt-1">Configure your availability and scheduling preferences.</p>
                </div>

                <div className="space-y-6">
                    <ToggleCard
                        title="Calendar Assist"
                        description="Enable Aaliyah to manage your calendar and propose meeting times."
                        checked={settings.calendar_assist_enabled}
                        onCheckedChange={(checked) => saveChange({ calendar_assist_enabled: checked })}
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Working Hours Start</label>
                            <Input
                                type="time"
                                value={settings.working_hours_start}
                                onChange={(e) => setSettings({ ...settings, working_hours_start: e.target.value })}
                                onBlur={(e) => saveChange({ working_hours_start: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Working Hours End</label>
                            <Input
                                type="time"
                                value={settings.working_hours_end}
                                onChange={(e) => setSettings({ ...settings, working_hours_end: e.target.value })}
                                onBlur={(e) => saveChange({ working_hours_end: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Default Meeting Duration (min)</label>
                        <select
                            className="w-full h-10 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-950"
                            value={settings.default_meeting_duration}
                            onChange={(e) => saveChange({ default_meeting_duration: parseInt(e.target.value) })}
                        >
                            <option value={15}>15 minutes</option>
                            <option value={30}>30 minutes</option>
                            <option value={45}>45 minutes</option>
                            <option value={60}>60 minutes</option>
                        </select>
                    </div>
                </div>
            </section>

            {/* Personality & Tone */}
            <section className="space-y-6">
                <div>
                    <h2 className="text-xl font-bold tracking-tight">Personality & Tone</h2>
                    <p className="text-sm text-zinc-500 mt-1">Fine-tune how Aaliyah represents you.</p>
                </div>

                <div className="space-y-6">
                    <div className="space-y-3">
                        <label className="text-sm font-medium">Draft Tone</label>
                        <select
                            className="w-full h-10 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-950"
                            value={settings.draft_tone || "professional"}
                            onChange={(e) => saveChange({ draft_tone: e.target.value })}
                        >
                            <option value="professional">Professional & Concise</option>
                            <option value="warm">Warm & Friendly</option>
                            <option value="direct">Direct & Assertive</option>
                        </select>
                    </div>

                    <div className="space-y-3">
                        <label className="text-sm font-medium">Email Signature</label>
                        <textarea
                            className="flex min-h-[80px] w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-950"
                            placeholder="Best,\nYour Name"
                            value={settings.signature || ""}
                            onChange={(e) => setSettings({ ...settings, signature: e.target.value })}
                            onBlur={(e) => saveChange({ signature: e.target.value })}
                        />
                    </div>
                </div>
            </section>

            {/* Safety & Security */}
            <section className="space-y-6">
                <div>
                    <h2 className="text-xl font-bold tracking-tight">Safety & Security</h2>
                    <p className="text-sm text-zinc-500 mt-1">Compliance and risk management settings (Read-only).</p>
                </div>

                <div className="p-4 bg-zinc-50 rounded-lg border border-zinc-200 space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Approval-Required Topics</label>
                        <div className="flex flex-wrap gap-2">
                            {settings.approval_required_topics?.map(topic => (
                                <span key={topic} className="px-2 py-1 bg-white border border-zinc-200 rounded text-xs text-zinc-600 font-medium">
                                    {topic}
                                </span>
                            ))}
                        </div>
                    </div>

                    <ToggleCard
                        title="Require Approval Always"
                        description="Wait for your explicit approval before sending any AI-generated emails."
                        checked={settings.always_require_approval ?? false}
                        onCheckedChange={(checked) => saveChange({ always_require_approval: checked })}
                    />
                </div>
            </section>

            {/* Saved Indicator */}
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
                {saving ? (
                    <div className="bg-zinc-900 text-white px-4 py-2 rounded-full shadow-lg text-sm flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving changes...
                    </div>
                ) : saved ? (
                    <div className="bg-emerald-600 text-white px-4 py-2 rounded-full shadow-lg text-sm flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <Check className="h-4 w-4" />
                        All settings saved
                    </div>
                ) : null}
            </div>

            {error && <p className="text-xs text-red-500 mt-4">{error}</p>}
        </div>
    )
}
