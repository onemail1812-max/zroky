"use client"
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const chipVariants = cva(
    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
    {
        variants: {
            variant: {
                default:
                    "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
                secondary:
                    "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
                destructive:
                    "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
                outline: "text-foreground",
                filled: "border-transparent text-white", // Custom filled
            },
            color: {
                default: "bg-slate-100 text-slate-900 border-slate-200",
                violet: "bg-violet-100 text-violet-800 border-violet-200",
                red: "bg-red-100 text-red-800 border-red-200",
                amber: "bg-amber-100 text-amber-800 border-amber-200",
                green: "bg-green-100 text-green-800 border-green-200",
            },
            size: {
                default: "px-3 py-1 text-xs",
                sm: "px-2 py-0.5 text-[10px]",
                lg: "px-4 py-1.5 text-sm",
            },
        },
        defaultVariants: {
            variant: "default",
            color: "default",
            size: "default",
        },
        compoundVariants: [
            {
                variant: "filled",
                color: "violet",
                class: "bg-violet-600 text-white hover:bg-violet-700 border-violet-600",
            },
            {
                variant: "filled",
                color: "red",
                class: "bg-red-600 text-white hover:bg-red-700 border-red-600",
            },
            {
                variant: "filled",
                color: "default",
                class: "bg-slate-900 text-white hover:bg-slate-800 border-slate-900",
            },
            // Outline specific overrides
            {
                variant: "outline",
                color: "violet",
                class: "bg-transparent border-violet-200 text-violet-700 hover:bg-violet-50",
            },
        ],
    }
)

type ChipBaseProps = Omit<React.HTMLAttributes<HTMLDivElement>, "color">

export interface ChipProps
    extends ChipBaseProps,
    VariantProps<typeof chipVariants> {
    selected?: boolean
    label?: string // Compatibility with old usage
}

function Chip({ className, variant, color, size, selected, label, children, ...props }: ChipProps) {
    // Determine effective variant/color based on 'selected' prop if present
    const finalVariant = selected ? "filled" : variant || "outline"
    const finalColor = selected ? "violet" : color || "default"

    return (
        <div className={cn(chipVariants({ variant: finalVariant, color: finalColor, size }), className)} {...props}>
            {label || children}
        </div>
    )
}

export { Chip, chipVariants }
