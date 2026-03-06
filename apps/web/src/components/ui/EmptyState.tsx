import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface EmptyStateProps {
    icon?: LucideIcon
    illustration?: React.ReactNode
    title: string
    description: string
    className?: string
}

export function EmptyState({ icon: Icon, illustration, title, description, className }: EmptyStateProps) {
    return (
        <div className={cn("flex flex-col items-center justify-center p-12 text-center animate-in fade-in zoom-in-95 duration-700", className)}>
            <div className="relative mb-8 group">
                {/* Premium B&W Glow */}
                <div className="absolute inset-0 bg-black/5 rounded-[40px] blur-2xl group-hover:bg-black/10 transition-all duration-700" />

                <div className="relative h-24 w-24 rounded-[32px] bg-white flex items-center justify-center border border-zinc-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-black/5 group-hover:scale-105 group-hover:shadow-[0_20px_50px_rgb(0,0,0,0.08)] transition-all duration-700 ease-out">
                    {illustration ? (
                        <div className="p-4 grayscale">
                            {illustration}
                        </div>
                    ) : Icon ? (
                        <Icon className="h-10 w-10 text-black group-hover:rotate-6 transition-transform duration-700" strokeWidth={1} />
                    ) : null}
                </div>
            </div>

            <h3 className="text-lg font-bold text-black tracking-tight mb-2">{title}</h3>
            <p className="text-[14px] text-zinc-500 max-w-[280px] leading-relaxed font-medium">
                {description}
            </p>
        </div>
    )
}
