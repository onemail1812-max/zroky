"use client"

import * as React from "react"
import { AlertCircle, CheckCircle2, Edit, X } from "lucide-react"
import { CardShell } from "@/components/aaliyah/workspace/feed/CardShell"

export function ApprovalCard({
    title,
    detail,
    onApprove,
    onEdit,
    onReject,
}: {
    title: string
    detail: string
    onApprove: () => void
    onEdit: () => void
    onReject: () => void
}) {
    return (
        <CardShell
            headerIcon={AlertCircle}
            headerLabel="Executive Approval Required"
            headerColorClass="text-amber-500"
            className="bg-amber-50/30 dark:bg-amber-500/5 border-amber-200/50 dark:border-amber-500/20"
        >
            <h3 className="mt-1 text-[18px] font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">{title}</h3>
            <p className="mt-3 text-[14.5px] text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-2xl font-medium">{detail}</p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
                <button
                    onClick={onApprove}
                    className="flex items-center gap-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-6 py-2.5 rounded-full font-bold text-[13px] hover:scale-105 transition-transform shadow-lg shadow-zinc-900/20"
                >
                    <CheckCircle2 className="h-4 w-4" /> Approve & Execute
                </button>
                <button
                    onClick={onEdit}
                    className="flex items-center gap-2 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 px-5 py-2.5 rounded-full font-bold text-[13px] hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors shadow-sm"
                >
                    <Edit className="h-4 w-4" /> Adjust Parameters
                </button>
                <button
                    onClick={onReject}
                    className="flex items-center gap-2 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 px-4 py-2.5 rounded-full font-bold text-[13px] transition-colors ml-auto"
                >
                    <X className="h-4 w-4" /> Discard
                </button>
            </div>
        </CardShell>
    )
}
