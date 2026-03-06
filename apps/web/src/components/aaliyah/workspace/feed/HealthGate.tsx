"use client"

import { motion } from "framer-motion"
import { ShieldAlert, AlertTriangle, WifiOff } from "lucide-react"
import { getConnectionMessage } from "@/lib/aaliyah/connection-messages"
import { cn } from "@/lib/utils"

// ── Health Gate Screen ──────────────────────────────────────────────
export function HealthGate({ health, onRetry }: { health: any, onRetry: () => void }) {
    const msg = getConnectionMessage(health.email_health, "Email")
    const Icon = msg.badge === 'error' ? ShieldAlert : msg.badge === 'warning' ? AlertTriangle : WifiOff

    return (
        <div className="flex h-screen w-full bg-white items-center justify-center p-8 z-[200]" data-testid="health-gate">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-md w-full text-center"
            >
                <div className={cn(
                    "mx-auto h-16 w-16 rounded-3xl flex items-center justify-center mb-8",
                    msg.badge === 'error' ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"
                )}>
                    <Icon className="h-8 w-8" />
                </div>

                <h2 className="text-3xl font-black text-zinc-900 tracking-tight mb-4 leading-tight" data-testid="health-gate-title">
                    {msg.title}
                </h2>
                <p className="text-zinc-500 text-lg font-medium mb-10 leading-relaxed" data-testid="health-gate-description">
                    {msg.description}
                </p>

                <div className="space-y-4">
                    {msg.ctaAction === 'connect' || msg.ctaAction === 'reconnect' ? (
                        <a
                            href="/brain"
                            className="flex items-center justify-center w-full px-8 py-4 bg-zinc-900 text-white rounded-[20px] font-bold text-lg hover:bg-black transition-all shadow-xl"
                            data-testid="health-gate-cta"
                        >
                            {msg.ctaLabel || "Reconnect Now"}
                        </a>
                    ) : (
                        <button
                            onClick={onRetry}
                            className="flex items-center justify-center w-full px-8 py-4 bg-zinc-900 text-white rounded-[20px] font-bold text-lg hover:bg-black transition-all shadow-xl"
                            data-testid="health-gate-cta"
                        >
                            {msg.ctaLabel || "Retry Connection"}
                        </button>
                    )}

                    <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest pt-4">
                        System Gate Active — Protocols Halted
                    </p>
                </div>
            </motion.div>
        </div>
    )
}
