"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { CalendarRange, CheckCircle2, Check, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { CalendarWidget } from "@/components/aaliyah/workspace/feed/CalendarWidget"
import { confirmBooking } from "@/lib/aaliyah/api"
import type { BookingSlot } from "@/lib/aaliyah/api"

export function MeetingActionCard({
    bookingSlug,
    subject,
    proposedSlots,
}: {
    bookingSlug: string
    subject: string
    proposedSlots: BookingSlot[]
}) {
    const [confirmedSlot, setConfirmedSlot] = React.useState<BookingSlot | null>(null)
    const [loading, setLoading] = React.useState<string | null>(null)
    const [error, setError] = React.useState<string | null>(null)
    const [showCalendar, setShowCalendar] = React.useState(false)

    const handleBook = async (slot: BookingSlot) => {
        setLoading(slot.start)
        setError(null)
        try {
            await confirmBooking(bookingSlug, slot)
            setConfirmedSlot(slot)
        } catch (e: any) {
            setError(e.message || "Booking failed")
        } finally {
            setLoading(null)
        }
    }

    const formatSlot = (slot: BookingSlot) => {
        try {
            const d = new Date(slot.start)
            return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) +
                ", " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
        } catch {
            return slot.label || slot.start
        }
    }

    if (confirmedSlot) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-xl w-full mx-auto"
            >
                <div className="rounded-2xl border border-emerald-200/60 bg-emerald-50/50 p-6">
                    <div className="flex items-center gap-2.5 mb-3">
                        <div className="h-8 w-8 rounded-xl bg-emerald-100 flex items-center justify-center">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" strokeWidth={2.5} />
                        </div>
                        <span className="text-[10px] font-bold tracking-[0.2em] text-emerald-600 uppercase">Meeting Booked</span>
                    </div>
                    <div className="text-[14px] font-semibold text-zinc-800 mb-2">{subject}</div>
                    <div className="flex items-center gap-2 text-emerald-600">
                        <Check className="h-4 w-4" />
                        <span className="text-[13px] font-medium">Confirmed: {formatSlot(confirmedSlot)}</span>
                    </div>
                </div>
            </motion.div>
        )
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-xl w-full mx-auto"
        >
            <div className="rounded-2xl border border-blue-200/60 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-xl bg-blue-100 flex items-center justify-center">
                            <CalendarRange className="h-4 w-4 text-blue-600" strokeWidth={2.5} />
                        </div>
                        <span className="text-[10px] font-bold tracking-[0.2em] text-blue-600 uppercase">Meeting Request</span>
                    </div>
                    <button
                        onClick={() => setShowCalendar(!showCalendar)}
                        className="text-[11px] font-bold text-zinc-400 hover:text-blue-600 transition-colors uppercase tracking-widest"
                    >
                        {showCalendar ? "Show Suggestions" : "Manual Override"}
                    </button>
                </div>

                <div className="text-[14px] font-semibold text-zinc-800 mb-1">{subject}</div>

                <AnimatePresence mode="wait">
                    {showCalendar ? (
                        <div className="mt-4">
                            <CalendarWidget
                                slots={proposedSlots}
                                onSelectSlots={(slots) => {
                                    if (slots.length > 0) handleBook(slots[0])
                                }}
                            />
                        </div>
                    ) : (
                        <div className="mt-4">
                            <p className="text-[12px] text-zinc-500 mb-4">Tap a suggested slot to book instantly:</p>
                            <div className="flex flex-wrap gap-2">
                                {proposedSlots.slice(0, 5).map((slot) => (
                                    <button
                                        key={slot.start}
                                        onClick={() => handleBook(slot)}
                                        disabled={loading !== null}
                                        className={cn(
                                            "inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all",
                                            "bg-blue-50 text-blue-700 border border-blue-200/60 hover:bg-blue-100 hover:border-blue-300",
                                            "disabled:opacity-50 disabled:cursor-not-allowed",
                                            loading === slot.start && "animate-pulse"
                                        )}
                                    >
                                        <CalendarRange className="h-3.5 w-3.5" />
                                        {formatSlot(slot)}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </AnimatePresence>

                {error && (
                    <div className="flex items-center gap-2 text-rose-600 text-[12px] mt-3">
                        <AlertCircle className="h-3.5 w-3.5" />
                        {error}
                    </div>
                )}
            </div>
        </motion.div>
    )
}
