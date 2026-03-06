"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { AnimatePresence, motion } from "framer-motion"
import { BrainCircuit } from "lucide-react"
import { useSystemStore } from "@/lib/aaliyah/store"

const AUTO_REDIRECT_SECONDS = 10

export function AuthErrorOverlay() {
    const { authError, setAuthError } = useSystemStore()
    const [isMounted, setIsMounted] = React.useState(false)
    const [countdown, setCountdown] = React.useState(AUTO_REDIRECT_SECONDS)

    React.useEffect(() => {
        setIsMounted(true)
    }, [])

    // Auto-redirect countdown
    React.useEffect(() => {
        if (!authError) {
            setCountdown(AUTO_REDIRECT_SECONDS)
            return
        }

        const timer = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(timer)
                    window.location.href = "/sign-in"
                    return 0
                }
                return prev - 1
            })
        }, 1000)

        return () => clearInterval(timer)
    }, [authError])

    if (!isMounted || typeof document === 'undefined') return null

    return createPortal(
        <AnimatePresence>
            {authError && (
                <motion.div
                    key="auth-error-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[20000] bg-zinc-950/80 backdrop-blur-xl flex items-center justify-center p-6 sm:p-12 pointer-events-auto"
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="w-full max-w-md bg-white rounded-[32px] overflow-hidden shadow-2xl border border-zinc-200"
                    >
                        <div className="p-8 text-center">
                            <div className="h-16 w-16 bg-zinc-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                <BrainCircuit className="h-8 w-8 text-zinc-900 animate-pulse" />
                            </div>
                            <h3 className="text-2xl font-bold text-zinc-900 mb-2">Session Expired</h3>
                            <p className="text-zinc-500 text-sm leading-relaxed mb-2">
                                Your session has timed out. Please sign in again to continue.
                            </p>
                            <p className="text-zinc-400 text-xs mb-8">
                                Redirecting in <span className="font-bold text-zinc-600">{countdown}s</span>...
                            </p>

                            <div className="space-y-3">
                                <a
                                    href="/sign-in"
                                    className="w-full py-4 bg-zinc-900 hover:bg-zinc-800 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-zinc-200"
                                >
                                    Sign In Now
                                </a>
                                <button
                                    onClick={() => setAuthError(false)}
                                    className="w-full py-4 bg-white border border-zinc-200 text-zinc-600 hover:text-zinc-900 rounded-2xl font-bold text-sm transition-all"
                                >
                                    Dismiss (I&apos;ve signed in elsewhere)
                                </button>
                            </div>

                            <p className="mt-6 text-[11px] text-zinc-400 font-medium uppercase tracking-widest">
                                All unsaved work is preserved
                            </p>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    )
}

