"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Sparkles, Command, CornerDownLeft, Paperclip } from "lucide-react"
import { cn } from "@/lib/utils"

export function CommandBar({ onCommand }: { onCommand: (cmd: string) => void }) {
    const [value, setValue] = React.useState("")
    const [isFocused, setIsFocused] = React.useState(false)

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            if (value.trim()) {
                onCommand(value)
                setValue("")
            }
        }
    }

    return (
        <div className="w-full transition-all duration-300">
            <div className="relative w-full group">
                <div className={cn(
                    "relative flex items-center bg-white/90 backdrop-blur-2xl border border-zinc-100 transition-all duration-500 rounded-[36px] shadow-[0_20px_50px_rgba(0,0,0,0.08)] hover:shadow-[0_25px_60px_rgba(0,0,0,0.12)]",
                    isFocused ? "ring-2 ring-black/5 scale-[1.01]" : ""
                )}>

                    {/* Left Icon (Aaliyah) */}
                    <div className="pl-6 flex items-center justify-center">
                        <div className={cn(
                            "h-10 w-10 rounded-full flex items-center justify-center transition-all duration-500",
                            isFocused ? "bg-black text-white" : "bg-zinc-100 text-zinc-400"
                        )}>
                            <Sparkles className={cn(
                                "h-5 w-5 transition-all duration-500",
                                isFocused ? "rotate-90 scale-110" : ""
                            )} />
                        </div>
                    </div>

                    <input
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        placeholder="Type a command or ask Aaliyah..."
                        spellCheck={false}
                        autoComplete="off"
                        className="flex-1 !bg-transparent !border-0 !outline-none !ring-0 !shadow-none focus:!ring-0 focus:!outline-none h-20 text-lg placeholder:text-zinc-400 text-zinc-900 font-medium font-sans px-6 appearance-none m-0 p-0"
                        style={{ outline: "none", border: "none", boxShadow: "none", background: "transparent" }}
                    />

                    {/* Right Actions */}
                    <div className="pr-4 flex items-center gap-3">
                        {/* Attach Button */}
                        <button
                            className="h-10 w-10 flex items-center justify-center text-zinc-400 hover:text-black hover:bg-zinc-100 rounded-full transition-all duration-300"
                            title="Attach file"
                        >
                            <Paperclip className="h-5 w-5" />
                        </button>

                        {/* Send Button */}
                        <button
                            onClick={() => { if (value.trim()) { onCommand(value); setValue("") } }}
                            className={cn(
                                "h-12 w-12 rounded-full transition-all duration-300 flex items-center justify-center shadow-md",
                                value.trim()
                                    ? "bg-black text-white hover:scale-110 hover:shadow-xl"
                                    : "bg-zinc-100 text-zinc-300"
                            )}
                        >
                            <CornerDownLeft className="h-5 w-5" strokeWidth={2.5} />
                        </button>
                    </div>
                </div>

                {/* Keyboard Hint (Outside) */}
                <div className={cn(
                    "absolute -bottom-8 left-1/2 -translate-x-1/2 text-[10px] font-bold text-zinc-300 tracking-widest uppercase transition-opacity duration-300",
                    isFocused ? "opacity-100" : "opacity-0"
                )}>
                    <span className="flex items-center gap-1">
                        AI Command Protocol active
                    </span>
                </div>
            </div>
        </div>
    )
}
