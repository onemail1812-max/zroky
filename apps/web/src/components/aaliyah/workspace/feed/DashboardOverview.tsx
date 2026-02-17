import * as React from "react"
import { AlertOctagon, CheckCircle2, Calendar, Clock } from "lucide-react"

export function DashboardOverview({ counts, onNavigate }: any) {
    return (
        <div className="p-12 flex flex-col h-full bg-white">
            <div className="max-w-4xl mx-auto w-full py-12">
                <div className="mb-12">
                    <h1 className="text-4xl font-bold text-black tracking-tight mb-2">Good Private Morning.</h1>
                    <p className="text-sm font-medium text-zinc-400 uppercase tracking-[0.2em]">Wednesday, February 18, 2024</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                    <button onClick={() => onNavigate('priority')} className="bg-white p-8 rounded-3xl border border-zinc-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.06)] transition-all text-left flex flex-col justify-between group h-48">
                        <div className="h-10 w-10 bg-red-50 rounded-2xl flex items-center justify-center group-hover:bg-red-500 transition-colors">
                            <AlertOctagon className="h-5 w-5 text-red-500 group-hover:text-white transition-colors" />
                        </div>
                        <div>
                            <span className="text-4xl font-bold text-black block mb-1">{counts.priority || 0}</span>
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest group-hover:text-black transition-colors">Urgent / Priority</span>
                        </div>
                    </button>

                    <button onClick={() => onNavigate('approvals')} className="bg-white p-8 rounded-3xl border border-zinc-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.06)] transition-all text-left flex flex-col justify-between group h-48">
                        <div className="h-10 w-10 bg-amber-50 rounded-2xl flex items-center justify-center group-hover:bg-amber-500 transition-colors">
                            <CheckCircle2 className="h-5 w-5 text-amber-500 group-hover:text-white transition-colors" />
                        </div>
                        <div>
                            <span className="text-4xl font-bold text-black block mb-1">{counts.approvals || 0}</span>
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest group-hover:text-black transition-colors">Pending Approval</span>
                        </div>
                    </button>

                    <div className="bg-white p-8 rounded-3xl border border-zinc-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)] flex flex-col justify-between h-48 border-dashed border-zinc-200">
                        <div className="h-10 w-10 bg-zinc-50 rounded-2xl flex items-center justify-center">
                            <Calendar className="h-5 w-5 text-zinc-400" />
                        </div>
                        <div>
                            <span className="text-xs font-bold text-black block mb-1">Product Sync</span>
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Next Meeting • 11:30 AM</span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-6">
                    <h3 className="text-[10px] font-bold text-zinc-300 uppercase tracking-[0.3em] mb-2 px-1">Action Items</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button onClick={() => onNavigate('priority')} className="bg-black text-white p-6 rounded-2xl flex items-center justify-between hover:bg-zinc-800 transition-all group">
                            <span className="text-xs font-bold uppercase tracking-widest">Review Priority</span>
                            <AlertOctagon className="h-4 w-4 text-white/50 group-hover:text-white transition-colors" />
                        </button>
                        <button onClick={() => onNavigate('approvals')} className="bg-white text-black border border-zinc-100 p-6 rounded-2xl flex items-center justify-between hover:bg-zinc-50 transition-all group shadow-sm">
                            <span className="text-xs font-bold uppercase tracking-widest">Review Approvals</span>
                            <CheckCircle2 className="h-4 w-4 text-zinc-300 group-hover:text-black transition-colors" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
