"use client"

import * as React from "react"
import { ShieldCheck, ShieldAlert, ShieldTriangle, ArrowRight } from "lucide-react"
import { CardShell } from "@/components/aaliyah/workspace/feed/CardShell"
import { cn } from "@/lib/utils"

export function HealthReportCard({ health }: { health: any }) {
    if (!health) return null

    const isHealthy = health.status === "healthy"
    const isWarning = health.status === "warning"

    return (
        <CardShell
            headerIcon={isHealthy ? ShieldCheck : isWarning ? ShieldTriangle : ShieldAlert}
            headerLabel="System Integrity Report"
            headerColorClass={isHealthy ? "text-emerald-500" : isWarning ? "text-amber-500" : "text-rose-500"}
        >
            <div className="flex flex-col gap-6">
                <div>
                    <h3 className="text-[18px] font-bold text-zinc-900 dark:text-zinc-100 mb-2">{health.title || "Core Health Status"}</h3>
                    <p className="text-[14px] text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed">
                        {health.description || "The current operational state of your connected intelligence graph."}
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {health.metrics?.map((metric: any, idx: number) => (
                        <div key={idx} className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50">
                            <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-1">{metric.label}</div>
                            <div className="flex items-baseline gap-2">
                                <div className="text-[16px] font-black text-zinc-900 dark:text-zinc-100">{metric.value}</div>
                                {metric.change && (
                                    <div className={cn("text-[10px] font-bold", metric.trend === "up" ? "text-emerald-500" : "text-rose-500")}>
                                        {metric.trend === "up" ? "+" : "-"}{metric.change}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {health.action && (
                    <button className="flex items-center justify-between w-full p-4 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:scale-[1.01] transition-all shadow-lg active:scale-[0.99]">
                        <span className="text-[13px] font-bold uppercase tracking-widest">{health.action.label}</span>
                        <ArrowRight className="h-4 w-4" />
                    </button>
                )}
            </div>
        </CardShell>
    )
}
