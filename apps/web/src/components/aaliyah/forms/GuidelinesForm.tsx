
"use client"

import * as React from "react"
import { Save, Sparkles, Shield, Loader2 } from "lucide-react"
import { getAaliyahSettings, updateAaliyahSettings, AaliyahSettings } from "@/lib/aaliyah/api"
import { cn } from "@/lib/utils"

export default function GuidelinesForm() {
    const [loading, setLoading] = React.useState(true)
    const [saving, setSaving] = React.useState(false)
    const [settings, setSettings] = React.useState<AaliyahSettings | null>(null)
    const [message, setMessage] = React.useState("")

    React.useEffect(() => {
        getAaliyahSettings()
            .then(data => {
                setSettings(data)
                setLoading(false)
            })
            .catch(err => {
                console.error(err)
                setLoading(false)
            })
    }, [])

    const handleSave = async () => {
        if (!settings) return
        setSaving(true)
        setMessage("")
        try {
            await updateAaliyahSettings(settings)
            setMessage("Settings saved successfully.")
        } catch (err) {
            console.error(err)
            setMessage("Failed to save settings.")
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return <div className="p-8 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-zinc-400" /></div>
    }

    if (!settings) return null

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-8">
            {/* Header */}
            <div className="flex justify-between items-center border-b border-zinc-200 pb-6">
                <div>
                    <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight">Guidelines</h1>
                    <p className="text-zinc-500 font-medium">Define Aaliyah's personality and boundaries.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center gap-2 bg-zinc-900 text-white px-5 py-2.5 rounded-full text-sm font-bold hover:bg-zinc-800 transition-colors disabled:opacity-50"
                >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save Changes
                </button>
            </div>

            {message && (
                <div className={cn("px-4 py-3 rounded-xl text-sm font-semibold", message.includes("Failed") ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600")}>
                    {message}
                </div>
            )}

            <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
                {/* Sidebar */}
                <div className="space-y-1">
                    <button className="w-full text-left px-4 py-2 rounded-lg text-sm font-bold bg-zinc-100 text-zinc-900 flex items-center gap-3">
                        <Sparkles className="h-4 w-4" />
                        Communication
                    </button>
                    {/* Add more tabs if needed later */}
                </div>

                {/* Form */}
                <div className="space-y-6">
                    {/* Tone */}
                    <div className="rounded-2xl border border-zinc-200 bg-white p-6">
                        <h3 className="text-lg font-bold text-zinc-900 mb-1">Communication Tone</h3>
                        <p className="text-sm text-zinc-500 mb-4">How should Aaliyah sound in drafts?</p>

                        <div className="flex flex-wrap gap-3">
                            {["Professional", "Direct", "Friendly", "Casual"].map(tone => (
                                <button
                                    key={tone}
                                    onClick={() => setSettings({ ...settings, draft_tone: tone.toLowerCase() })}
                                    className={cn(
                                        "px-4 py-2 rounded-xl text-sm font-bold border transition-all",
                                        settings.draft_tone === tone.toLowerCase()
                                            ? "border-zinc-900 bg-zinc-900 text-white"
                                            : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300"
                                    )}
                                >
                                    {tone}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Signature */}
                    <div className="rounded-2xl border border-zinc-200 bg-white p-6">
                        <h3 className="text-lg font-bold text-zinc-900 mb-1">Signature</h3>
                        <p className="text-sm text-zinc-500 mb-4">Appended to every draft.</p>
                        <textarea
                            value={settings.signature || ""}
                            onChange={(e) => setSettings({ ...settings, signature: e.target.value })}
                            placeholder="Best,\n[Your Name]"
                            className="w-full h-32 p-3 rounded-xl border border-zinc-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-zinc-900/10 resize-none"
                        />
                    </div>

                    {/* Autonomy */}
                    <div className="rounded-2xl border border-zinc-200 bg-white p-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-zinc-900 mb-1">Auto-Send (Experimental)</h3>
                                <p className="text-sm text-zinc-500 max-w-sm">
                                    If enabled, Aaliyah will send emails without your review if she is highly confident.
                                </p>
                            </div>
                            <button
                                onClick={() => setSettings({ ...settings, auto_send_enabled: !settings.auto_send_enabled })}
                                className={cn(
                                    "relative inline-flex h-7 w-12 items-center rounded-full transition-colors",
                                    settings.auto_send_enabled ? "bg-emerald-500" : "bg-zinc-200"
                                )}
                            >
                                <span
                                    className={cn(
                                        "inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-sm",
                                        settings.auto_send_enabled ? "translate-x-6" : "translate-x-1"
                                    )}
                                />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
