
import { cn } from "@/lib/utils"
import { Activity, Database, CheckCircle2, AlertCircle } from "lucide-react"

export function StatusPanel() {
    return (
        <aside className="w-72 border-l border-slate-200 bg-white flex flex-col h-screen fixed right-0 top-0 z-20 p-4">

            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
                System Status
            </h4>

            <div className="space-y-3">
                {/* Sync Status */}
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-sm font-medium text-slate-700">Gmail Sync</span>
                    </div>
                    <span className="text-xs text-slate-400">2m ago</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="h-2 w-2 bg-green-500 rounded-full" />
                        <span className="text-sm font-medium text-slate-700">Calendar</span>
                    </div>
                    <span className="text-xs text-slate-400">1m ago</span>
                </div>
            </div>

            <div className="mt-8">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
                    Active Context
                </h4>
                <div className="p-4 border border-slate-200 rounded-xl space-y-3 shadow-sm bg-white">
                    <div className="flex items-start gap-2">
                        <Activity className="h-4 w-4 text-blue-500 mt-0.5" />
                        <div>
                            <p className="text-sm font-medium text-slate-900">Processing</p>
                            <p className="text-xs text-slate-500">Classifying 1 new email...</p>
                        </div>
                    </div>
                    <div className="h-px bg-slate-100 w-full" />
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Database className="h-3 w-3" /> Using: Email History
                    </div>
                </div>
            </div>

        </aside>
    )
}
