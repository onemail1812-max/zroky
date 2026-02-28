"use client"

import * as React from "react"
import { motion, Variants } from "framer-motion"
import { cn } from "@/lib/utils"

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 30, scale: 0.96, filter: "blur(4px)" },
    visible: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)", transition: { type: "spring", stiffness: 300, damping: 24 } }
}

export function CardShell({
    children,
    headerIcon: HeaderIcon,
    headerLabel,
    headerColorClass,
    className,
}: {
    children: React.ReactNode
    headerIcon?: React.ElementType
    headerLabel?: string
    headerColorClass?: string
    className?: string
}) {
    return (
        <motion.div variants={itemVariants} className="flex justify-start w-full relative">
            <div className={cn("max-w-3xl w-full flex flex-col gap-3", className)}>
                {(HeaderIcon || headerLabel) && (
                    <div className="flex items-center gap-2.5 px-1">
                        {HeaderIcon && (
                            <div className={cn("h-4 w-4 shrink-0", headerColorClass)}>
                                <HeaderIcon className="h-full w-full" />
                            </div>
                        )}
                        {headerLabel && (
                            <span className="text-[10px] font-bold tracking-[0.2em] text-zinc-500 uppercase">
                                {headerLabel}
                            </span>
                        )}
                    </div>
                )}
                <div className="relative rounded-[32px] border border-zinc-200/60 dark:border-zinc-800/60 bg-white/60 dark:bg-zinc-950/60 backdrop-blur-xl p-6 md:p-8 shadow-sm">
                    {children}
                </div>
            </div>
        </motion.div>
    )
}
