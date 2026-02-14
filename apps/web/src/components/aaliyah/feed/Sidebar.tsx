"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
    Inbox,
    Settings,
    SlidersHorizontal,
    User,
    LayoutDashboard
} from "lucide-react"
import { useEffect, useState } from "react"
// We assume getStats is exported from api.ts as verified earlier
import { getStats } from "@/lib/aaliyah/api"

type SidebarStats = {
    queued_count?: number
    calendar_conflicts?: number
}

export function Sidebar() {
    const pathname = usePathname()
    const [stats, setStats] = useState<SidebarStats | null>(null)

    useEffect(() => {
        getStats()
            .then(data => setStats(data))
            .catch(err => {
                console.error("Failed to fetch sidebar stats:", err)
                setStats(null)
            })
    }, [])

    const NAV_ITEMS = [
        { name: "Briefing", href: "/briefing", icon: LayoutDashboard },
        { name: "Workspace", href: "/aaliyahworkspace", icon: Inbox },
        { name: "Guidelines", href: "/guidelines", icon: SlidersHorizontal },
        { name: "Settings", href: "/settings", icon: Settings },
    ]

    return (
        <aside className="w-64 border-r border-slate-200 bg-slate-50 flex flex-col h-screen fixed left-0 top-0 z-20">

            {/* Brand */}
            <div className="h-14 flex items-center px-6 border-b border-slate-100 bg-white">
                <div className="flex items-center gap-2">
                    <div className="h-6 w-6 bg-slate-900 rounded-md flex items-center justify-center">
                        <span className="text-white text-xs font-bold">A</span>
                    </div>
                    <span className="font-semibold text-slate-900 tracking-tight">aaliyah</span>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                {NAV_ITEMS.map((item) => {
                    let count = 0
                    if (item.name === "Workspace" && stats?.queued_count) count = stats.queued_count
                    if (item.name === "Briefing" && stats?.calendar_conflicts) count = stats.calendar_conflicts

                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                                "flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors",
                                pathname.startsWith(item.href)
                                    ? "bg-white text-blue-600 shadow-sm border border-slate-200"
                                    : "text-slate-600 hover:bg-white hover:text-slate-900"
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <item.icon className="h-4 w-4" />
                                {item.name}
                            </div>
                            {count > 0 && (
                                <span className={cn(
                                    "px-2 py-0.5 rounded-full text-[10px] font-bold min-w-[20px] text-center",
                                    item.name === "Briefing" ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"
                                )}>
                                    {count}
                                </span>
                            )}
                        </Link>
                    )
                })}

                <div className="pt-4 mt-4 border-t border-slate-200/50">
                    <h4 className="px-3 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Timeline
                    </h4>
                    <div className="space-y-1">
                        <button className="w-full text-left px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded flex items-center gap-2">
                            <div className="h-1.5 w-1.5 rounded-full bg-green-500" /> Today
                        </button>
                        <button className="w-full text-left px-3 py-1.5 text-sm text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded flex items-center gap-2">
                            <div className="h-1.5 w-1.5 rounded-full bg-slate-300" /> Yesterday
                        </button>
                    </div>
                </div>
            </nav>

            {/* Footer / Context */}
            <div className="p-4 border-t border-slate-200 bg-white">
                <button className="flex items-center gap-3 w-full text-left hover:bg-slate-50 p-2 rounded-lg transition-colors">
                    <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 border border-slate-200">
                        <User className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">My Context</p>
                        <p className="text-xs text-slate-500 truncate">View Knowledge Graph</p>
                    </div>
                </button>
            </div>
        </aside>
    )
}
