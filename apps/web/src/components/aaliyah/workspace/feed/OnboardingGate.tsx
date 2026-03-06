"use client"

import { motion } from "framer-motion"
import { ArrowRight } from "lucide-react"

// ── Onboarding Gate Screen ──────────────────────────────────────────
export function OnboardingGate({ firstName }: { firstName: string | null }) {
    const name = firstName || "there"

    return (
        <div className="flex h-screen w-full bg-white overflow-hidden font-sans">
            {/* Left: Hero Image Section */}
            <div className="relative w-1/2 h-full hidden lg:block bg-zinc-50">
                <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
                    <motion.div
                        initial={{ scale: 1.1, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 1.2, ease: "easeOut" }}
                        className="relative w-full h-full"
                    >
                        {/* High-fidelity character render */}
                        <img
                            src="/Onboarding/aaliyah-onboarding.png"
                            alt="Aaliyah System Interface"
                            className="w-full h-full object-cover object-top"
                        />
                        {/* Minimal functional gradient for text legibility */}
                        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-90" />
                    </motion.div>
                </div>


            </div>

            {/* Right: Interaction Section */}
            <div className="w-full lg:w-1/2 h-full flex items-center justify-center p-8 relative">
                {/* Mobile Background (if on small screen) */}
                <div className="absolute inset-0 lg:hidden z-0">
                    <img src="/Onboarding/aaliyah-onboarding.jpg" className="w-full h-full object-cover opacity-20 blur-sm" />
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm" />
                </div>

                <div className="max-w-md w-full relative z-10 flex flex-col justify-center h-full">
                    {/* Ambient Glow */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-zinc-100/50 rounded-full blur-[80px] -z-10 pointer-events-none" />
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                    >
                        <h1 className="text-7xl lg:text-8xl font-black tracking-tighter mb-8 leading-[0.9]">
                            <span className="bg-clip-text text-transparent bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-500">
                                Hello.
                            </span>
                        </h1>

                        <div className="space-y-6 max-w-sm">
                            <p className="text-zinc-600 text-xl font-medium leading-relaxed">
                                I'm Aaliyah — your Executive Assistant. I manage your inbox, calendar, and communications using your rules, your voice, and your approval.
                            </p>

                            <p className="text-zinc-400 text-sm font-semibold tracking-wide flex items-center gap-2">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Let's configure my core protocols in under 2 minutes.
                            </p>
                        </div>

                        <div className="mt-12 space-y-8">
                            <a
                                href="/aaliyahonboarding"
                                className="group relative flex items-center justify-between px-8 py-6 bg-zinc-900 hover:bg-black text-white rounded-[24px] transition-all duration-500 shadow-2xl hover:shadow-zinc-900/30 hover:-translate-y-1.5 w-full overflow-hidden"
                            >
                                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                                <div className="flex flex-col items-start z-10 text-left">
                                    <span className="text-xl font-black tracking-tight">Begin My Onboarding</span>
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 group-hover:text-zinc-300 transition-colors">Initialize Executive Protocols</span>
                                </div>

                                <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center group-hover:bg-white text-white group-hover:text-black transition-all duration-500 z-10 shadow-inner">
                                    <ArrowRight className="h-6 w-6 transition-transform duration-500 group-hover:translate-x-1" />
                                </div>

                                {/* Animated Glow */}
                                <div className="absolute -inset-full bg-gradient-to-r from-transparent via-white/5 to-transparent rotate-45 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out" />
                            </a>

                            <div className="flex items-center justify-center gap-6 opacity-60 hover:opacity-100 transition-opacity duration-500">
                                {["Secure Enclave", "Human-Verified", "24/7 Active"].map((badge) => (
                                    <span key={badge} className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                                        {badge}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    )
}
