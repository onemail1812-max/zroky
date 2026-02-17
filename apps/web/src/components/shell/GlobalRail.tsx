"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Calendar,
  Command,
  Globe,
  Home,
  LayoutGrid,
  LifeBuoy,
  MessageSquare,
  Brain,
  PlusSquare,
  Settings,
  User,
} from "lucide-react"

import { cn } from "@/lib/utils"

type RailItem = {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string; strokeWidth?: number; fill?: string }>
  disabled?: boolean
}

// Updated Standard Icon Set
const TOP_NAV: RailItem[] = [
  { name: "Home", href: "/dashboard", icon: Home }, // Standard Home
  { name: "Aaliyah", href: "/aaliyahworkspace", icon: MessageSquare }, // Chat
  { name: "Brain", href: "/brain", icon: Brain }, // Brain
  { name: "Calendar", href: "/notifications", icon: Calendar }, // Standard Calendar
]

const BOTTOM_NAV: RailItem[] = [
  { name: "Add Workspace", href: "/aaliyahonboarding", icon: PlusSquare },
  { name: "Global", href: "/updates", icon: Globe },
  { name: "Help", href: "/feedback", icon: LifeBuoy },
  { name: "Settings", href: "/settings", icon: Settings },
]

export function GlobalRail() {
  const pathname = usePathname()

  return (
    <aside className="w-[72px] h-screen fixed left-0 top-0 z-50 bg-white border-r border-zinc-100 flex flex-col items-center py-6">
      {/* Logo / Brand Area */}
      <div className="mb-6">
        <div className="h-8 w-8 bg-black rounded-[10px] flex items-center justify-center text-white font-bold text-xs shadow-lg shadow-black/10">
          Z
        </div>
      </div>

      <nav className="flex flex-col items-center gap-4 w-full">
        {TOP_NAV.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative group flex items-center justify-center h-10 w-10 rounded-xl transition-all duration-300",
                isActive
                  ? "bg-zinc-100 text-black shadow-inner"
                  : "text-zinc-400 hover:text-black hover:bg-zinc-50"
              )}
            >
              <item.icon
                className={cn(
                  "h-5 w-5 transition-transform duration-300",
                  isActive ? "scale-100" : "group-hover:scale-110"
                )}
                strokeWidth={isActive ? 2.5 : 1.5}
              />
              {isActive && (
                <div
                  className="absolute left-0 w-1 h-5 bg-black rounded-r-full"
                />
              )}
            </Link>
          )
        })}
      </nav>

      <div className="grow" />

      <div className="flex flex-col items-center gap-4 w-full mb-2">
        {BOTTOM_NAV.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative group flex items-center justify-center h-10 w-10 rounded-xl transition-all duration-300",
                isActive
                  ? "bg-zinc-100 text-black"
                  : "text-zinc-400 hover:text-black hover:bg-zinc-50"
              )}
            >
              <item.icon className="h-5 w-5" strokeWidth={1.5} />
            </Link>
          )
        })}

        <div className="h-px w-8 bg-zinc-100 my-1" />

        <Link
          href="/profile"
          className="h-10 w-10 rounded-full bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-400 hover:text-black hover:border-zinc-200 transition-all overflow-hidden"
        >
          <User className="h-5 w-5" strokeWidth={1.5} />
        </Link>
      </div>
    </aside>
  )
}
