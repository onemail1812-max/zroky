
"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface ToggleCardProps extends React.HTMLAttributes<HTMLDivElement> {
    checked?: boolean
    onCheckedChange?: (checked: boolean) => void
    title: string
    description?: string
    icon?: React.ReactNode
}

export function ToggleCard({
    checked,
    onCheckedChange,
    title,
    description,
    icon,
    className,
    ...props
}: ToggleCardProps) {
    return (
        <div
            role="switch"
            aria-checked={checked}
            tabIndex={0}
            onClick={() => onCheckedChange?.(!checked)}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onCheckedChange?.(!checked);
                }
            }}
            className={cn(
                "cursor-pointer group relative flex items-start gap-5 rounded-2xl border p-6 transition-all duration-300 ease-out outline-none focus-visible:ring-2 focus-visible:ring-violet-500",
                // MASTERPIECE DESIGN: Ethereal Violet
                checked
                    ? "border-violet-500/30 bg-white/80 shadow-[0_8px_30px_-6px_rgba(139,92,246,0.15)] ring-1 ring-violet-500/20"
                    : "border-slate-200/60 bg-white/40 hover:bg-white/80 hover:border-violet-200 hover:shadow-lg hover:shadow-violet-500/5 hover:-translate-y-0.5",
                className
            )}
            {...props}
        >
            {/* Icon Container */}
            <div className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1)", // Springy animation
                checked
                    ? "bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-md shadow-violet-500/30 rotate-3 scale-110"
                    : "bg-slate-100 text-slate-400 group-hover:bg-violet-50 group-hover:text-violet-500"
            )}>
                <div className="relative z-10">
                    {icon}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 space-y-1.5 pt-0.5">
                <div className="flex items-center justify-between">
                    <h4 className={cn("font-semibold text-[15px] tracking-tight transition-colors duration-300", checked ? "text-slate-900" : "text-slate-700")}>
                        {title}
                    </h4>

                    {/* Custom Check Circle */}
                    <div className={cn(
                        "h-5 w-5 rounded-full border flex items-center justify-center transition-all duration-300",
                        checked ? "border-violet-500 bg-violet-500" : "border-slate-300 bg-transparent"
                    )}>
                        <svg className={cn("w-3 h-3 text-white transition-transform duration-300", checked ? "scale-100" : "scale-0")} viewBox="0 0 12 12" fill="none">
                            <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                </div>

                {description && (
                    <p className="text-[13px] text-slate-500 leading-relaxed font-medium group-hover:text-slate-600 transition-colors pr-4">
                        {description}
                    </p>
                )}
            </div>
        </div>
    )
}
