import { WifiOff, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/aaliyah/ui/Button"
import * as React from "react"

interface OfflineStateProps {
    onRetry?: () => void
    isRetrying?: boolean
    className?: string
}

export function OfflineState({ onRetry, isRetrying, className }: OfflineStateProps) {
    return (
        <div className={cn("flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in-95 duration-500 w-full h-full min-h-[400px] bg-white/95 backdrop-blur-xl", className)}>
            <div className="relative mb-6 group">
                <div className="absolute inset-0 bg-rose-500/10 rounded-3xl blur-xl group-hover:bg-rose-500/20 transition-all duration-500" />
                <div className="relative h-16 w-16 rounded-3xl bg-white flex items-center justify-center border border-rose-100 shadow-sm ring-1 ring-rose-900/5 group-hover:scale-105 transition-transform duration-500">
                    <WifiOff className="h-7 w-7 text-rose-500 group-hover:text-rose-600 transition-colors duration-500" strokeWidth={1.5} />
                </div>
            </div>

            <h3 className="text-xl font-bold text-zinc-900 tracking-tight mb-2">Connection Lost</h3>
            <p className="text-[14px] text-zinc-500 max-w-[300px] leading-relaxed mx-auto mb-8">
                Cannot reach Aaliyah Core. Please check your internet connection or try securely reconnecting to the workspace.
            </p>

            {onRetry && (
                <Button
                    onClick={onRetry}
                    disabled={isRetrying}
                    className="bg-zinc-900 hover:bg-black text-white rounded-full px-6 h-11 text-[13px] font-semibold tracking-wide transition-all shadow-lg shadow-zinc-200/50"
                >
                    {isRetrying ? (
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin text-zinc-400" />
                    ) : (
                        <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    {isRetrying ? "Reconnecting..." : "Retry Connection"}
                </Button>
            )}
        </div>
    )
}
