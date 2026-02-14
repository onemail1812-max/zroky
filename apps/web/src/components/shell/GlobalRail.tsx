"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Brain,
  CalendarDays,
  CircleHelp,
  Globe2,
  Home,
  MessageSquareText,
  Plus,
  Settings,
  UserRound,
} from "lucide-react"

import { cn } from "@/lib/utils"

type RailItem = {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  disabled?: boolean
}

const TOP_NAV: RailItem[] = [
  { name: "Home", href: "/dashboard", icon: Home },
  { name: "Chat", href: "/aaliyahworkspace", icon: MessageSquareText },
  { name: "Brain", href: "/guidelines", icon: Brain },
  { name: "Calendar", href: "/notifications", icon: CalendarDays },
]

const BOTTOM_NAV: RailItem[] = [
  { name: "Add Workspace", href: "/aaliyahonboarding", icon: Plus },
  { name: "Global", href: "/updates", icon: Globe2 },
  { name: "Help", href: "/feedback", icon: CircleHelp },
  { name: "Settings", href: "/settings", icon: Settings },
]

function RailLink({ item, active }: { item: RailItem; active: boolean }) {
  const Icon = item.icon

  if (item.disabled) {
    return (
      <div
        aria-label={item.name}
        title={`${item.name} (Coming soon)`}
        className="h-11 w-11 rounded-2xl flex items-center justify-center border border-transparent bg-surface text-textMuted"
      >
        <Icon className="h-6 w-6" strokeWidth={1.5} />
      </div>
    )
  }

  return (
    <Link
      href={item.href}
      aria-label={item.name}
      title={item.name}
      className={cn(
        "h-11 w-11 rounded-lg flex items-center justify-center transition-colors border",
        active
          ? "bg-surface text-textPrimary border-borderSubtle"
          : "bg-transparent text-textMuted border-transparent hover:bg-surface hover:text-textPrimary"
      )}
    >
      <Icon className="h-6 w-6" strokeWidth={1.5} />
    </Link>
  )
}

export function GlobalRail() {
  const pathname = usePathname()

  return (
    <aside className="w-[72px] h-screen fixed left-0 top-0 z-30 bg-surfaceElevated border-r border-borderSubtle flex flex-col items-center py-6">
      <nav className="flex flex-col items-center gap-6 mt-2">
        {TOP_NAV.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          return <RailLink key={item.href} item={item} active={isActive} />
        })}
      </nav>

      <div className="mt-auto flex flex-col items-center gap-4">
        {BOTTOM_NAV.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          return <RailLink key={item.href} item={item} active={isActive} />
        })}

        <Link
          href="/profile"
          aria-label="Profile"
          title="Profile"
          className="h-11 w-11 rounded-lg border border-borderSubtle bg-surface flex items-center justify-center text-textMuted hover:bg-surfaceElevated hover:text-textPrimary transition-colors"
        >
          <UserRound className="h-6 w-6" strokeWidth={1.5} />
        </Link>
      </div>
    </aside>
  )
}
