"use client"

import * as React from "react"
import { GlobalRail } from "@/components/shell/GlobalRail"
import { InboxList, EmailThreadView } from "@/components/inbox"
import { inboxService, EmailMessage } from "@/services/inbox.service"
import { RefreshCw, Search, Inbox, AlertOctagon, MessageSquare, Newspaper, Calendar, CheckCircle2, Clock, Info, Sparkles, FileText, AlertCircle } from "lucide-react"

function NavItem({ id, label, count, active, onClick, icon: Icon }: any) {
    const isActive = active === id
    return (
        <button
            onClick={() => onClick(id)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive ? "bg-zinc-100 text-black" : "text-zinc-500 hover:bg-zinc-50 hover:text-black"
                }`}
        >
            <div className="flex items-center gap-3">
                <Icon className={`h-4 w-4 ${isActive ? "text-black" : "text-zinc-400"}`} />
                <span>{label}</span>
            </div>
            {count > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isActive ? "bg-black text-white" : "bg-zinc-100 text-zinc-600"
                    }`}>
                    {count}
                </span>
            )}
        </button>
    )
}

function DashboardOverview({ counts, onNavigate }: any) {
    return (
        <div className="p-12 flex flex-col h-full bg-zinc-50/20 overflow-y-auto">
            <div className="max-w-4xl mx-auto w-full py-12">
                <div className="mb-12">
                    <h1 className="text-4xl font-bold text-black tracking-tight mb-2">Good Morning, Chief.</h1>
                    <p className="text-sm font-medium text-zinc-400 uppercase tracking-[0.2em]">Wednesday, February 18, 2026</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                    <button onClick={() => onNavigate('priority')} className="bg-white p-8 rounded-3xl border border-zinc-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.06)] hover:border-black/5 transition-all text-left flex flex-col justify-between group h-48">
                        <div className="h-10 w-10 bg-red-50 rounded-2xl flex items-center justify-center group-hover:bg-red-500 transition-colors">
                            <AlertOctagon className="h-5 w-5 text-red-500 group-hover:text-white transition-colors" />
                        </div>
                        <div>
                            <span className="text-4xl font-bold text-black block mb-1">{counts.priority || 0}</span>
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest group-hover:text-black transition-colors">Urgent / Priority</span>
                        </div>
                    </button>

                    <button onClick={() => onNavigate('approvals')} className="bg-white p-8 rounded-3xl border border-zinc-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.06)] hover:border-black/5 transition-all text-left flex flex-col justify-between group h-48">
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
                        <button onClick={() => onNavigate('follow_ups')} className="bg-white text-black border border-zinc-100 p-6 rounded-2xl flex items-center justify-between hover:bg-zinc-50 transition-all group shadow-sm">
                            <span className="text-xs font-bold uppercase tracking-widest">Review Follow-ups</span>
                            <Clock className="h-4 w-4 text-zinc-300 group-hover:text-black transition-colors" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default function InboxPage() {
    const [selectedEmail, setSelectedEmail] = React.useState<EmailMessage | null>(null)
    const [refreshTrigger, setRefreshTrigger] = React.useState(0)
    const [activeTab, setActiveTab] = React.useState("today")
    const [counts, setCounts] = React.useState<Record<string, number>>({})
    const [providerStatus, setProviderStatus] = React.useState<Record<string, string>>({})

    // Initial Load & Polling
    React.useEffect(() => {
        const load = () => {
            inboxService.getCounts().then(setCounts).catch(console.error)
            inboxService.checkProviders().then(setProviderStatus).catch(console.error)
        }
        load()
        const interval = setInterval(load, 10000)
        return () => clearInterval(interval)
    }, [refreshTrigger])

    const handleRefresh = async () => {
        setRefreshTrigger(p => p + 1)
        await inboxService.syncInbox().catch(console.error)
        setRefreshTrigger(p => p + 1)
    }

    const hasError = Object.values(providerStatus).some(s => s !== 'active' && s !== 'ok')

    const handleListLoad = (first: EmailMessage | null) => {
        if (!selectedEmail && first && activeTab !== 'today') {
            setSelectedEmail(first)
        }
    }

    return (
        <div className="flex h-screen bg-white text-black font-sans selection:bg-black selection:text-white overflow-hidden">
            <GlobalRail />

            {/* A) Left Panel: Navigation & Live Numbers */}
            <div className="w-[240px] border-r border-zinc-100 flex flex-col bg-zinc-50/30 shrink-0">
                <div className="p-4 flex items-center justify-between">
                    <h1 className="text-lg font-bold tracking-tight">Inbox</h1>
                    <button onClick={handleRefresh} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
                        <RefreshCw className="h-4 w-4 text-zinc-400" />
                    </button>
                </div>

                {hasError && (
                    <div className="mx-4 mb-4 bg-red-50 border border-red-100 rounded-lg p-2 flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-red-600 text-[10px] font-bold uppercase tracking-wide">
                            <AlertCircle className="h-3 w-3" /> Connection Issue
                        </div>
                        <button className="text-[10px] text-red-500 hover:text-red-700 underline text-left">Reconnect</button>
                    </div>
                )}

                <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
                    <NavItem id="today" label="Today" count={0} active={activeTab} onClick={setActiveTab} icon={Calendar} />

                    <div className="pt-4 pb-2 px-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Focus</div>
                    <NavItem id="priority" label="Priority" count={counts.priority || 0} active={activeTab} onClick={setActiveTab} icon={AlertOctagon} />
                    <NavItem id="needs_reply" label="Needs Reply" count={counts.needs_reply || 0} active={activeTab} onClick={setActiveTab} icon={MessageSquare} />
                    <NavItem id="approvals" label="Approvals" count={counts.approvals || 0} active={activeTab} onClick={setActiveTab} icon={CheckCircle2} />
                    <NavItem id="follow_ups" label="Follow-ups" count={counts.follow_ups || 0} active={activeTab} onClick={setActiveTab} icon={Clock} />

                    <div className="pt-4 pb-2 px-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Everything Else</div>
                    <NavItem id="fyi" label="FYI" count={counts.fyi || 0} active={activeTab} onClick={setActiveTab} icon={Info} />
                    <NavItem id="cleaned" label="Cleaned" count={counts.cleaned || 0} active={activeTab} onClick={setActiveTab} icon={Sparkles} />
                    <NavItem id="drafts" label="Drafts" count={counts.drafts || 0} active={activeTab} onClick={setActiveTab} icon={FileText} />
                </nav>
            </div>

            {/* B) Middle Panel: Work Queue */}
            {activeTab !== 'today' && (
                <div className="w-[400px] border-r border-zinc-100 flex flex-col bg-white shrink-0 animate-in slide-in-from-left-8 fade-in duration-300">
                    {/* Fixed Header */}
                    <div className="h-16 border-b border-zinc-100 flex items-center px-6 justify-between shrink-0 bg-white z-10">
                        <h2 className="text-sm font-bold uppercase tracking-wide">{activeTab.replace('_', ' ')}</h2>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-zinc-400">All Providers</span>
                        </div>
                    </div>

                    {/* List */}
                    <div className="flex-1 overflow-y-auto">
                        <InboxList
                            onSelect={setSelectedEmail}
                            selectedId={selectedEmail?.id}
                            refreshTrigger={refreshTrigger}
                            filter={activeTab}
                            onLoad={handleListLoad}
                        />
                    </div>
                </div>
            )}

            {/* C) Main Panel: Workspace */}
            <div className="flex-1 flex flex-col bg-zinc-50/30 overflow-hidden relative">
                {activeTab === 'today' ? (
                    <DashboardOverview counts={counts} onNavigate={setActiveTab} />
                ) : (
                    <EmailThreadView
                        email={selectedEmail}
                        onClose={() => setSelectedEmail(null)}
                    />
                )}
            </div>
        </div>
    )
}
