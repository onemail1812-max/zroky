"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Sparkles, Filter, Video, Clock, Users, ArrowRight, MousePointerClick, MoreHorizontal, Layers } from "lucide-react"
import { format, addDays, startOfWeek, isSameDay, startOfDay } from "date-fns"
import { cn } from "@/lib/utils"

// Team members mocking
const TEAM = [
    { id: "cm_1", name: "Alex (You)", color: "bg-black border-black/10 text-white", tagColor: "bg-black", initials: "AL" },
    { id: "cm_2", name: "Sarah J.", color: "bg-orange-100 border-orange-200 text-orange-900", tagColor: "bg-orange-500", initials: "SJ" },
    { id: "cm_3", name: "Michael T.", color: "bg-emerald-100 border-emerald-200 text-emerald-900", tagColor: "bg-emerald-500", initials: "MT" },
    { id: "cm_4", name: "Elena R.", color: "bg-blue-100 border-blue-200 text-blue-900", tagColor: "bg-blue-500", initials: "ER" },
    { id: "cm_5", name: "David K.", color: "bg-purple-100 border-purple-200 text-purple-900", tagColor: "bg-purple-500", initials: "DK" },
]

// Mocks aligned with the 2026 week starting Feb 16 (assumed for demo consistency)
const baseDate = startOfDay(new Date())
const weekStart = startOfWeek(baseDate, { weekStartsOn: 1 }) // Monday

// Format: dayOffset (from Monday), startHour (0-24, fractional), endHour, memberId, title, type
const MOCK_EVENTS = [
    { id: 1, dayOffset: 0, startHour: 9, endHour: 10, memberIds: ["cm_1", "cm_2"], title: "Weekly Sync", type: "meeting" },
    { id: 2, dayOffset: 0, startHour: 10.5, endHour: 12, memberIds: ["cm_3"], title: "Client Presentation", type: "external" },
    { id: 3, dayOffset: 0, startHour: 13, endHour: 14, memberIds: ["cm_4", "cm_5"], title: "Design Review", type: "meeting" },
    { id: 4, dayOffset: 0, startHour: 15, endHour: 16.5, memberIds: ["cm_1"], title: "Deep Work: Q1 Strategy", type: "focus" },

    { id: 5, dayOffset: 1, startHour: 9.5, endHour: 11, memberIds: ["cm_2", "cm_5"], title: "Frontend Architecture", type: "meeting" },
    { id: 6, dayOffset: 1, startHour: 11.5, endHour: 12.5, memberIds: ["cm_1", "cm_3", "cm_4"], title: "All Hands Prep", type: "meeting" },
    { id: 7, dayOffset: 1, startHour: 14, endHour: 15, memberIds: ["cm_3"], title: "Engineering Sync", type: "meeting" },
    { id: 8, dayOffset: 1, startHour: 16, endHour: 17, memberIds: ["cm_1", "cm_5"], title: "1:1 Alex/David", type: "1:1" },

    { id: 9, dayOffset: 2, startHour: 9, endHour: 10.5, memberIds: ["cm_1", "cm_2", "cm_3", "cm_4", "cm_5"], title: "Weekly All-Hands", type: "all-hands" },
    { id: 10, dayOffset: 2, startHour: 11, endHour: 12, memberIds: ["cm_4"], title: "User Interviews", type: "external" },
    { id: 11, dayOffset: 2, startHour: 14.5, endHour: 16, memberIds: ["cm_2", "cm_3"], title: "Sprint Planning", type: "meeting" },

    { id: 12, dayOffset: 3, startHour: 10, endHour: 11, memberIds: ["cm_1", "cm_4"], title: "Product Sync", type: "meeting" },
    { id: 13, dayOffset: 3, startHour: 13, endHour: 15, memberIds: ["cm_5"], title: "Backend Deployment", type: "focus" },
    { id: 14, dayOffset: 3, startHour: 15.5, endHour: 16.5, memberIds: ["cm_2"], title: "Partner Call", type: "external" },

    { id: 15, dayOffset: 4, startHour: 10, endHour: 11.5, memberIds: ["cm_1", "cm_3"], title: "Code Review Core Engine", type: "meeting" },
    { id: 16, dayOffset: 4, startHour: 12, endHour: 13, memberIds: ["cm_4", "cm_5"], title: "UI Audits", type: "meeting" },
    { id: 17, dayOffset: 4, startHour: 14, endHour: 15.5, memberIds: ["cm_2", "cm_1"], title: "End of Week Wrap", type: "1:1" },
]

export function GlobalCalendar() {
    const [selectedDate, setSelectedDate] = React.useState(baseDate)
    const [activeMembers, setActiveMembers] = React.useState<Set<string>>(new Set(TEAM.map(t => t.id)))
    const [hoveredEvent, setHoveredEvent] = React.useState<number | null>(null)

    const currentWeekStart = startOfWeek(selectedDate, { weekStartsOn: 1 })
    const days = Array.from({ length: 5 }).map((_, i) => addDays(currentWeekStart, i))
    const hours = Array.from({ length: 10 }).map((_, i) => i + 8) // 8 AM to 5 PM

    const toggleMember = (id: string) => {
        setActiveMembers(prev => {
            const next = new Set(prev)
            if (next.has(id) && next.size > 1) { // Prevents deselecting everyone
                next.delete(id)
            } else {
                next.add(id)
            }
            return next
        })
    }

    const toggleAll = () => {
        if (activeMembers.size === TEAM.length) {
            setActiveMembers(new Set([TEAM[0].id])) // Only me
        } else {
            setActiveMembers(new Set(TEAM.map(t => t.id)))
        }
    }

    const filteredEvents = MOCK_EVENTS.filter(e => e.memberIds.some(id => activeMembers.has(id)))

    return (
        <div className="flex flex-1 flex-col h-screen overflow-hidden bg-white">
            {/* ── Top Navigation Bar ── */}
            <header className="h-16 shrink-0 border-b border-zinc-100 flex items-center justify-between px-6 bg-white/80 backdrop-blur-xl z-20">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-zinc-900 flex items-center justify-center text-white shadow-sm shadow-zinc-200">
                            <CalendarIcon className="h-4 w-4" />
                        </div>
                        <h1 className="text-lg font-semibold tracking-tight text-zinc-900">Global Timeline</h1>
                    </div>

                    <div className="h-4 w-px bg-zinc-200" />

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setSelectedDate(new Date())}
                            className="px-3 h-8 rounded-md hover:bg-zinc-100 text-sm font-medium transition-colors text-zinc-600"
                        >
                            Today
                        </button>
                        <div className="flex items-center rounded-lg border border-zinc-200 bg-white shadow-sm overflow-hidden">
                            <button
                                onClick={() => setSelectedDate(addDays(selectedDate, -7))}
                                className="h-8 w-8 flex items-center justify-center hover:bg-zinc-50 border-r border-zinc-200 text-zinc-600 transition-colors"
                                aria-label="Previous week"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => setSelectedDate(addDays(selectedDate, 7))}
                                className="h-8 w-8 flex items-center justify-center hover:bg-zinc-50 text-zinc-600 transition-colors"
                                aria-label="Next week"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                        <span className="ml-3 text-sm font-medium text-zinc-800">
                            {format(currentWeekStart, "MMMM yyyy")}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Smart Suggestion UI */}
                    <button className="h-9 px-4 rounded-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium text-sm flex items-center gap-2 transition-colors border border-indigo-100">
                        <Sparkles className="h-3.5 w-3.5" />
                        Find Team Time
                    </button>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                {/* ── Left Sidebar (Team Toggles) ── */}
                <aside className="w-[280px] shrink-0 border-r border-zinc-100 bg-zinc-50/50 flex flex-col pt-6 overflow-y-auto z-10 hidden lg:flex">
                    <div className="px-6 mb-6">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-[11px] font-bold tracking-widest uppercase text-zinc-400">Team Visibility</h2>
                            <button
                                onClick={toggleAll}
                                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700"
                            >
                                {activeMembers.size === TEAM.length ? "Clear All" : "Select All"}
                            </button>
                        </div>
                        <div className="space-y-1">
                            {TEAM.map((member) => (
                                <button
                                    key={member.id}
                                    onClick={() => toggleMember(member.id)}
                                    className={cn(
                                        "w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all border",
                                        activeMembers.has(member.id)
                                            ? "bg-white border-zinc-200 shadow-sm shadow-black/5"
                                            : "bg-transparent border-transparent hover:bg-zinc-100/80 grayscale opacity-60"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={cn("h-6 w-6 rounded-md flex items-center justify-center text-[10px] font-bold text-white shadow-sm", member.tagColor)}>
                                            {member.initials}
                                        </div>
                                        <span className={cn(
                                            "text-sm font-medium",
                                            activeMembers.has(member.id) ? "text-zinc-900" : "text-zinc-500"
                                        )}>{member.name}</span>
                                    </div>
                                    {activeMembers.has(member.id) && (
                                        <div className={cn("h-2.5 w-2.5 rounded-full shadow-inner", member.tagColor)} />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="mt-8 px-6">
                        <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10"><CalendarIcon className="h-16 w-16" /></div>
                            <h3 className="text-sm font-semibold text-indigo-900 mb-1 relative z-10">Aaliyah AI Agent</h3>
                            <p className="text-[12px] text-indigo-700/80 mb-3 relative z-10 leading-relaxed">
                                Aaliyah is analyzing team overlap gaps. 3 potential meeting conflicts detected next week.
                            </p>
                            <button className="text-[12px] font-bold text-indigo-700 hover:text-indigo-900 transition-colors flex items-center gap-1">
                                View Insights <ArrowRight className="h-3 w-3" />
                            </button>
                        </div>
                    </div>
                </aside>

                {/* ── Main Global Calendar View ── */}
                <main className="flex-1 overflow-auto bg-white relative">
                    <div className="min-w-[800px] h-full flex flex-col">

                        {/* Header / Day Columns */}
                        <div className="flex border-b border-zinc-100 sticky top-0 bg-white/95 backdrop-blur-sm z-30">
                            <div className="w-[80px] shrink-0 border-r border-zinc-100" /> {/* Time gutter spacer */}
                            {days.map((day, i) => {
                                const isToday = isSameDay(day, new Date())
                                return (
                                    <div key={i} className="flex-1 min-w-[150px] border-r border-zinc-100 py-4 flex flex-col items-center justify-center">
                                        <span className={cn(
                                            "text-xs font-semibold uppercase tracking-widest mb-1",
                                            isToday ? "text-indigo-600" : "text-zinc-400"
                                        )}>
                                            {format(day, "EEE")}
                                        </span>
                                        <span className={cn(
                                            "h-9 w-9 flex items-center justify-center rounded-full text-lg font-medium tracking-tight",
                                            isToday ? "bg-indigo-600 text-white shadow-md shadow-indigo-200" : "text-zinc-900"
                                        )}>
                                            {format(day, "d")}
                                        </span>
                                    </div>
                                )
                            })}
                        </div>

                        {/* Grid Body */}
                        <div className="relative flex flex-1">
                            {/* Time Gutter */}
                            <div className="w-[80px] shrink-0 border-r border-zinc-100 flex flex-col sticky left-0 bg-white z-20">
                                {hours.map((hour) => (
                                    <div key={hour} className="h-[80px] relative">
                                        <span className="absolute -top-2.5 right-4 text-[11px] font-medium text-zinc-400">
                                            {hour === 12 ? "12 PM" : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* Days Columns & Events Wrapper */}
                            <div className="relative flex-1 flex bg-[linear-gradient(to_bottom,transparent_0px,transparent_79px,#f4f4f5_79px,#f4f4f5_80px)] bg-[length:100%_80px]">

                                {/* Horizontal lines are drawn by background gradient, vertical lines by day borders */}
                                {days.map((day, dIdx) => (
                                    <div key={dIdx} className="flex-1 relative border-r border-zinc-100 min-w-[150px]">

                                        {/* Render Events for this day */}
                                        <AnimatePresence>
                                            {filteredEvents.filter(e => e.dayOffset === dIdx).map((event) => {
                                                // Math for rendering: 1 hour = 80px. Start is 8AM.
                                                const top = (event.startHour - 8) * 80
                                                const height = (event.endHour - event.startHour) * 80

                                                // Determine Primary Owner's Color for the Box
                                                const ownerId = event.memberIds.find(id => activeMembers.has(id)) || event.memberIds[0]
                                                const ownerObj = TEAM.find(t => t.id === ownerId) || TEAM[0]

                                                const isHovered = hoveredEvent === event.id

                                                return (
                                                    <motion.div
                                                        layout
                                                        initial={{ opacity: 0, scale: 0.95 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        exit={{ opacity: 0, scale: 0.95 }}
                                                        key={event.id}
                                                        onMouseEnter={() => setHoveredEvent(event.id)}
                                                        onMouseLeave={() => setHoveredEvent(null)}
                                                        className={cn(
                                                            "absolute left-1.5 right-1.5 rounded-xl border p-2.5 shadow-sm transition-all duration-200 z-10 cursor-pointer overflow-hidden backdrop-blur-sm",
                                                            ownerObj.color,
                                                            isHovered ? "ring-2 ring-black/5 shadow-md z-20" : ""
                                                        )}
                                                        style={{ top: `${top}px`, height: `${height}px` }}
                                                    >
                                                        <div className="font-semibold text-sm leading-tight mb-1 truncate">{event.title}</div>
                                                        <div className="text-[11px] opacity-80 flex items-center gap-1.5">
                                                            {event.startHour % 1 === 0 ? event.startHour : `${Math.floor(event.startHour)}:30`} - {event.endHour % 1 === 0 ? event.endHour : `${Math.floor(event.endHour)}:30`}
                                                        </div>

                                                        {/* Multiple Attendees Bubbles */}
                                                        {height > 60 && event.memberIds.length > 1 && (
                                                            <div className="absolute bottom-2 left-2.5 flex -space-x-1.5">
                                                                {event.memberIds.filter(id => activeMembers.has(id)).map(id => {
                                                                    const m = TEAM.find(t => t.id === id)
                                                                    if (!m) return null
                                                                    return (
                                                                        <div key={id} className={cn("h-5 w-5 rounded-full border-2 border-white flex items-center justify-center text-[8px] font-bold text-white shadow-sm", m.tagColor)}>
                                                                            {m.initials}
                                                                        </div>
                                                                    )
                                                                })}
                                                            </div>
                                                        )}

                                                        {/* Icon for type */}
                                                        {height > 70 && (
                                                            <div className="absolute bottom-2 right-2.5 opacity-40">
                                                                {event.type === 'meeting' ? <Video className="h-4 w-4" /> :
                                                                    event.type === 'focus' ? <Clock className="h-4 w-4" /> :
                                                                        event.type === 'all-hands' ? <Users className="h-4 w-4" /> :
                                                                            <Layers className="h-4 w-4" />}
                                                            </div>
                                                        )}

                                                    </motion.div>
                                                )
                                            })}
                                        </AnimatePresence>

                                    </div>
                                ))}
                            </div>

                            {/* Current Time Indicator (Static mock roughly at 11:30 AM) */}
                            <div className="absolute left-[80px] right-0 h-px bg-red-400 z-40 pointer-events-none" style={{ top: `${(11.5 - 8) * 80}px` }}>
                                <div className="absolute -left-1.5 -top-1.5 h-3 w-3 rounded-full bg-red-500 shadow-sm shadow-red-200" />
                            </div>

                        </div>
                    </div>
                </main>
            </div>
        </div>
    )
}
