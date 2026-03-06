"use client";

import React from "react";
import { Check } from "lucide-react";
import toast from "react-hot-toast";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

interface ComposeActionCardProps {
    payload: {
        to?: string;
        subject?: string;
        body?: string;
    };
}

export const ComposeActionCard = React.memo(function ComposeActionCard({ payload }: ComposeActionCardProps) {
    const [to, setTo] = React.useState(payload.to || "");
    const [subject, setSubject] = React.useState(payload.subject || "");
    const [body, setBody] = React.useState(payload.body || "");
    const [isSending, setIsSending] = React.useState(false);
    const [isSent, setIsSent] = React.useState(false);
    const { isFullyConnected } = useOnlineStatus();

    const handleSend = async () => {
        if (!isFullyConnected) return;
        setIsSending(true);
        try {
            const { composeEmail } = await import("@/lib/aaliyah/api");
            const result = await composeEmail({
                to: to.split(",").map((s: string) => s.trim()).filter(Boolean),
                cc: [],
                bcc: [],
                subject,
                body,
            });
            if (result) {
                setIsSent(true);
                toast.success("Email sent successfully.");
            }
        } catch (e) {
            console.error(e);
            toast.error("Failed to send email.");
        } finally {
            setIsSending(false);
        }
    };

    if (isSent) {
        return (
            <div className="w-full bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3 animate-in fade-in zoom-in-95">
                <div className="h-8 w-8 bg-emerald-100 rounded-full flex items-center justify-center">
                    <Check className="h-4 w-4 text-emerald-600" />
                </div>
                <div>
                    <h4 className="text-sm font-bold text-emerald-900">Email sent successfully</h4>
                    <p className="text-xs text-emerald-700">To: {to}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-2xl mx-auto bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm animate-in fade-in zoom-in-95 duration-500 mt-2">
            <div className="px-4 py-3 bg-zinc-50 border-b border-zinc-100 flex items-center gap-2">
                <img src="/employees/aaliyah.png" alt="Aaliyah" className="h-4 w-4 rounded-full object-cover" />
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Draft Ready for Review</span>
            </div>

            <div className="p-4 space-y-3">
                <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 block">To</label>
                    <input
                        type="text"
                        value={to}
                        onChange={(e) => setTo(e.target.value)}
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        placeholder="Recipient emails (comma separated)"
                    />
                </div>
                <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 block">Subject</label>
                    <input
                        type="text"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                </div>
                <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 block">Message</label>
                    <textarea
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        rows={6}
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-800 leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none custom-scrollbar"
                    />
                </div>

                <div className="flex items-center gap-2 pt-2">
                    <button
                        onClick={handleSend}
                        disabled={isSending || !to || !isFullyConnected}
                        className="flex-1 h-9 bg-zinc-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-zinc-800 transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSending ? (
                            <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Check className="h-3.5 w-3.5" />
                        )}
                        {isSending ? "Sending..." : !isFullyConnected ? "Offline" : "Approve & Send"}
                    </button>
                </div>
            </div>
        </div>
    );
});
