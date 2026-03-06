import React from "react"
import { ActiveDocument } from "@/lib/aaliyah/viewerStore"
import { Send } from "lucide-react"

export function PdfViewer({ document }: { document: ActiveDocument }) {
    return (
        <div className="flex flex-col h-full bg-white dark:bg-zinc-950 relative">
            <div className="flex-1 overflow-hidden">
                <iframe
                    src={document.url}
                    className="w-full h-full border-none"
                    title={document.name}
                />
            </div>

            {/* AI Overlay Input Bar */}
            <div className="shrink-0 p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 shadow-[0_-4px_24px_rgba(0,0,0,0.02)]">
                <div className="relative max-w-2xl mx-auto">
                    <input
                        type="text"
                        placeholder={`Ask Aaliyah about ${document.name}...`}
                        className="w-full h-12 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-5 pr-12 text-[14px] text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                    />
                    <button aria-label="Submit document question" className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg text-white bg-black dark:bg-white dark:text-black hover:scale-105 active:scale-95 transition-all shadow-md">
                        <Send className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    )
}
