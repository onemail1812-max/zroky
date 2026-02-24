"use client"

import * as React from "react"
import { Mail, MessageSquare, Archive, Settings } from "lucide-react"
import { cn } from "@/lib/utils"

type Tab = "inbox" | "chat" | "archive" | "settings"

export function MobileNavBar({
    activeTab,
    onTabChange,
    unreadCount = 0,
}: {
    activeTab: Tab
    onTabChange: (tab: Tab) => void
    unreadCount?: number
}) {
    const tabs: { id: Tab; label: string; icon: any }[] = [
        { id: "inbox", label: "Inbox", icon: Mail },
        { id: "chat", label: "Aaliyah", icon: MessageSquare },
        { id: "archive", label: "Archive", icon: Archive },
        { id: "settings", label: "Settings", icon: Settings },
    ]

    return (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 px-2 py-1.5 z-50 animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-around max-w-md mx-auto">
                {tabs.map((tab) => {
                    const Icon = tab.icon
                    const isActive = activeTab === tab.id

                    return (
                        <button
                            key={tab.id}
                            onClick={() => onTabChange(tab.id)}
                            className={cn(
                                "flex flex-col items-center justify-center gap-1 min-w-[64px] py-1 transition-all rounded-xl",
                                isActive ? "text-indigo-600 dark:text-indigo-400" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
                            )}
                        >
                            <div className="relative">
                                <Icon className={cn("h-6 w-6", isActive ? "fill-current/10" : "")} strokeWidth={isActive ? 2.5 : 2} />
                                {tab.id === "inbox" && unreadCount > 0 && (
                                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-zinc-900">
                                        {unreadCount > 9 ? "9+" : unreadCount}
                                    </span>
                                )}
                            </div>
                            <span className="text-[10px] font-medium leading-none">{tab.label}</span>
                        </button>
                    )
                })}
            </div>
            {/* Safe Area Spacer for iOS */}
            <div className="h-safe-bottom" />
        </div>
    )
}
