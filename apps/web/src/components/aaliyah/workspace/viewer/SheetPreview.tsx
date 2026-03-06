import React from "react"
import { ActiveDocument } from "@/lib/aaliyah/viewerStore"
import { Send, Sigma } from "lucide-react"

export function SheetPreview({ document }: { document: ActiveDocument }) {
    // A simple structured grid for mock Excel data
    return (
        <div className="flex flex-col h-full bg-white dark:bg-zinc-950 relative">
            <div className="flex-1 overflow-auto p-4 bg-zinc-50 dark:bg-zinc-950/50">
                <div className="h-full flex flex-col items-center justify-center p-8 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl">
                    <Sigma className="h-10 w-10 text-emerald-500 mb-4 opacity-50" />
                    <p className="font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Spreadsheet Visualizer</p>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium max-w-sm">
                        The document {document.name} has been parsed. Advanced Grid View is currently disabled in this environment. Try asking Aaliyah to extract metrics.
                    </p>
                </div>
            </div>

            {/* AI Overlay Input Bar */}
            <div className="shrink-0 p-4 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-[0_-4px_24px_rgba(0,0,0,0.03)]">
                <div className="relative max-w-2xl mx-auto flex gap-2">
                    <div className="relative flex-1">
                        <input type="text" placeholder={`Instant Math: Ask Aaliyah to analyze ${document.name}...`} className="w-full h-12 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-5 pr-12 text-[14px] text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-inner" />
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-2 py-1 bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-lg text-[10px] font-bold uppercase tracking-widest hidden sm:flex pointer-events-none">
                            <Sigma className="h-3 w-3" /> Math
                        </div>
                        {/* Note: In a real implementation we'd shift padding-left dynamically or use a different structure, but keeping it simple for now */}
                    </div>
                    <button aria-label="Submit analysis request" className="h-12 w-12 rounded-xl text-white bg-emerald-500 hover:bg-emerald-600 active:scale-95 transition-all shadow-md flex items-center justify-center shrink-0 border border-emerald-600/20">
                        <Send className="h-4 w-4 ml-0.5" />
                    </button>
                </div>
            </div>
        </div>
    )
}
