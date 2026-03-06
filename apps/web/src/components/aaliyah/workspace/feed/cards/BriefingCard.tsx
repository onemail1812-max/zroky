"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import { Sun } from "lucide-react";
import toast from "react-hot-toast";
import { useSystemStore } from "@/lib/aaliyah/store";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

interface BriefingCardProps {
    payload: {
        id: string;
        message: string;
        stats: {
            unread: number;
            priority: number;
        };
        actions?: Array<{
            label: string;
            value: string;
        }>;
    };
}

export const BriefingCard = React.memo(function BriefingCard({ payload }: BriefingCardProps) {
    const { message, stats, actions } = payload;
    const [isActionLoading, setIsActionLoading] = React.useState(false);
    const { isFullyConnected } = useOnlineStatus();

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
        <div className="w-full max-w-2xl mx-auto bg-gradient-to-br from-zinc-900 to-zinc-800 text-white rounded-2xl overflow-hidden shadow-xl animate-in fade-in zoom-in-95 duration-700">
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Sun className="h-4 w-4 text-amber-400" />
                    <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">Morning Briefing</span>
                </div>
                <div className="text-[10px] font-medium text-zinc-500">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</div>
            </div>
            <div className="p-5">
                <div className="prose prose-invert prose-sm mb-6">
                    <ReactMarkdown>{message}</ReactMarkdown>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                        <div className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Unread</div>
                        <div className="text-xl font-bold">{stats.unread}</div>
                    </div>
                    <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                        <div className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Priority</div>
                        <div className="text-xl font-bold text-amber-400">{stats.priority}</div>
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    {actions?.map((action: any, i: number) => (
                        <button
                            key={i}
                            disabled={isActionLoading || !isFullyConnected}
                            onClick={() => handleActionClick(action)}
                            className="w-full h-10 bg-white text-black rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-zinc-200 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isActionLoading ? "Processing..." : !isFullyConnected ? "Offline" : action.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
});
