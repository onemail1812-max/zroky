"use client"

import * as React from "react"
import { motion, Variants } from "framer-motion"
import { Check, CalendarRange, FileText } from "lucide-react"
import { CardShell } from "@/components/aaliyah/workspace/feed/CardShell"

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 30, scale: 0.96, filter: "blur(4px)" },
    visible: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)", transition: { type: "spring", stiffness: 300, damping: 24 } }
}

export function ExecutionReceipt({ text, timestamp }: { text: string; timestamp: string }) {
    return (
        <motion.div variants={itemVariants} className="flex justify-center w-full my-2">
            <div className="flex items-center gap-3 bg-white/60 dark:bg-zinc-950/60 backdrop-blur border border-zinc-200/50 dark:border-zinc-800/50 pl-2 pr-4 py-1.5 rounded-full shadow-sm">
                <div className="h-6 w-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                </div>
                <div className="text-[12px] font-bold text-zinc-800 dark:text-zinc-200">{text}</div>
                <div className="w-[1px] h-3 bg-zinc-300 dark:bg-zinc-700 mx-1" />
                <div className="text-[10px] text-zinc-400 font-semibold tabular-nums tracking-wider">{timestamp}</div>
            </div>
        </motion.div>
    )
}

export function CalendarDiffArtifact({ title, items }: { title: string; items: Array<{ time: string; update: string }> }) {
    return (
        <CardShell headerIcon={CalendarRange} headerLabel="Calendar Mutation" headerColorClass="text-rose-500">
            <h3 className="text-[18px] font-bold text-zinc-900 dark:text-zinc-100 mb-5">{title}</h3>
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 overflow-hidden divide-y divide-zinc-200 dark:divide-zinc-800">
                {items.map((entry) => (
                    <div key={entry.time} className="flex gap-4 px-5 py-4 text-[14px]">
                        <span className="text-rose-500 tabular-nums font-black tracking-wider w-16 shrink-0">{entry.time}</span>
                        <span className="text-zinc-700 dark:text-zinc-300 font-medium">{entry.update}</span>
                    </div>
                ))}
            </div>
        </CardShell>
    )
}

export function MiniScheduleGridArtifact({
    title,
    slots,
}: {
    title: string
    slots: Array<{ slot: string; monday: string; tuesday: string; wednesday: string }>
}) {
    return (
        <CardShell headerIcon={FileText} headerLabel="Matrix Analysis" headerColorClass="text-emerald-500">
            <h3 className="text-[18px] font-bold text-zinc-900 dark:text-zinc-100 mb-5">{title}</h3>
            <div className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800">
                <div className="grid grid-cols-4 bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-5 py-3 text-[11px] font-black tracking-widest text-zinc-500 uppercase">
                    <span>Slot</span>
                    <span>Mon</span>
                    <span>Tue</span>
                    <span>Wed</span>
                </div>
                <div className="divide-y divide-zinc-200/50 dark:divide-zinc-800/50 bg-white/50 dark:bg-zinc-950/50">
                    {slots.map((entry) => (
                        <div key={entry.slot} className="grid grid-cols-4 px-5 py-4 text-[13px] text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors font-medium">
                            <span className="tabular-nums font-bold text-zinc-500">{entry.slot}</span>
                            <span className="truncate pr-2">{entry.monday}</span>
                            <span className="truncate pr-2">{entry.tuesday}</span>
                            <span className="truncate">{entry.wednesday}</span>
                        </div>
                    ))}
                </div>
            </div>
        </CardShell>
    )
}
