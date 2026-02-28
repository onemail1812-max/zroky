"use client"

import * as React from "react"
import { motion, Variants } from "framer-motion"
import { Sparkles, CheckCircle2, Edit, X } from "lucide-react"
import { Button } from "@/components/aaliyah/ui/Button"
import { CardShell } from "@/components/aaliyah/workspace/feed/CardShell"

export type CardAction = {
    label: string
    type: "link" | "callback" | "snooze" | "approve" | "pay" | "open"
    icon?: string
    payload?: any
    primary?: boolean
}

export function ActionsRow({
    actions,
    onAction,
}: {
    actions?: CardAction[]
    onAction?: (action: CardAction) => void
}) {
    if (!actions || actions.length === 0) return null

    return (
        <div className="mt-5 flex flex-wrap gap-2.5">
            {actions.map((action, idx) => {
                const isPrimary = action.primary || action.type === "approve" || action.type === "pay"

                return (
                    <Button
                        key={idx}
                        variant={isPrimary ? "default" : "outline"}
                        size="sm"
                        className="h-9 px-5 rounded-xl text-[13px] font-bold shadow-sm active:scale-95 transition-all"
                        onClick={() => onAction?.(action)}
                    >
                        {action.icon && <span className="mr-2">{action.icon}</span>}
                        {action.label}
                    </Button>
                )
            })}
        </div>
    )
}

export function ProposalCard({
    title,
    bullets,
    onAnalyze,
    onViewSources,
}: {
    title: string
    bullets: string[]
    onAnalyze: () => void
    onViewSources: () => void
}) {
    return (
        <CardShell headerIcon={Sparkles} headerLabel="AI Proposal" headerColorClass="text-indigo-500">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-5">
                <h3 className="text-[18px] font-bold text-zinc-900 dark:text-zinc-100 leading-snug">{title}</h3>
                <div className="flex items-center gap-2 shrink-0">
                    <Button variant="outline" size="sm" onClick={onAnalyze} className="h-8 rounded-full text-xs font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800">
                        Analyze Deeply
                    </Button>
                    <Button variant="outline" size="sm" onClick={onViewSources} className="h-8 rounded-full text-xs font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800">
                        View Material
                    </Button>
                </div>
            </div>

            <ul className="space-y-3">
                {bullets.map((item, i) => (
                    <li key={i} className="flex gap-3.5 text-[14px] text-zinc-600 dark:text-zinc-300 leading-relaxed font-medium">
                        <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500/50 shadow-[0_0_6px_rgba(99,102,241,0.5)]" aria-hidden="true" />
                        <span className="flex-1">{item}</span>
                    </li>
                ))}
            </ul>
        </CardShell>
    )
}
