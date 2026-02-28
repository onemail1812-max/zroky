"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Calendar, Clock, Check, ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { cn } from "@/lib/utils"

interface TimeSlot {
    start: string
    end?: string
    duration_minutes?: number
}

interface CalendarWidgetProps {
    slots: TimeSlot[]
    onSelectSlots?: (slots: TimeSlot[]) => void
    onInsertToDraft?: (text: string) => void
    loading?: boolean
}

export function CalendarWidget({ slots, onSelectSlots, onInsertToDraft, loading }: CalendarWidgetProps) {
    const [selectedSlots, setSelectedSlots] = React.useState<Set<number>>(new Set())
    const [manualDate, setManualDate] = React.useState("")
    const [manualTime, setManualTime] = React.useState("")
    const [extraSlots, setExtraSlots] = React.useState<TimeSlot[]>([])

    // Combined slots (suggested + manual)
    const allSlots = React.useMemo(() => [...slots, ...extraSlots], [slots, extraSlots])

    const toggleSlot = (index: number) => {
        setSelectedSlots(prev => {
            const next = new Set(prev)
            if (next.has(index)) next.delete(index)
            else next.add(index)
            return next
        })
    }

    const handleAddManual = () => {
        if (!manualDate || !manualTime) return

        try {
            const start = new Date(`${manualDate}T${manualTime}`)
            const end = new Date(start.getTime() + 30 * 60000) // Default 30 min

            const newSlot: TimeSlot = {
                start: start.toISOString(),
                end: end.toISOString(),
                duration_minutes: 30
            }

            const newIndex = allSlots.length
            setExtraSlots(prev => [...prev, newSlot])
            setSelectedSlots(prev => new Set(prev).add(newIndex))

            setManualTime("")
        } catch (e) {
            console.error("Invalid date/time", e)
        }
    }

    const handleInsert = () => {
        const chosen = Array.from(selectedSlots).map(i => allSlots[i])
        if (chosen.length === 0) return

        const text = chosen.map(s => {
            const start = new Date(s.start)
            // PREVENT CRASH: Fallback to 30 mins if end is missing
            const end = s.end ? new Date(s.end) : new Date(start.getTime() + (s.duration_minutes || 30) * 60000)
            const day = start.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })
            const timeStart = start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
            const timeEnd = end.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
            return `${day}, ${timeStart} – ${timeEnd}`
        }).join("\n")

        const insertText = `\n\nHere are some times that work for me:\n${text}\n\nPlease let me know which slot works best.`
        onInsertToDraft?.(insertText)
        onSelectSlots?.(chosen)
    }

    // Group slots by day
    const groupedSlots: Record<string, { slot: TimeSlot, index: number }[]> = {}
    allSlots.forEach((slot, index) => {
        const day = new Date(slot.start).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
        if (!groupedSlots[day]) groupedSlots[day] = []
        groupedSlots[day].push({ slot, index })
    })

    if (loading) {
        return (
            <div className="border border-blue-100 bg-blue-50/30 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                    <Calendar className="h-4 w-4 text-blue-500" />
                    <span className="text-[12px] font-bold text-blue-700">Checking availability...</span>
                </div>
                <div className="space-y-2">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-8 bg-blue-100/50 rounded-lg animate-pulse" />
                    ))}
                </div>
            </div>
        )
    }

    return (
        <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border border-blue-100 bg-blue-50/30 rounded-xl overflow-hidden"
        >
            {/* Header */}
            <div className="px-4 py-3 flex items-center justify-between border-b border-blue-100">
                <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <span className="text-[12px] font-bold text-blue-800">Select Meeting Times</span>
                </div>
                <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">
                    {selectedSlots.size} selected
                </span>
            </div>

            {/* Slots grouped by day */}
            {allSlots.length > 0 && (
                <div className="px-4 py-3 space-y-3 max-h-[200px] overflow-y-auto border-b border-blue-50">
                    {Object.entries(groupedSlots).map(([day, daySlots]) => (
                        <div key={day}>
                            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1.5">{day}</p>
                            <div className="flex flex-wrap gap-1.5">
                                {daySlots.map(({ slot, index }) => {
                                    const isSelected = selectedSlots.has(index)
                                    const start = new Date(slot.start)
                                    const time = start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })

                                    return (
                                        <button
                                            key={index}
                                            onClick={() => toggleSlot(index)}
                                            className={cn(
                                                "px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all border",
                                                isSelected
                                                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                                                    : "bg-white text-blue-700 border-blue-200 hover:border-blue-400 hover:bg-blue-50"
                                            )}
                                        >
                                            <Clock className="h-3 w-3 inline mr-1 -mt-0.5" />
                                            {time}
                                            {isSelected && <Check className="h-3 w-3 inline ml-1 -mt-0.5" />}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Manual Entry */}
            <div className="px-4 py-3 bg-white/50 border-b border-blue-100">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Manual Override</p>
                <div className="flex items-center gap-2">
                    <input
                        type="date"
                        value={manualDate}
                        onChange={e => setManualDate(e.target.value)}
                        className="flex-1 bg-white border border-zinc-200 rounded-lg px-2 py-1.5 text-[12px] font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <input
                        type="time"
                        value={manualTime}
                        onChange={e => setManualTime(e.target.value)}
                        className="w-24 bg-white border border-zinc-200 rounded-lg px-2 py-1.5 text-[12px] font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                        onClick={handleAddManual}
                        disabled={!manualDate || !manualTime}
                        className="h-8 w-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center hover:bg-blue-100 disabled:opacity-40 transition-colors"
                    >
                        <Plus className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Insert Button */}
            <div className="px-4 py-3 border-t border-blue-100 bg-blue-50/50">
                <button
                    onClick={handleInsert}
                    disabled={selectedSlots.size === 0}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white text-[12px] font-bold rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md active:scale-[0.98]"
                >
                    <Plus className="h-3.5 w-3.5" />
                    Confirm {selectedSlots.size > 0 ? `${selectedSlots.size} Slot${selectedSlots.size > 1 ? "s" : ""}` : "Selection"}
                </button>
            </div>
        </motion.div>
    )
}
