"use client"

import * as React from "react"
import { Loader2, Plus, X } from "lucide-react"
import { getLabelingPreferences, updateLabelingPreferences, LabelingPreferencesPayload } from "@/lib/aaliyah/api"
import { ToggleCard } from "@/components/aaliyah/ui/ToggleCard"
import { Input } from "@/components/aaliyah/ui/Input"
import { Button } from "@/components/aaliyah/ui/Button"
import { Chip } from "@/components/aaliyah/ui/Chip"
import { Slider } from "@/components/aaliyah/ui/Slider"
import { cn } from "@/lib/utils"

const ALLOWED_LABELS = ["Urgent", "Meeting", "FYI", "Awaiting Reply", "High Priority", "Actioned"]

export function RulesSettings() {
    const [loading, setLoading] = React.useState(true)
    const [preferences, setPreferences] = React.useState<LabelingPreferencesPayload | null>(null)
    const [saving, setSaving] = React.useState(false)
    const [error, setError] = React.useState<string | null>(null)

    // Local state for inputs
    const [vipInput, setVipInput] = React.useState("")
    const [domainInput, setDomainInput] = React.useState("")

    React.useEffect(() => {
        loadPreferences()
    }, [])

    async function loadPreferences() {
        try {
            setLoading(true)
            const data = await getLabelingPreferences()
            setPreferences(data)
        } catch (err) {
            console.error(err)
            setError("Failed to load preferences.")
        } finally {
            setLoading(false)
        }
    }

    async function saveChange(patch: Partial<LabelingPreferencesPayload>) {
        if (!preferences) return
        const newPrefs = { ...preferences, ...patch }
        setPreferences(newPrefs) // Optimistic update
        setSaving(true)
        try {
            await updateLabelingPreferences(newPrefs)
        } catch (err) {
            console.error(err)
            setError("Failed to save changes.")
            // Revert? (In complex apps, yes. Here, let's keep it simple)
        } finally {
            setSaving(false)
        }
    }

    function toggleLabel(label: string) {
        if (!preferences) return
        const current = preferences.enabled_labels || []
        const next = current.includes(label)
            ? current.filter((l) => l !== label)
            : [...current, label]
        saveChange({ enabled_labels: next })
    }

    function addVip() {
        if (!preferences || !vipInput.trim()) return
        const current = preferences.vip_senders || []
        if (current.includes(vipInput.trim())) {
            setVipInput("")
            return
        }
        const next = [...current, vipInput.trim()]
        saveChange({ vip_senders: next })
        setVipInput("")
    }

    function removeVip(email: string) {
        if (!preferences) return
        const next = (preferences.vip_senders || []).filter((e) => e !== email)
        saveChange({ vip_senders: next })
    }

    function addDomain() {
        if (!preferences || !domainInput.trim()) return
        const current = preferences.internal_domains || []
        if (current.includes(domainInput.trim())) {
            setDomainInput("")
            return
        }
        const next = [...current, domainInput.trim()]
        saveChange({ internal_domains: next })
        setDomainInput("")
    }

    function removeDomain(domain: string) {
        if (!preferences) return
        const next = (preferences.internal_domains || []).filter((d) => d !== domain)
        saveChange({ internal_domains: next })
    }

    if (loading) {
        return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-zinc-400" /></div>
    }

    if (!preferences) {
        return <div className="p-4 text-red-500">Error loading settings.</div>
    }

    return (
        <div className="space-y-8 max-w-2xl">
            <div>
                <h2 className="text-xl font-bold tracking-tight">Active Rules & Filters</h2>
                <p className="text-sm text-zinc-500 mt-1">Configure how Aaliyah sees your inbox.</p>
            </div>

            {/* Auto-Label Toggle */}
            <ToggleCard
                title="Auto-Labeling"
                description="Automatically apply labels based on rules, sender, and content analysis."
                checked={preferences.auto_label_enabled}
                onCheckedChange={(checked) => saveChange({ auto_label_enabled: checked })}
            />

            {/* Sync Interval */}
            <div className="space-y-3 rounded-lg border p-4">
                <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Sync Frequency</label>
                    <span className="text-sm text-zinc-500">{preferences.auto_sync_interval_seconds}s</span>
                </div>
                <Slider
                    min={60}
                    max={900} // 15 min
                    step={30}
                    value={preferences.auto_sync_interval_seconds || 120}
                    onChange={(e) => saveChange({ auto_sync_interval_seconds: parseInt(e.target.value) })}
                    labelStart="1 min"
                    labelEnd="15 min"
                />
                <p className="text-xs text-zinc-400">Lower interval = faster response, higher API usage.</p>
            </div>

            {/* Enabled Labels */}
            <div className="space-y-3">
                <label className="text-sm font-medium">Active Labels</label>
                <div className="flex flex-wrap gap-2">
                    {ALLOWED_LABELS.map((label) => {
                        const isEnabled = (preferences.enabled_labels || []).includes(label)
                        return (
                            <Chip
                                key={label}
                                variant={isEnabled ? "filled" : "outline"}
                                color={isEnabled ? "violet" : "default"}
                                onClick={() => toggleLabel(label)}
                                aria-label={`Toggle label ${label}`}
                                aria-pressed={isEnabled}
                                className="cursor-pointer"
                            >
                                {label}
                            </Chip>
                        )
                    })}
                </div>
            </div>

            {/* VIP Senders */}
            <div className="space-y-3">
                <label className="text-sm font-medium">VIP Senders</label>
                <div className="flex gap-2">
                    <Input
                        placeholder="ceo@company.com"
                        value={vipInput}
                        onChange={(e) => setVipInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addVip()}
                        aria-label="VIP sender email"
                    />
                    <Button size="sm" onClick={addVip} disabled={!vipInput} aria-label="Add VIP sender"><Plus className="h-4 w-4" /></Button>
                </div>
                <div className="flex flex-wrap gap-2">
                    {(preferences.vip_senders || []).map((email) => (
                        <div key={email} className="flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 border border-amber-200">
                            {email}
                            <button
                                onClick={() => removeVip(email)}
                                aria-label={`Remove VIP ${email}`}
                                className="ml-1 hover:text-amber-900"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </div>
                    ))}
                    {(preferences.vip_senders || []).length === 0 && <span className="text-xs text-zinc-400 italic">No VIPs configured.</span>}
                </div>
            </div>

            {/* Internal Domains */}
            <div className="space-y-3">
                <label className="text-sm font-medium">Internal Domains (Auto-FYI)</label>
                <div className="flex gap-2">
                    <Input
                        placeholder="example.com"
                        value={domainInput}
                        onChange={(e) => setDomainInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addDomain()}
                        aria-label="Internal domain name"
                    />
                    <Button size="sm" onClick={addDomain} disabled={!domainInput} aria-label="Add internal domain"><Plus className="h-4 w-4" /></Button>
                </div>
                <div className="flex flex-wrap gap-2">
                    {(preferences.internal_domains || []).map((domain) => (
                        <div key={domain} className="flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 border border-blue-200">
                            {domain}
                            <button
                                onClick={() => removeDomain(domain)}
                                aria-label={`Remove internal domain ${domain}`}
                                className="ml-1 hover:text-blue-900"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {saving && <p className="text-xs text-zinc-400 animate-pulse">Saving changes...</p>}
            {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
    )
}
