"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Sparkles, Video, Clock, Users, ArrowRight, Layers, Loader2 } from "lucide-react"
import { format, addDays, startOfWeek, isSameDay, startOfDay, differenceInHours, parseISO, getDay } from "date-fns"
import { cn } from "@/lib/utils"
import { aaliyahApi } from "@/lib/aaliyah/api"

// ── Types ──────────────────────────────────────────────────────────────

interface CalendarEvent {
    id: string
    title: string
    start_at: string
    end_at: string
    organizer?: string
    meeting_prep?: any
    is_conflict?: boolean
}

interface MappedEvent {
    id: string
    dayOffset: number
    startHour: number
    endHour: number
    title: string
    organizer: string
    type: string
}

// Color palette for events (cycles based on event index)
const EVENT_COLORS = [
    { bg: "bg-indigo-50 border-indigo-200 text-indigo-900", tag: "bg-indigo-500" },
    { bg: "bg-orange-50 border-orange-200 text-orange-900", tag: "bg-orange-500" },
    { bg: "bg-emerald-50 border-emerald-200 text-emerald-900", tag: "bg-emerald-500" },
    { bg: "bg-blue-50 border-blue-200 text-blue-900", tag: "bg-blue-500" },
    { bg: "bg-purple-50 border-purple-200 text-purple-900", tag: "bg-purple-500" },
    { bg: "bg-rose-50 border-rose-200 text-rose-900", tag: "bg-rose-500" },
    { bg: "bg-amber-50 border-amber-200 text-amber-900", tag: "bg-amber-500" },
    { bg: "bg-cyan-50 border-cyan-200 text-cyan-900", tag: "bg-cyan-500" },
]

function guessEventType(title: string): string {
    const lower = title.toLowerCase()
    if (lower.includes("1:1") || lower.includes("1-on-1") || lower.includes("one-on-one")) return "1:1"
    if (lower.includes("all-hands") || lower.includes("all hands") || lower.includes("town hall")) return "all-hands"
    if (lower.includes("focus") || lower.includes("deep work") || lower.includes("block")) return "focus"
    if (lower.includes("external") || lower.includes("client") || lower.includes("partner") || lower.includes("interview")) return "external"
    return "meeting"
}

function mapEventsToWeek(events: CalendarEvent[], weekStart: Date): MappedEvent[] {
    return events
        .map((e) => {
            const start = parseISO(e.start_at)
            const end = parseISO(e.end_at)

            // Calculate day offset from Monday (0-4 for Mon-Fri)
            const dayOfWeek = getDay(start) // 0=Sun, 1=Mon, ..., 6=Sat
            const dayOffset = dayOfWeek === 0 ? -1 : dayOfWeek - 1 // Mon=0, Tue=1, ..., Fri=4, Sun=-1

            // Only include Mon-Fri
            if (dayOffset < 0 || dayOffset > 4) return null

            // Check event falls within the displayed week
            const eventWeekStart = startOfWeek(start, { weekStartsOn: 1 })
            if (!isSameDay(eventWeekStart, weekStart)) return null

            const startHour = start.getHours() + start.getMinutes() / 60
            const endHour = end.getHours() + end.getMinutes() / 60

            // Only include events within the visible grid (8 AM - 6 PM)
            if (endHour <= 8 || startHour >= 18) return null

            return {
                id: e.id,
                dayOffset,
                startHour: Math.max(startHour, 8),
                endHour: Math.min(endHour, 18),
                title: e.title,
                organizer: e.organizer || "You",
                type: guessEventType(e.title),
            }
        })
        .filter(Boolean) as MappedEvent[]
}

export function GlobalCalendar() {
    const [selectedDate, setSelectedDate] = React.useState(startOfDay(new Date()))
    const [hoveredEvent, setHoveredEvent] = React.useState<string | null>(null)
    const [events, setEvents] = React.useState<CalendarEvent[]>([])
    const [loading, setLoading] = React.useState(true)
    const [error, setError] = React.useState<string | null>(null)
    const [nowHour, setNowHour] = React.useState(() => {
        const n = new Date(); return n.getHours() + n.getMinutes() / 60
    })

    const currentWeekStart = startOfWeek(selectedDate, { weekStartsOn: 1 })
    const days = Array.from({ length: 5 }).map((_, i) => addDays(currentWeekStart, i))
    const hours = Array.from({ length: 10 }).map((_, i) => i + 8) // 8 AM to 5 PM

    // Fetch calendar events for the visible week
    React.useEffect(() => {
        let cancelled = false
        async function fetchEvents() {
            setLoading(true)
            setError(null)
            try {
                // Calculate lookahead from now to cover the full visible week
                const weekEnd = addDays(currentWeekStart, 5) // Friday end
                const now = new Date()
                const hoursToFetch = Math.max(differenceInHours(weekEnd, now), 24)

                const response = await aaliyahApi.get("/calendar/upcoming", {
                    params: { limit: 50, lookahead_hours: Math.min(hoursToFetch, 168) }
                })
                if (!cancelled) {
                    setEvents(response.data?.items || [])
                }
            } catch (err) {
                if (!cancelled) {
                    console.warn("GlobalCalendar: Failed to fetch events", err)
                    setError("Could not load calendar events")
                    setEvents([])
                }
            } finally {
                if (!cancelled) setLoading(false)
            }
        }
        fetchEvents()
        return () => { cancelled = true }
    }, [currentWeekStart.toISOString()])

    // Update current time indicator every 60 seconds
    React.useEffect(() => {
        const timer = setInterval(() => {
            const n = new Date(); setNowHour(n.getHours() + n.getMinutes() / 60)
        }, 60_000)
        return () => clearInterval(timer)
    }, [])

    const mappedEvents = React.useMemo(
        () => mapEventsToWeek(events, currentWeekStart),
        [events, currentWeekStart.toISOString()]
    )

    return (
        <div className="flex flex-1 flex-col h-screen overflow-hidden bg-white">
            {/* ── Top Navigation Bar ── */}
            <header className="h-16 shrink-0 border-b border-zinc-100 flex items-center justify-between px-6 bg-white/80 backdrop-blur-xl z-20">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-zinc-900 flex items-center justify-center text-white shadow-sm shadow-zinc-200">
                            <CalendarIcon className="h-4 w-4" />
                        </div>
                        <h1 className="text-lg font-semibold tracking-tight text-zinc-900">Calendar</h1>
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
                    <span className="text-xs text-zinc-400 font-medium">
                        {mappedEvents.length} event{mappedEvents.length !== 1 ? "s" : ""} this week
                    </span>
                </div>
            </header>

            {/* ── Main Calendar Grid ── */}
            <main className="flex-1 overflow-auto bg-white relative">
                <div className="min-w-[800px] h-full flex flex-col">

                    {/* Header / Day Columns */}
                    <div className="flex border-b border-zinc-100 sticky top-0 bg-white/95 backdrop-blur-sm z-30">
                        <div className="w-[80px] shrink-0 border-r border-zinc-100" />
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

                    {/* Loading / Error / Empty States */}
                    {loading && (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="h-5 w-5 animate-spin text-zinc-400 mr-2" />
                            <span className="text-sm text-zinc-400 font-medium">Loading calendar...</span>
                        </div>
                    )}

                    {!loading && error && (
                        <div className="flex flex-col items-center justify-center py-20">
                            <CalendarIcon className="h-8 w-8 text-zinc-300 mb-3" />
                            <p className="text-sm text-zinc-500 font-medium">{error}</p>
                            <p className="text-xs text-zinc-400 mt-1">Connect your Google or Outlook calendar to see events here.</p>
                        </div>
                    )}

                    {!loading && !error && mappedEvents.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20">
                            <CalendarIcon className="h-8 w-8 text-zinc-300 mb-3" />
                            <p className="text-sm text-zinc-500 font-medium">No events this week</p>
                            <p className="text-xs text-zinc-400 mt-1">Your calendar is clear. Enjoy!</p>
                        </div>
                    )}

                    {/* Grid Body */}
                    {!loading && mappedEvents.length > 0 && (
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

                            {/* Days Columns & Events */}
                            <div className="relative flex-1 flex bg-[linear-gradient(to_bottom,transparent_0px,transparent_79px,#f4f4f5_79px,#f4f4f5_80px)] bg-[length:100%_80px]">
                                {days.map((day, dIdx) => (
                                    <div key={dIdx} className="flex-1 relative border-r border-zinc-100 min-w-[150px]">
                                        <AnimatePresence>
                                            {mappedEvents.filter(e => e.dayOffset === dIdx).map((event, eIdx) => {
                                                const top = (event.startHour - 8) * 80
                                                const height = Math.max((event.endHour - event.startHour) * 80, 30)
                                                const colorSet = EVENT_COLORS[eIdx % EVENT_COLORS.length]
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
                                                            colorSet.bg,
                                                            isHovered ? "ring-2 ring-black/5 shadow-md z-20" : ""
                                                        )}
                                                        style={{ top: `${top}px`, height: `${height}px` }}
                                                    >
                                                        <div className="font-semibold text-sm leading-tight mb-1 truncate">{event.title}</div>
                                                        <div className="text-[11px] opacity-80 flex items-center gap-1.5">
                                                            {formatHour(event.startHour)} – {formatHour(event.endHour)}
                                                        </div>

                                                        {height > 60 && event.organizer && (
                                                            <div className="text-[10px] mt-1 opacity-60 truncate">
                                                                {event.organizer}
                                                            </div>
                                                        )}

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

                            {/* Current Time Indicator */}
                            {nowHour >= 8 && nowHour <= 18 && isSameDay(currentWeekStart, startOfWeek(new Date(), { weekStartsOn: 1 })) && (
                                <div className="absolute left-[80px] right-0 h-px bg-red-400 z-40 pointer-events-none" style={{ top: `${(nowHour - 8) * 80}px` }}>
                                    <div className="absolute -left-1.5 -top-1.5 h-3 w-3 rounded-full bg-red-500 shadow-sm shadow-red-200" />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}

function formatHour(h: number): string {
    const hour = Math.floor(h)
    const min = Math.round((h - hour) * 60)
    const suffix = hour >= 12 ? "PM" : "AM"
    const display = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    return min > 0 ? `${display}:${min.toString().padStart(2, "0")} ${suffix}` : `${display} ${suffix}`
}
