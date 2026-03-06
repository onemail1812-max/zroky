"use client";

import React from "react";
import { Calendar, Info } from "lucide-react";

interface HistoryNodeProps {
    payload: {
        date?: string;
        summary?: string;
    };
}

export const HistoryNode = React.memo(function HistoryNode({ payload }: HistoryNodeProps) {
    const [isExpanded, setIsExpanded] = React.useState(false);
    return (
        <div className="w-full py-4 flex flex-col items-center">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-full text-[11px] font-bold text-zinc-500 hover:bg-zinc-100 transition-all shadow-sm"
            >
                <Calendar className="h-3 w-3" />
                {payload.date || "Past Context Block"}
                <div className="h-3 w-[1px] bg-zinc-300 mx-1" />
                <span className="text-zinc-400 font-medium">{isExpanded ? "Collapse" : "View Summary"}</span>
            </button>

            {isExpanded && (
                <div className="mt-3 w-full p-4 bg-white border border-zinc-100 rounded-2xl shadow-sm animate-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center gap-2 mb-3">
                        <Info className="h-3.5 w-3.5 text-zinc-400" />
                        <span className="text-[11px] font-bold text-zinc-800 uppercase tracking-tight">Semantic Memory Node</span>
                    </div>
                    <p className="text-xs text-zinc-600 leading-relaxed italic">
                        {payload.summary || "No summary available for this historical period."}
                    </p>
                </div>
            )}
        </div>
    );
});
