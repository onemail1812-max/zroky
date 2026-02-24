"use client";

import React, { useRef, useEffect } from "react";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
    value: string;
    onChange: (value: string) => void;
    onSubmit: (e?: React.FormEvent) => void;
    isLoading: boolean;
    placeholder?: string;
}

export function ChatInput({ value, onChange, onSubmit, isLoading, placeholder }: ChatInputProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "inherit";
            const scrollHeight = textareaRef.current.scrollHeight;
            textareaRef.current.style.height = `${Math.min(scrollHeight, 200)}px`;
        }
    }, [value]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if ((value || "").trim() && !isLoading) {
                onSubmit();
            }
        }
    };

    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                if ((value || "").trim() && !isLoading) onSubmit();
            }}
            className="relative flex items-center w-full max-w-3xl mx-auto rounded-xl border bg-white p-1 shadow-sm transition-all focus-within:ring-1 focus-within:ring-zinc-400"
        >
            <textarea
                ref={textareaRef}
                rows={1}
                value={value || ""}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder || "Ask Aaliyah anything..."}
                className="flex-1 resize-none bg-transparent px-3 py-2 text-sm focus:outline-none placeholder:text-zinc-400"
            />
            <button
                type="submit"
                disabled={!(value || "").trim() || isLoading}
                className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg transition-all",
                    (value || "").trim() && !isLoading
                        ? "bg-black text-white hover:bg-zinc-800"
                        : "bg-zinc-100 text-zinc-400 cursor-not-allowed"
                )}
            >
                <ArrowUp size={18} />
            </button>
        </form>
    );
}
