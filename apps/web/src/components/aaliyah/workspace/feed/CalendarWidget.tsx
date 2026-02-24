"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Calendar, Clock, Check, ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { cn } from "@/lib/utils"

interface TimeSlot {
    start: string
    end: string
    duration_minutes: number
}

interface CalendarWidgetProps {
    slots: TimeSlot[]
    onSelectSlots?: (slots: TimeSlot[]) => void
    onInsertToDraft?: (text: string) => void
    loading?: boolean
}

export function CalendarWidget({ slots, onSelectSlots, onInsertToDraft, loading }: CalendarWidgetProps) {
    const [selectedSlots, setSelectedSlots] = React.useState<Set<number>>(new Set())

    const toggleSlot = (index: number) => {
        setSelectedSlots(prev => {
            const next = new Set(prev)
            if (next.has(index)) next.delete(index)
            else next.add(index)
            return next
        })
    }

    const handleInsert = () => {
        const chosen = Array.from(selectedSlots).map(i => slots[i])
        if (chosen.length === 0) return

        const text = chosen.map(s => {
            const start = new Date(s.start)
            const end = new Date(s.end)
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
    slots.forEach((slot, index) => {
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

    if (slots.length === 0) return null

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
                    <span className="text-[12px] font-bold text-blue-800">Available Slots</span>
                </div>
                <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">
                    {selectedSlots.size} selected
                </span>
            </div>

            {/* Slots grouped by day */}
            <div className="px-4 py-3 space-y-3 max-h-[240px] overflow-y-auto">
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

            {/* Insert Button */}
            <div className="px-4 py-3 border-t border-blue-100 bg-blue-50/50">
                <button
                    onClick={handleInsert}
                    disabled={selectedSlots.size === 0}
                    className="w-full flex items-center justify-center gap-2 py-2 bg-blue-600 text-white text-[12px] font-bold rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                    <Plus className="h-3.5 w-3.5" />
                    Insert {selectedSlots.size > 0 ? `${selectedSlots.size} Slot${selectedSlots.size > 1 ? "s" : ""}` : "Times"} into Draft
                </button>
            </div>
        </motion.div>
    )
}
