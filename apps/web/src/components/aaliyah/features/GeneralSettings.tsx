"use client"

import * as React from "react"
import { Loader2, Save } from "lucide-react"
import { getAaliyahSettings, updateAaliyahSettings, AaliyahSettings } from "@/lib/aaliyah/api"
import { ToggleCard } from "@/components/aaliyah/ui/ToggleCard"
import { Input } from "@/components/aaliyah/ui/Input"
import { Button } from "@/components/aaliyah/ui/Button"

export function GeneralSettings() {
    const [loading, setLoading] = React.useState(true)
    const [settings, setSettings] = React.useState<AaliyahSettings | null>(null)
    const [saving, setSaving] = React.useState(false)
    const [error, setError] = React.useState<string | null>(null)

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
        const newSettings = { ...settings, ...patch }
        setSettings(newSettings) // Optimistic update
        setSaving(true)
        try {
            await updateAaliyahSettings(newSettings)
        } catch (err) {
            console.error(err)
            setError("Failed to save changes.")
            // Revert? (In complex apps, yes. Here, let's keep it simple)
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
        <div className="space-y-8 max-w-2xl">
            <div>
                <h2 className="text-xl font-bold tracking-tight">General Preferences</h2>
                <p className="text-sm text-zinc-500 mt-1">Configure Aaliyah's autonomy and personality.</p>
            </div>

            {/* Auto-Send Toggle */}
            <ToggleCard
                title="Auto-Send Drafts"
                description="If enabled, Aaliyah will automatically send replies she is confident about without your approval. Use with caution."
                checked={settings.auto_send_enabled}
                onCheckedChange={(checked) => saveChange({ auto_send_enabled: checked })}
            />
            {settings.auto_send_enabled && (
                <div className="p-3 bg-amber-50 text-amber-800 text-sm rounded border border-amber-200">
                    <strong>Warning:</strong> Aaliyah is now fully autonomous for replies. Monitoring is recommended.
                </div>
            )}

            {/* Draft Tone */}
            <div className="space-y-3">
                <label className="text-sm font-medium">Draft Tone</label>
                <select
                    className="w-full h-10 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-zinc-950 focus:ring-offset-2"
                    value={settings.draft_tone || "professional"}
                    onChange={(e) => saveChange({ draft_tone: e.target.value })}
                >
                    <option value="professional">Professional & Concise</option>
                    <option value="warm">Warm & Friendly</option>
                    <option value="direct">Direct & Assertive</option>
                </select>
                <p className="text-xs text-zinc-400">Controls the style of generated email drafts.</p>
            </div>

            {/* Signature */}
            <div className="space-y-3">
                <label className="text-sm font-medium">Email Signature</label>
                <textarea
                    className="flex min-h-[80px] w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Best,\nYour Name"
                    value={settings.signature || ""}
                    onChange={(e) => setSettings({ ...settings, signature: e.target.value })}
                    onBlur={(e) => saveChange({ signature: e.target.value })}
                />
                <p className="text-xs text-zinc-400">Appended to all auto-generated drafts.</p>
            </div>

            {saving && <p className="text-xs text-zinc-400 animate-pulse">Saving changes...</p>}
            {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
    )
}
