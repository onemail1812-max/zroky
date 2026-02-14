
import * as React from "react"
import { cn } from "@/lib/utils"

interface SliderProps extends React.InputHTMLAttributes<HTMLInputElement> {
    labelStart?: string
    labelEnd?: string
}

export function Slider({ className, labelStart, labelEnd, ...props }: SliderProps) {
    return (
        <div className={cn("w-full space-y-2", className)}>
            <input
                type="range"
                className="h-2 w-full appearance-none rounded-lg bg-slate-200 accent-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                {...props}
            />
            <div className="flex justify-between text-xs font-medium text-slate-500 px-1">
                <span>{labelStart}</span>
                <span>{labelEnd}</span>
            </div>
        </div>
    )
}
