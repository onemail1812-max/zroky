"use client";

import React from "react";
import { Mail, ChevronDown, ChevronUp, Check, Edit3, ArrowRight, AlertCircle, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { useSystemStore } from "@/lib/aaliyah/store";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

interface EmailActionCardProps {
    payload: {
        id: string;
        subject?: string;
        sender?: string;
        snippet?: string;
        priority?: string;
        draft?: {
            id: string;
            body: string;
            status?: 'pending' | 'ready' | 'sent' | 'failed';
        };
        actions?: Array<{
            label: string;
            value: string;
        }>;
        thread_id?: string;
        email_id?: string;
    };
}

export const EmailActionCard = React.memo(function EmailActionCard({ payload }: EmailActionCardProps) {
    const { subject, sender, snippet, draft } = payload;
    const [isExpanded, setIsExpanded] = React.useState(false);
    const [isActionLoading, setIsActionLoading] = React.useState(false);
    const { isFullyConnected } = useOnlineStatus();

    const handleApproveDraft = async () => {
        if (!isFullyConnected) return;
        setIsActionLoading(true);
        try {
            const { inboxService } = await import("@/services/inbox.service");
            await inboxService.sendDraft(payload.id);
            toast.success("Draft approved and sent successfully.");
            useSystemStore.getState().addNotification("Draft approved and sent successfully.", "success");
        } catch (e) {
            console.error(e);
            toast.error("Failed to send draft.");
            useSystemStore.getState().addNotification("Failed to send draft.", "error");
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleRetryDraft = async () => {
        if (!isFullyConnected) return;
        setIsActionLoading(true);
        try {
            const { inboxService } = await import("@/services/inbox.service");
            await inboxService.syncInbox();
            toast.success("Re-triggering draft generation...");
        } catch (e) {
            console.error(e);
            toast.error("Failed to retry drafting.");
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleActionClick = async (act: any) => {
        if (!isFullyConnected) return;
        setIsActionLoading(true);
        try {
            const { assistApi } = await import("@/lib/aaliyah/api");
            await assistApi.post("/actions/execute", {
                item_id: payload.id,
                action: act,
            });
            toast.success(`Action '${act.label}' executed successfully.`);
            useSystemStore.getState().addNotification(`Action '${act.label}' executed successfully.`, "success");
        } catch (e) {
            console.error(e);
            toast.error(`Failed to execute action '${act.label}'.`);
            useSystemStore.getState().addNotification(`Failed to execute action '${act.label}'.`, "error");
        } finally {
            setIsActionLoading(false);
        }
    };

    return (
        <div className="w-full max-w-2xl mx-auto bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm animate-in fade-in zoom-in-95 duration-500">
            {/* Header: Email Origin */}
            <div className="px-4 py-3 bg-zinc-50 border-b border-zinc-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-lg bg-white border border-zinc-200 flex items-center justify-center">
                        <Mail className="h-3.5 w-3.5 text-zinc-500" aria-hidden="true" />
                    </div>
                    <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Email Activity</span>
                </div>
                <div className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-bold">
                    {payload.priority || "Action Required"}
                </div>
            </div>

            <div className="p-4">
                {/* Summary Info */}
                <div className="mb-4">
                    <h4 className="text-sm font-bold text-zinc-900 mb-0.5 truncate">{subject || "No Subject"}</h4>
                    <p className="text-xs text-zinc-500 truncate">From: {sender}</p>
                </div>

                {/* Collapsible Full View */}
                <div className="mb-4">
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        aria-expanded={isExpanded}
                        className="flex items-center gap-1.5 text-[11px] font-bold text-zinc-900 hover:text-zinc-600 transition-colors uppercase tracking-tight"
                    >
                        {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        {isExpanded ? "Hide Full Email" : "View Full Email"}
                    </button>
                    {isExpanded && (
                        <div className="mt-3 p-3 bg-zinc-50 rounded-xl border border-zinc-100 text-xs text-zinc-600 leading-relaxed max-h-[200px] overflow-y-auto custom-scrollbar animate-in slide-in-from-top-2 duration-300">
                            {snippet || "No content summary available."}
                        </div>
                    )}
                </div>

                {/* Aaliyah's Draft Section */}
                {draft && draft.status === 'pending' && (
                    <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 mb-4 animate-pulse">
                        <div className="flex items-center gap-1.5 mb-2">
                            <Loader2 className="h-3.5 w-3.5 text-zinc-400 animate-spin" />
                            <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-tight">Aaliyah is drafting...</span>
                        </div>
                        <div className="h-3 w-3/4 bg-zinc-200 rounded mb-2"></div>
                        <div className="h-3 w-1/2 bg-zinc-200 rounded"></div>
                    </div>
                )}

                {draft && draft.status === 'failed' && (
                    <div className="p-3 bg-red-50 rounded-xl border border-red-100 mb-4">
                        <div className="flex items-center gap-1.5 mb-2">
                            <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                            <span className="text-[11px] font-bold text-red-600 uppercase tracking-tight">Drafting Failed</span>
                        </div>
                        <p className="text-xs text-red-500 mb-3">
                            Aaliyah encountered an error while drafting this reply.
                        </p>
                        <button
                            onClick={handleRetryDraft}
                            className="text-[10px] font-bold text-red-700 bg-red-100 px-2 py-1 rounded-lg hover:bg-red-200 transition-colors"
                        >
                            RETRY DRAFTING
                        </button>
                    </div>
                )}

                {draft && (draft.status === 'ready' || !draft.status) && (
                    <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100/50 mb-4">
                        <div className="flex items-center gap-1.5 mb-2">
                            <img src="/employees/aaliyah.png" alt="Aaliyah" className="h-3.5 w-3.5 rounded-full object-cover" />
                            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-tight">AI Suggested Draft</span>
                        </div>
                        <p className="text-xs text-zinc-700 leading-relaxed font-medium">
                            {draft.body}
                        </p>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-2">
                    {draft && (draft.status === 'ready' || !draft.status) ? (
                        <>
                            <button
                                onClick={handleApproveDraft}
                                disabled={isActionLoading || !isFullyConnected}
                                className="flex-1 h-9 bg-zinc-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-zinc-800 transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Check className="h-3.5 w-3.5" />
                                {isActionLoading ? "Processing..." : !isFullyConnected ? "Offline" : "Approve & Send"}
                            </button>
                            <button
                                onClick={() => {
                                    if (!isFullyConnected) return;
                                    useSystemStore.getState().openCompose({
                                        to: sender,
                                        subject: subject,
                                        body: draft.body,
                                        threadId: payload.thread_id || payload.email_id
                                    });
                                }}
                                disabled={!isFullyConnected}
                                className="h-9 w-9 bg-white border border-zinc-200 rounded-xl flex items-center justify-center text-zinc-600 hover:bg-zinc-50 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                title={!isFullyConnected ? "Offline" : "Edit Draft"}
                                aria-label="Edit Draft"
                            >
                                <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                            <button
                                onClick={() => {
                                    if (!isFullyConnected) return;
                                    useSystemStore.getState().openCompose({
                                        to: "",
                                        subject: `Fwd: ${subject}`,
                                        body: `\n\n--- Forwarded message ---\nFrom: ${sender}\nSubject: ${subject}\n\n${snippet}`,
                                        threadId: payload.thread_id || payload.email_id
                                    });
                                }}
                                disabled={!isFullyConnected}
                                className="h-9 w-9 bg-white border border-zinc-200 rounded-xl flex items-center justify-center text-zinc-600 hover:bg-zinc-50 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                title={!isFullyConnected ? "Offline" : "Forward Email"}
                                aria-label="Forward Email"
                            >
                                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                        </>
                    ) : payload.actions && payload.actions.length > 0 ? (
                        payload.actions.map((act: any, i: number) => (
                            <button
                                key={i}
                                onClick={() => handleActionClick(act)}
                                disabled={isActionLoading || !isFullyConnected}
                                className="flex-1 h-9 bg-white border border-zinc-200 text-zinc-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-zinc-50 transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {!isFullyConnected ? "Offline" : act.label}
                            </button>
                        ))
                    ) : null}
                </div>
            </div>
        </div>
    );
});
