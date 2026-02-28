"use client"

import * as React from "react"
import { X, Send, Users, ChevronDown, ChevronUp } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { useSystemStore } from "@/lib/aaliyah/store"
import { EmailEditor } from "./EmailEditor"
import { composeEmail } from "@/lib/aaliyah/api"
import { toast } from "react-hot-toast"

export function ComposeModal() {
    const { isComposeOpen, composeData, closeCompose, addLog } = useSystemStore()
    const [to, setTo] = React.useState("")
    const [cc, setCc] = React.useState("")
    const [bcc, setBcc] = React.useState("")
    const [subject, setSubject] = React.useState("")
    const [body, setBody] = React.useState("")
    const [isCcBccOpen, setIsCcBccOpen] = React.useState(false)
    const [isSending, setIsSending] = React.useState(false)

    React.useEffect(() => {
        if (composeData) {
            setTo(composeData.to || "")
            setCc(composeData.cc || "")
            setBcc(composeData.bcc || "")
            setSubject(composeData.subject || "")
            setBody(composeData.body || "")
        }
    }, [composeData])

    if (!isComposeOpen) return null

    const handleSend = async () => {
        if (!to.trim()) {
            toast.error("Please provide at least one recipient.")
            return
        }
        if (!subject.trim()) {
            toast.error("Subject is required.")
            return
        }

        setIsSending(true)
        try {
            await composeEmail({
                to: to.split(",").map(e => e.trim()).filter(Boolean),
                cc: cc ? cc.split(",").map(e => e.trim()).filter(Boolean) : undefined,
                bcc: bcc ? bcc.split(",").map(e => e.trim()).filter(Boolean) : undefined,
                subject,
                body
            })
            toast.success("Email sent successfully!")
            addLog("Email Sent", `Sent email to ${to}: ${subject}`)
            closeCompose()
        } catch (err: any) {
            console.error("Failed to send email", err)
            toast.error(err.message || "Failed to send email")
        } finally {
            setIsSending(false)
        }
    }

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 pointer-events-none">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={closeCompose}
                    className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto"
                />
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-2xl bg-surface border border-borderSubtle rounded-3xl shadow-2xl overflow-hidden flex flex-col pointer-events-auto max-h-[90vh]"
                >
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-borderSubtle flex items-center justify-between bg-zinc-50/50">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-xl bg-indigo-100 flex items-center justify-center">
                                <Send className="h-4 w-4 text-indigo-600" />
                            </div>
                            <h2 className="text-[15px] font-bold text-textPrimary tracking-tight">New Message</h2>
                        </div>
                        <button
                            onClick={closeCompose}
                            className="h-8 w-8 rounded-full hover:bg-zinc-100 flex items-center justify-center text-textMuted transition-colors"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    {/* Form */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                        {/* To Field */}
                        <div className="flex items-start gap-4">
                            <div className="w-16 pt-2 text-[13px] font-medium text-textMuted">To</div>
                            <div className="flex-1 flex items-center gap-2 group">
                                <input
                                    type="text"
                                    value={to}
                                    onChange={(e) => setTo(e.target.value)}
                                    placeholder="recipients@example.com"
                                    className="flex-1 bg-transparent border-b border-transparent focus:border-indigo-500 py-1.5 text-[14px] outline-none transition-colors"
                                />
                                <button
                                    onClick={() => setIsCcBccOpen(!isCcBccOpen)}
                                    className="text-[11px] font-medium text-indigo-600 hover:text-indigo-700 hover:underline px-2 py-1 rounded-md hover:bg-indigo-50 transition-all flex items-center gap-1"
                                >
                                    <Users className="h-3 w-3" />
                                    CC/BCC
                                    {isCcBccOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                </button>
                            </div>
                        </div>

                        {/* CC/BCC Fields (Collapsible) */}
                        <AnimatePresence>
                            {isCcBccOpen && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden space-y-4"
                                >
                                    <div className="flex items-start gap-4">
                                        <div className="w-16 pt-2 text-[13px] font-medium text-textMuted">CC</div>
                                        <input
                                            type="text"
                                            value={cc}
                                            onChange={(e) => setCc(e.target.value)}
                                            placeholder="carbon-copy@example.com"
                                            className="flex-1 bg-transparent border-b border-transparent focus:border-indigo-500 py-1.5 text-[14px] outline-none transition-colors"
                                        />
                                    </div>
                                    <div className="flex items-start gap-4">
                                        <div className="w-16 pt-2 text-[13px] font-medium text-textMuted">BCC</div>
                                        <input
                                            type="text"
                                            value={bcc}
                                            onChange={(e) => setBcc(e.target.value)}
                                            placeholder="blind-copy@example.com"
                                            className="flex-1 bg-transparent border-b border-transparent focus:border-indigo-500 py-1.5 text-[14px] outline-none transition-colors"
                                        />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="h-px bg-borderSubtle my-2" />

                        {/* Subject Field */}
                        <div className="flex items-start gap-4">
                            <div className="w-16 pt-2 text-[13px] font-medium text-textMuted">Subject</div>
                            <input
                                type="text"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                placeholder="Subject"
                                className="flex-1 bg-transparent py-1.5 text-[14px] font-semibold text-textPrimary outline-none"
                            />
                        </div>

                        <div className="h-px bg-borderSubtle my-2" />

                        {/* Body Editor */}
                        <div className="min-h-[300px]">
                            <EmailEditor
                                content={body}
                                onChange={setBody}
                                placeholder="Start typing your email here..."
                            />
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 border-t border-borderSubtle bg-zinc-50/50 flex items-center justify-between">
                        <div className="text-[11px] text-textMuted flex items-center gap-1.5">
                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Your signature will be added automatically
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={closeCompose}
                                className="px-4 py-2 text-[13px] font-medium text-textSecondary hover:text-textPrimary hover:bg-zinc-100 rounded-xl transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSend}
                                disabled={isSending}
                                className={cn(
                                    "px-6 py-2 rounded-xl text-[13px] font-bold flex items-center gap-2 transition-all shadow-sm",
                                    isSending
                                        ? "bg-zinc-100 text-zinc-400 cursor-not-allowed"
                                        : "bg-textPrimary text-surface hover:bg-black hover:scale-[1.02] active:scale-100"
                                )}
                            >
                                {isSending ? (
                                    <div className="h-3.5 w-3.5 border-2 border-zinc-300 border-t-zinc-500 rounded-full animate-spin" />
                                ) : (
                                    <Send className="h-3.5 w-3.5" />
                                )}
                                {isSending ? "Sending..." : "Send Message"}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    )
}
