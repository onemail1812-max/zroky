"use client"

import * as React from "react"
import { GlobalRail } from "@/components/shell/GlobalRail"
import { InboxList, EmailThreadView } from "@/components/inbox"
import { inboxService, EmailMessage } from "@/services/inbox.service"
import { RefreshCw, Search, Inbox, AlertOctagon, MessageSquare, Newspaper, Calendar, CheckCircle2, Clock, Info, Sparkles, FileText, AlertCircle, Bell } from "lucide-react"
import { NotificationCard } from "@/components/ui/NotificationCard"
import { AnimatePresence } from "framer-motion"

// Define the notification type based on backend SSE data
type AaliyahNotification = {
    id: string;
    title: string;
    description: string;
    type: string;
}

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

export default function InboxPage() {
    const [selectedEmail, setSelectedEmail] = React.useState<EmailMessage | null>(null)
    const [refreshTrigger, setRefreshTrigger] = React.useState(0)
    const [activeTab, setActiveTab] = React.useState<string | null>(null)
    const [counts, setCounts] = React.useState<Record<string, number>>({})
    const [providerStatus, setProviderStatus] = React.useState<Record<string, string>>({})

    // Notification State
    const [notifications, setNotifications] = React.useState<AaliyahNotification[]>([])

    const middlePanelRef = React.useRef<HTMLDivElement>(null)
    const leftPanelRef = React.useRef<HTMLDivElement>(null)

    const removeNotification = (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id))
    }

    // Aaliyah Notification Stream
    React.useEffect(() => {
        const token = localStorage.getItem('auth_token') || localStorage.getItem('__session');
        const workspaceId = localStorage.getItem('tenant_id') || 'default';
        const url = `/api/v1/feed/stream?token=${token}&workspace_id=${workspaceId}`;

        const es = new EventSource(url);

        es.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'draft_ready' || data.type === 'thread_updated') {
                    const newNotification: AaliyahNotification = {
                        id: Math.random().toString(36).substring(7),
                        title: data.type === 'draft_ready' ? 'Draft Ready' : 'AI Action',
                        description: data.message,
                        type: data.payload?.needs_clarity ? 'needs_clarity' :
                            data.type === 'draft_ready' ? 'draft_ready' : 'auto_archived'
                    };

                    setNotifications(prev => [...prev, newNotification]);
                    setRefreshTrigger(p => p + 1); // Auto-refresh the inbox lists

                    // Auto-dismiss after 8 seconds
                    setTimeout(() => removeNotification(newNotification.id), 8000);
                }
            } catch (e) { /* ignore invalid JSON */ }
        };

        return () => es.close();
    }, []);

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

    // Click Outside Handler
    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (activeTab &&
                middlePanelRef.current &&
                !middlePanelRef.current.contains(event.target as Node) &&
                leftPanelRef.current &&
                !leftPanelRef.current.contains(event.target as Node)) {
                setActiveTab(null);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [activeTab]);

    const handleRefresh = async () => {
        setRefreshTrigger(p => p + 1)
        await inboxService.syncInbox().catch(console.error)
        setRefreshTrigger(p => p + 1)
    }

    const toggleTab = (id: string) => {
        setActiveTab(prev => prev === id ? null : id);
    }

    const hasError = Object.values(providerStatus).some(s => s !== 'active' && s !== 'ok')

    const handleListLoad = (first: EmailMessage | null) => {
        // Only auto-select if we don't have one and just opened a tab? 
        // User request: "Scrollable list; first item auto-selected"
        if (!selectedEmail && first) {
            setSelectedEmail(first)
        }
    }

    return (
        <div className="flex h-screen bg-white text-black font-sans selection:bg-black selection:text-white overflow-hidden">
            <GlobalRail />

            {/* A) Left Panel: Navigation & Live Numbers */}
            <div ref={leftPanelRef} className="w-[240px] border-r border-zinc-100 flex flex-col bg-zinc-50/30 shrink-0 z-20 relative">
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
                    <div className="pt-2 pb-2 px-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Focus</div>
                    <NavItem id="priority" label="Priority" count={counts.priority || 0} active={activeTab} onClick={toggleTab} icon={AlertOctagon} />
                    <NavItem id="needs_reply" label="Needs Reply" count={counts.needs_reply || 0} active={activeTab} onClick={toggleTab} icon={MessageSquare} />
                    <NavItem id="approvals" label="Approvals" count={counts.approvals || 0} active={activeTab} onClick={toggleTab} icon={CheckCircle2} />
                    <NavItem id="follow_ups" label="Follow-ups" count={counts.follow_ups || 0} active={activeTab} onClick={toggleTab} icon={Clock} />

                    <div className="pt-4 pb-2 px-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Other</div>
                    <NavItem id="drafts" label="Drafts" count={counts.drafts || 0} active={activeTab} onClick={toggleTab} icon={FileText} />
                </nav>
            </div>

            {/* B) Middle Panel: Work Queue - Absolute/Overlay or Push? 
                User: "Opens when left tab clicked; closes when same tab clicked OR clicking outside."
                Let's make it push the content for now as it's cleaner than overlay, but if "clicking outside" implies overlay behavior, 
                absolute positioning might be better. 
                However, standard 3-pane email clients (Outlook, etc.) usually are fixed columns. 
                "Middle panel is hidden by default". 
                Let's use a conditional render that sits between Left and Main.
            */}
            {activeTab && (
                <div ref={middlePanelRef} className="w-[400px] border-r border-zinc-100 flex flex-col bg-white shrink-0 animate-in slide-in-from-left-8 fade-in duration-300 z-10 h-full shadow-[5px_0_20px_rgba(0,0,0,0.03)]">
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
                            onSelect={(email) => { setSelectedEmail(email); /* don't close panel automatically? User didn't say to close on select. */ }}
                            selectedId={selectedEmail?.id}
                            refreshTrigger={refreshTrigger}
                            filter={activeTab}
                            onLoad={handleListLoad}
                        />
                    </div>
                </div>
            )}

            {/* C) Main Panel: Workspace */}
            <div className="flex-1 flex flex-col bg-zinc-50/30 overflow-hidden relative z-0">
                <EmailThreadView
                    email={selectedEmail}
                    onClose={() => setSelectedEmail(null)}
                />
            </div>

            {/* Aaliyah AI Floating Notifications */}
            <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-4 pointer-events-none">
                <AnimatePresence>
                    {notifications.map(n => (
                        <div key={n.id} className="pointer-events-auto">
                            <NotificationCard
                                id={n.id}
                                title={n.title}
                                description={n.description}
                                type={n.type as any}
                                onDismiss={removeNotification}
                                onClick={(id) => {
                                    removeNotification(id);
                                    handleRefresh(); // Ensure latest data is fetched
                                }}
                            />
                        </div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    )
}
