"use client"

import * as React from "react"
import { AnimatePresence, motion } from "framer-motion"
import { GlobalRail } from "@/components/shell/GlobalRail"
import {
    Mail,
    Calendar,
    FileText,
    Globe,
    Search,
    Brain,
    Plus,
    Filter,
    ArrowRight,
    ChevronLeft,
    ChevronRight,
    Settings,
    Users,
    File as FileIcon,
    Image as ImageIcon,
    MessageSquare,
    MoreHorizontal,
    Layout,
    CheckCircle2,
    X,
    Upload,
    Link as LinkIcon,
    FileCode,
    Sparkles,
    Activity,
    Cpu,
    Zap,
    Cloud,
    ExternalLink,
    Lock,
    Command,
    ShieldCheck,
    Bot,
    Terminal,
    Network,
    Facebook,
    Instagram,
    Linkedin
} from "lucide-react"
import { cn } from "@/lib/utils"
import { connectorService, ConnectedAccount, Provider, ServiceType } from "@/services/connector.service"

// --- Types ---
type IntegrationStatus = "connected" | "disconnected" | "syncing"

type IntegrationCard = {
    id: string
    name: string
    provider: string
    icon: React.ElementType
    status: IntegrationStatus
    color: string
    type: "mail" | "calendar" | "social"
}

type KnowledgeType = "snippet" | "webpage" | "file" | "media"

type KnowledgeItem = {
    id: string
    title: string
    type: KnowledgeType
    description: string
    icon: React.ElementType
    date: string
}

// --- Mock Data ---
// --- Mock Data ---
// Removed static INTEGRATION_CARDS

const KNOWLEDGE_ITEMS: KnowledgeItem[] = [
    { id: "1", title: "Quarterly_Growth_Q1.pdf", type: "file", description: "Aggregated mail & social data insights.", icon: FileText, date: "Just now" },
    { id: "2", title: "Creative Assets v2", type: "media", description: "Facebook & Instagram brand kit.", icon: ImageIcon, date: "2h ago" },
    { id: "3", title: "Executive Schedule Sync", type: "snippet", description: "Synthesized GCal & OCal conflicts.", icon: Calendar, date: "Today" },
    { id: "4", title: "Market Trends - LinkedIn", type: "webpage", description: "Business intelligence scrape.", icon: Globe, date: "Yesterday" }
]

// --- UI Components ---

function UniversalHero() {
    return (
        <div className="relative pt-24 pb-16 px-10 border-b border-zinc-50">
            <div className="max-w-6xl mx-auto flex flex-col items-center text-center relative z-10">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-50 border border-zinc-100 text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-10">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Centralized Intelligence Hub
                </div>

                <h2 className="text-7xl lg:text-8xl font-bold tracking-[-0.05em] text-black leading-[0.85] mb-10">
                    Your entire ecosystem <br />
                    <span className="text-zinc-200">connected to one brain.</span>
                </h2>

                <p className="text-xl text-zinc-400 max-w-3xl font-medium leading-relaxed">
                    The Central Brain synthesizes your Gmail, Outlook, LinkedIn, and Meta data into a unified cognitive structure for absolute executive recall.
                </p>
            </div>

            <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.01)_1.5px,transparent_1.5px),linear-gradient(90deg,rgba(0,0,0,0.01)_1.5px,transparent_1.5px)] bg-[size:60px_60px] pointer-events-none -z-10" />
        </div>
    )
}




function KnowledgeRow({ item }: { item: KnowledgeItem }) {
    return (
        <div className="p-8 bg-white border border-zinc-100 rounded-[40px] hover:border-zinc-300 shadow-sm transition-all flex items-center gap-8 group cursor-pointer">
            <div className="h-16 w-16 bg-zinc-50 rounded-2xl flex items-center justify-center text-zinc-300 group-hover:bg-black group-hover:text-white transition-all transform duration-300">
                <item.icon className="h-8 w-8" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-4 mb-2">
                    <h4 className="text-xl font-bold text-black truncate tracking-tight">{item.title}</h4>
                    <span className="px-3 py-1 rounded-full bg-zinc-50 border border-zinc-100 text-[10px] font-bold text-zinc-400 uppercase tracking-[0.1em]">{item.type}</span>
                </div>
                <p className="text-sm font-medium text-zinc-400 leading-relaxed">{item.description}</p>
            </div>
            <div className="text-right shrink-0">
                <div className="flex items-center gap-3 text-emerald-500 font-bold text-xs uppercase tracking-widest">
                    <span>Synthesized</span>
                    <CheckCircle2 className="h-5 w-5" />
                </div>
            </div>
        </div>
    )
}


function AddKnowledgeModal({ isOpen, onClose, type }: { isOpen: boolean; onClose: () => void; type: KnowledgeType | null }) {
    const [step, setStep] = React.useState<"select" | "form" | "indexing" | "success">(type ? "form" : "select")
    const [selectedType, setSelectedType] = React.useState<KnowledgeType | null>(type)

    React.useEffect(() => {
        if (isOpen) {
            setStep(type ? "form" : "select")
            setSelectedType(type)
        }
    }, [isOpen, type])

    if (!isOpen) return null

    const handleTypeSelect = (t: KnowledgeType) => {
        setSelectedType(t)
        setStep("form")
    }

    const handleIndex = () => {
        setStep("indexing")
        setTimeout(() => setStep("success"), 2500)
    }

    const reset = () => {
        setStep("form")
        onClose()
    }

    const activeType = selectedType || type

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={reset}
                    className="absolute inset-0 bg-white/40 backdrop-blur-2xl"
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 30 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 30 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="relative w-full max-w-lg bg-white border border-zinc-100 rounded-[32px] shadow-[0_30px_70px_rgba(0,0,0,0.08)] overflow-hidden p-10"
                >
                    {step === "select" && (
                        <motion.div
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            className="space-y-8"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-2xl font-bold tracking-tight text-black mb-0.5">Add Intelligence</h2>
                                    <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-[0.2em]">Select data protocol</p>
                                </div>
                                <div onClick={reset} className="h-9 w-9 rounded-full border border-zinc-100 flex items-center justify-center cursor-pointer hover:bg-zinc-50 transition-colors">
                                    <X className="h-4 w-4 text-zinc-500" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    { id: 'snippet', name: 'Snippet', icon: MessageSquare, color: "hover:bg-blue-50/50 hover:border-blue-100", iconColor: "text-blue-500" },
                                    { id: 'webpage', name: 'Web Link', icon: LinkIcon, color: "hover:bg-emerald-50/50 hover:border-emerald-100", iconColor: "text-emerald-500" },
                                    { id: 'file', name: 'File', icon: FileIcon, color: "hover:bg-purple-50/50 hover:border-purple-100", iconColor: "text-purple-500" },
                                    { id: 'media', name: 'Media', icon: ImageIcon, color: "hover:bg-pink-50/50 hover:border-pink-100", iconColor: "text-pink-500" }
                                ].map((t) => (
                                    <button
                                        key={t.id}
                                        onClick={() => handleTypeSelect(t.id as KnowledgeType)}
                                        className={cn(
                                            "p-6 bg-white border border-zinc-100 rounded-3xl text-left transition-all group relative overflow-hidden",
                                            t.color
                                        )}
                                    >
                                        <div className="h-10 w-10 rounded-xl bg-zinc-50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                            <t.icon className={cn("h-5 w-5", t.iconColor)} />
                                        </div>
                                        <span className="text-base font-bold text-black block mb-0.5">{t.name}</span>
                                        <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest group-hover:text-black transition-colors">Index nodes</span>
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {step === "form" && (
                        <motion.div
                            initial={{ x: 20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            className="space-y-8"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 bg-black rounded-xl flex items-center justify-center text-white shadow-sm">
                                        <Plus className="h-6 w-6" />
                                    </div>
                                    <div className="flex flex-col">
                                        <h2 className="text-xl font-bold tracking-tight text-black leading-tight">Index {activeType ? activeType.charAt(0).toUpperCase() + activeType.slice(1) : 'Data'}</h2>
                                        <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-[0.2em] mt-0.5">Phase: Ingestion</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {!type && (
                                        <button
                                            onClick={() => setStep("select")}
                                            className="h-9 w-9 rounded-full border border-zinc-100 flex items-center justify-center text-zinc-400 hover:bg-zinc-50 hover:text-black transition-all"
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                        </button>
                                    )}
                                    <button
                                        onClick={reset}
                                        className="h-9 w-9 rounded-full border border-zinc-100 flex items-center justify-center text-zinc-400 hover:bg-zinc-50 hover:text-black transition-all"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-6">
                                {activeType === 'snippet' && (
                                    <textarea
                                        placeholder="Paste your note or snippet here..."
                                        className="w-full h-40 p-6 bg-zinc-50/50 border border-zinc-100/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:bg-white focus:border-black transition-all resize-none font-medium text-black text-base leading-relaxed placeholder:text-zinc-400"
                                    />
                                )}
                                {activeType === 'webpage' && (
                                    <div className="relative group">
                                        <LinkIcon className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-200 group-focus-within:text-black transition-colors" />
                                        <input
                                            type="text"
                                            placeholder="https://example.com/article"
                                            className="w-full h-16 pl-14 pr-6 bg-zinc-50/50 border border-zinc-100/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:bg-white focus:border-black font-medium text-black text-base transition-all placeholder:text-zinc-400"
                                        />
                                    </div>
                                )}
                                {(activeType === 'file' || activeType === 'media') && (
                                    <div
                                        onClick={() => document.getElementById('file-upload')?.click()}
                                        className="w-full h-48 border-[1.5px] border-dashed border-zinc-200 rounded-3xl flex flex-col items-center justify-center text-zinc-300 hover:border-black hover:bg-zinc-50/50 transition-all cursor-pointer group relative overflow-hidden"
                                    >
                                        <input type="file" className="hidden" id="file-upload" onChange={handleIndex} />
                                        <div className="relative z-10 flex flex-col items-center">
                                            <div className="h-14 w-14 rounded-full border border-zinc-100 bg-white flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-xs">
                                                <Upload className="h-6 w-6 text-zinc-300 group-hover:text-black transition-colors" />
                                            </div>
                                            <span className="font-bold text-xs uppercase tracking-[0.2em] mb-1.5 text-zinc-400 group-hover:text-black transition-colors">Drop {activeType} here</span>
                                            <p className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">Max 512MB • High-Speed Parsing</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <button onClick={handleIndex} className="w-full h-16 bg-black text-white rounded-2xl font-bold text-base shadow-lg hover:scale-[1.01] transition-all active:scale-[0.98] flex items-center justify-center gap-2 group">
                                {activeType === 'file' || activeType === 'media' ? 'Initialize Synthesis' : `Index ${activeType}`}
                                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </motion.div>
                    )}

                    {step === "indexing" && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="py-24 flex flex-col items-center text-center space-y-10"
                        >
                            <div className="relative">
                                <div className="h-32 w-32 border-[6px] border-zinc-50 border-t-black rounded-full animate-spin" />
                                <Brain className="absolute inset-0 m-auto h-12 w-12 text-black animate-pulse" />
                            </div>
                            <div>
                                <h3 className="text-4xl font-bold text-black mb-4 tracking-tighter">Synergizing Neural Nodes</h3>
                                <p className="text-zinc-400 font-medium text-xl">Compressing data into executive memory...</p>
                            </div>
                        </motion.div>
                    )}

                    {step === "success" && (
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="py-20 flex flex-col items-center text-center"
                        >
                            <div className="h-32 w-32 bg-emerald-500 rounded-[48px] flex items-center justify-center text-white mb-12 shadow-[0_20px_50px_rgba(16,185,129,0.3)] rotate-12">
                                <CheckCircle2 className="h-16 w-16" />
                            </div>
                            <h3 className="text-5xl font-bold text-black mb-6 tracking-tight">Neural Memory Updated</h3>
                            <p className="text-zinc-400 font-medium text-xl mb-16 max-w-md">The intelligence is now synthesized and available for multi-brain search.</p>
                            <button onClick={reset} className="h-20 px-20 bg-black text-white rounded-[32px] font-bold text-xl hover:scale-[1.05] transition-all shadow-xl shadow-black/10">Back to Repository</button>
                        </motion.div>
                    )}
                </motion.div>
            </div>
        </AnimatePresence>
    )
}

export default function BrainPage() {
    const [isAddOpen, setIsAddOpen] = React.useState(false)
    const [activeType, setActiveType] = React.useState<KnowledgeType | null>(null)
    const [filter, setFilter] = React.useState<"all" | KnowledgeType>("all")
    const [searchQuery, setSearchQuery] = React.useState("")

    const openAdd = (type: KnowledgeType) => {
        setActiveType(type)
        setIsAddOpen(true)
    }

    const [selectedItems, setSelectedItems] = React.useState<string[]>([])

    const toggleSelect = (id: string, e: React.MouseEvent) => {
        e.stopPropagation()
        setSelectedItems(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
    }

    const selectAll = () => {
        if (selectedItems.length === filteredItems.length) setSelectedItems([])
        else setSelectedItems(filteredItems.map(i => i.id))
    }

    const filteredItems = KNOWLEDGE_ITEMS.filter(item => {
        const matchesFilter = filter === "all" || item.type === filter
        const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.description.toLowerCase().includes(searchQuery.toLowerCase())
        return matchesFilter && matchesSearch
    })

    return (
        <div className="flex h-screen bg-[#fafafa] text-black font-sans selection:bg-black selection:text-white overflow-hidden">
            <GlobalRail />

            <div className="flex-1 ml-[72px] flex flex-col h-full overflow-hidden relative">
                <main className="flex-1 overflow-y-auto px-10 pb-40 scroll-smooth">
                    <div className="max-w-7xl mx-auto flex flex-col gap-12">

                        <div className="h-10"></div>

                        <div className="flex justify-center px-10">
                            <div className="w-full max-w-4xl flex flex-col gap-16">


                                {/* 2. Synthesized Intelligence Section (The Storage) */}
                                <div className="space-y-10">
                                    <div className="flex flex-col gap-8">
                                        <div className="flex items-end justify-between">
                                            <div className="flex flex-col gap-2">
                                                <h3 className="text-3xl font-bold tracking-tighter text-black">Intelligence Repository</h3>
                                                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Managing {KNOWLEDGE_ITEMS.length} synthesized nodes</p>
                                            </div>
                                            <div className="flex items-center gap-6">
                                                <button
                                                    onClick={() => { setActiveType(null); setIsAddOpen(true); }}
                                                    className="flex items-center gap-2 px-5 py-2.5 bg-black text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:scale-[1.02] transition-all shadow-lg shadow-black/10"
                                                >
                                                    <Plus className="h-4 w-4" />
                                                    Add Intelligence
                                                </button>
                                            </div>
                                        </div>

                                        {/* Functional Search & Filter Bar */}
                                        <div className="flex flex-col sm:flex-row gap-4">
                                            <div className="flex-1 relative">
                                                <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
                                                <input
                                                    type="text"
                                                    placeholder="Search synthesized intelligence..."
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                    className="w-full h-16 pl-14 pr-6 bg-white border border-zinc-100 rounded-[24px] focus:outline-none focus:ring-2 focus:ring-black/5 font-medium shadow-sm transition-all"
                                                />
                                            </div>
                                            <div className="flex items-center p-1 bg-zinc-50 border border-zinc-100 rounded-[24px]">
                                                {(['all', 'file', 'snippet', 'webpage', 'media'] as const).map((t) => (
                                                    <button
                                                        key={t}
                                                        onClick={() => setFilter(t)}
                                                        className={cn(
                                                            "px-5 py-2.5 rounded-[18px] text-[10px] font-bold uppercase tracking-widest transition-all",
                                                            filter === t ? "bg-black text-white shadow-lg" : "text-zinc-400 hover:text-black"
                                                        )}
                                                    >
                                                        {t}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-6">
                                        {filteredItems.length > 0 ? (
                                            filteredItems.map(item => (
                                                <div key={item.id} className="relative group/row">
                                                    <div
                                                        onClick={(e) => toggleSelect(item.id, e)}
                                                        className={cn(
                                                            "absolute left-[-40px] top-1/2 -translate-y-1/2 h-6 w-6 rounded-lg border-2 flex items-center justify-center cursor-pointer transition-all opacity-0 group-hover/row:opacity-100",
                                                            selectedItems.includes(item.id) ? "bg-black border-black text-white" : "border-zinc-200 bg-white"
                                                        )}
                                                    >
                                                        {selectedItems.includes(item.id) && <CheckCircle2 className="h-4 w-4" />}
                                                    </div>
                                                    <div className={cn(
                                                        "transition-all",
                                                        selectedItems.includes(item.id) ? "translate-x-4" : ""
                                                    )}>
                                                        <KnowledgeRow item={item} />
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="py-20 text-center border-2 border-dashed border-zinc-100 rounded-[40px]">
                                                <p className="text-sm font-bold text-zinc-300 uppercase tracking-widest">No matching intelligence found</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </main>

                {/* Advanced Selection Action Bar */}
                <AnimatePresence>
                    {selectedItems.length > 0 && (
                        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[90] px-8 py-4 bg-black rounded-3xl shadow-2xl flex items-center gap-10">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Selected Entities</span>
                                <span className="text-sm font-bold text-white">{selectedItems.length} Nodes</span>
                            </div>
                            <div className="h-8 w-px bg-zinc-800" />
                            <div className="flex items-center gap-4">
                                <button className="px-6 py-2 rounded-xl bg-zinc-800 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-700">Re-index</button>
                                <button className="px-6 py-2 rounded-xl bg-zinc-800 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-700">Export</button>
                                <button className="px-6 py-2 rounded-xl bg-red-900/50 text-red-500 text-[10px] font-bold uppercase tracking-widest hover:bg-red-800/50">Purge</button>
                            </div>
                            <X
                                onClick={() => setSelectedItems([])}
                                className="h-5 w-5 text-zinc-500 hover:text-white cursor-pointer"
                            />
                        </div>
                    )}
                </AnimatePresence>

                <AddKnowledgeModal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} type={activeType} />
            </div>
        </div>
    )
}
