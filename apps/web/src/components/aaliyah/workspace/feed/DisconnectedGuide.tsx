"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { ShieldAlert } from "lucide-react"

interface DisconnectedGuideProps {
    onOpenSettings: () => void;
}

export function DisconnectedGuide({ onOpenSettings }: DisconnectedGuideProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="max-w-lg w-full pointer-events-auto"
        >
            <div className="mx-auto h-16 w-16 rounded-2xl bg-zinc-100 border border-zinc-200 flex items-center justify-center mb-6">
                <ShieldAlert className="h-8 w-8 text-zinc-400" />
            </div>

            <h2 className="text-2xl font-black text-zinc-900 tracking-tight mb-2">
                I need access to your workspace
            </h2>
            <p className="text-sm text-zinc-500 max-w-md mx-auto leading-relaxed mb-8">
                Connect your email so I can manage your inbox, triage priority threads,
                draft replies in your voice, and keep your calendar organized.
            </p>

            <div className="grid grid-cols-2 gap-3 mb-8 max-w-sm mx-auto">
                <button
                    onClick={async () => {
                        try {
                            const { connectorService } = await import("@/services/connector.service");
                            const { authUrl } = await connectorService.getAuthUrl({ provider: "google", serviceType: "both" });
                            window.location.href = authUrl;
                        } catch (err) {
                            onOpenSettings();
                        }
                    }}
                    className="group flex flex-col items-center gap-3 p-5 bg-white border border-zinc-200 rounded-2xl hover:border-zinc-400 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 active:scale-95"
                >
                    <div className="h-10 w-10 rounded-xl bg-red-50 flex items-center justify-center">
                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
                            <path d="M22 6L12 13L2 6" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <rect x="2" y="4" width="20" height="16" rx="3" stroke="#DC2626" strokeWidth="2" />
                        </svg>
                    </div>
                    <div>
                        <span className="text-sm font-bold text-zinc-900 block">Gmail</span>
                        <span className="text-[10px] text-zinc-400 font-medium">Google Workspace</span>
                    </div>
                </button>

                <button
                    onClick={async () => {
                        try {
                            const { connectorService } = await import("@/services/connector.service");
                            const { authUrl } = await connectorService.getAuthUrl({ provider: "microsoft", serviceType: "both" });
                            window.location.href = authUrl;
                        } catch (err) {
                            onOpenSettings();
                        }
                    }}
                    className="group flex flex-col items-center gap-3 p-5 bg-white border border-zinc-200 rounded-2xl hover:border-zinc-400 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 active:scale-95"
                >
                    <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center">
                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
                            <path d="M22 6L12 13L2 6" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <rect x="2" y="4" width="20" height="16" rx="3" stroke="#2563EB" strokeWidth="2" />
                        </svg>
                    </div>
                    <div>
                        <span className="text-sm font-bold text-zinc-900 block">Outlook</span>
                        <span className="text-[10px] text-zinc-400 font-medium">Microsoft 365</span>
                    </div>
                </button>
            </div>

            <p className="text-[11px] text-zinc-400 font-medium flex items-center justify-center gap-1.5">
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                Your data stays encrypted. I only access what you authorize.
            </p>
        </motion.div>
    )
}
