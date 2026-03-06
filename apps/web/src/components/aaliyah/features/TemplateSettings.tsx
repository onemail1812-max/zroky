"use client"

import * as React from "react"
import { Loader2, Plus, Trash2, FileText } from "lucide-react"
import { getTemplates, createTemplate, deleteTemplate, Template } from "@/lib/aaliyah/api"
import { Input } from "@/components/aaliyah/ui/Input"
import { Button } from "@/components/aaliyah/ui/Button"
import { cn } from "@/lib/utils"

export function TemplateSettings() {
    const [loading, setLoading] = React.useState(true)
    const [templates, setTemplates] = React.useState<Template[]>([])
    const [error, setError] = React.useState<string | null>(null)
    const [creating, setCreating] = React.useState(false)

    // Form state
    const [name, setName] = React.useState("")
    const [body, setBody] = React.useState("")
    const [subject, setSubject] = React.useState("")

    React.useEffect(() => {
        loadTemplates()
    }, [])

    async function loadTemplates() {
        try {
            setLoading(true)
            const data = await getTemplates()
            setTemplates(data.items || [])
        } catch (err) {
            console.error(err)
            setError("Failed to load templates.")
        } finally {
            setLoading(false)
        }
    }

    async function handleCreate() {
        if (!name || !body) return
        setCreating(true)
        try {
            const result = await createTemplate({ name, body, subject: subject || undefined })
            setTemplates((prev) => [...prev, {
                id: result.id,
                name: result.name,
                subject: subject || null,
                body,
                updated_at: new Date().toISOString()
            }])
            setName("")
            setBody("")
            setSubject("")
        } catch (err) {
            console.error(err)
            setError("Failed to create template.")
        } finally {
            setCreating(false)
        }
    }

    async function handleDelete(id: string) {
        if (!confirm("Delete this template?")) return
        try {
            await deleteTemplate(id)
            setTemplates((prev) => prev.filter((t) => t.id !== id))
        } catch (err) {
            console.error(err)
            setError("Failed to delete template.")
        }
    }

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-zinc-400" /></div>

    return (
        <div className="space-y-8 max-w-2xl">
            <div>
                <h2 className="text-xl font-bold tracking-tight">Draft Templates</h2>
                <p className="text-sm text-zinc-500 mt-1">Predefined email structures Aaliyah can use.</p>
            </div>

            {/* List */}
            <div className="space-y-4">
                {templates.map((t) => (
                    <div key={t.id} className="group flex flex-col gap-2 rounded-lg border p-4 bg-white/50 hover:bg-white transition-colors relative">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-violet-500" />
                                <span className="font-medium text-sm">{t.name}</span>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleDelete(t.id)}
                                aria-label={`Delete template ${t.name}`}
                            >
                                <Trash2 className="h-3 w-3" />
                            </Button>
                        </div>
                        {t.subject && <div className="text-xs font-semibold text-zinc-700">Sub: {t.subject}</div>}
                        <div className="text-xs text-zinc-500 whitespace-pre-wrap line-clamp-3 bg-zinc-50 p-2 rounded border border-zinc-100">
                            {t.body}
                        </div>
                    </div>
                ))}
                {templates.length === 0 && <p className="text-sm text-zinc-400 italic">No templates defined.</p>}
            </div>

            {/* Create Form */}
            <div className="space-y-4 pt-4 border-t border-dashed">
                <h3 className="text-sm font-medium">Add New Template</h3>
                <Input
                    placeholder="Template Name (e.g. Sales Rejection)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    aria-label="New template name"
                />
                <Input
                    placeholder="Default Subject (Optional)"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    aria-label="New template subject"
                />
                <textarea
                    className="flex min-h-[100px] w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Hi {{name}},&#10;&#10;Thanks for reaching out..."
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    aria-label="New template body"
                />
                <Button onClick={handleCreate} disabled={!name || !body || creating} className="w-full">
                    {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Template
                </Button>
                {error && <p className="text-xs text-red-500 text-center">{error}</p>}
            </div>
        </div>
    )
}
