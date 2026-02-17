"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { Check, X, Edit, Calendar, Timer, SendHorizontal, Zap } from "lucide-react"

export type DrawerAction = "Reply" | "Schedule" | "Approval"

export function AssistantDrawer({ open, context, onClose }: { open: boolean; context: DrawerAction | null; onClose: () => void }) {
    if (!open) return null

    return (
        <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed top-0 right-0 h-full w-[420px] bg-white dark:bg-zinc-950 shadow-2xl z-50 border-l border-zinc-200 dark:border-zinc-800 flex flex-col"
        >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
                <h2 className="text-lg font-semibold tracking-tight">Aaliyah Assistant</h2>
                <button onClick={onClose} className="p-2 -mr-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
                    <X className="h-5 w-5" />
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {/* Summary Context */}
                <div className="space-y-2">
                    <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Context</div>
                    <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                        <span className="font-medium text-black dark:text-white">Request: Approval needed for Q3 Investor Update.</span>
                        <span className="block mt-1 text-xs text-zinc-500">Includes sensitive growth metrics + PDF attachment.</span>
                    </div>
                </div>

                {/* Output / Proposal */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">{context === "Schedule" ? "Availability" : "Proposal"}</div>
                        <span className="text-[10px] bg-green-100 text-green-700 dark:bg-green-900/30 px-2 py-0.5 rounded-full font-medium">Ready</span>
                    </div>

                    <div className="border border-zinc-300 dark:border-zinc-700 rounded-xl overflow-hidden shadow-sm">
                        <div className="bg-zinc-100 dark:bg-zinc-900 px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-2 text-xs font-medium text-zinc-500">
                            {context === "Schedule" ? (
                                <>
                                    <Calendar className="h-3.5 w-3.5" />
                                    <span>Proposed Times</span>
                                </>
                            ) : (
                                <>
                                    <span className="bg-zinc-300 h-2 w-2 rounded-full" />
                                    <span>Draft: Re: Q3 Investor Update</span>
                                </>
                            )}
                        </div>

                        {context === "Schedule" ? (
                            <div className="p-2 bg-white dark:bg-zinc-950">
                                <div className="space-y-1">
                                    {["Tue, Oct 24 • 10:00 AM - 10:30 AM", "Tue, Oct 24 • 2:00 PM - 2:30 PM", "Wed, Oct 25 • 11:00 AM - 11:30 AM"].map((slot, i) => (
                                        <button key={i} className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors flex items-center gap-3">
                                            <div className="h-4 w-4 rounded-full border border-zinc-300 dark:border-zinc-600" />
                                            <span className="text-zinc-700 dark:text-zinc-300">{slot}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="p-4 text-sm bg-white dark:bg-zinc-950 font-serif leading-relaxed text-zinc-800 dark:text-zinc-200">
                                <p>Hi Sarah,</p>
                                <p className="mt-2 text-zinc-500 italic">[AI Generated Draft Content based on Context...]</p>
                                <p className="mt-2">Approved. Thank you for flagging the growth section specifically.</p>
                                <p className="mt-2">Please proceed with sending to legal review now so we can hit the Friday deadline.</p>
                                <p className="mt-4 text-zinc-400">Sent via Aaliyah</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Toggles - Only for Reply */}
                {context === "Reply" && (
                    <div className="space-y-3">
                        <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Tone Adjustment</div>
                        <div className="flex gap-2">
                            {["Short", "Natural", "Friendly", "Formal"].map((tone) => (
                                <button key={tone} className="px-3 py-1.5 text-xs font-medium rounded-full border border-zinc-200 hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-900 transition-colors">
                                    {tone}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Safety Check */}
                <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-900/30 p-4 rounded-xl flex gap-3 items-start">
                    <Zap className="h-5 w-5 text-yellow-600 mt-0.5 shrink-0" />
                    <div>
                        <h4 className="text-sm font-semibold text-yellow-800 dark:text-yellow-500">Compliance Check</h4>
                        <p className="text-xs text-yellow-700 dark:text-yellow-600/80 mt-1">This draft authorizes external distribution of sensitive documents.</p>
                    </div>
                </div>

            </div>

            {/* Footer Actions */}
            <div className="p-6 bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 shrink-0 space-y-3">
                <button className="w-full h-12 bg-black dark:bg-white text-white dark:text-black rounded-xl font-semibold flex items-center justify-center gap-2 shadow-lg shadow-black/5 hover:scale-[1.02] active:scale-[0.98] transition-all">
                    <SendHorizontal className="h-4 w-4" />
                    Approve & Send (Enter)
                </button>
                <button className="w-full h-10 bg-transparent text-zinc-500 hover:text-foreground text-sm font-medium flex items-center justify-center gap-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg transition-colors">
                    <Edit className="h-3.5 w-3.5" />
                    Edit Draft
                </button>
            </div>
        </motion.div>
    )
}
