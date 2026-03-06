"use client";

import React, { useRef, useEffect, useState } from "react";
import { ArrowUp, Paperclip, X, File, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ChatAttachment {
    filename: string;
    mimeType: string;
    content: string; // Base64
}

interface ChatInputProps {
    value: string;
    onChange: (value: string) => void;
    onSubmit: (e?: React.FormEvent, attachments?: ChatAttachment[]) => void;
    isLoading: boolean;
    placeholder?: string;
}

export const ChatInput = React.memo(function ChatInput({ value, onChange, onSubmit, isLoading, placeholder }: ChatInputProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [attachments, setAttachments] = useState<ChatAttachment[]>([]);

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
            const hasContent = (value || "").trim() || attachments.length > 0;
            if (hasContent && !isLoading) {
                onSubmit(undefined, attachments);
                setAttachments([]);
            }
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const newAttachments: ChatAttachment[] = [];
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const reader = new FileReader();

            const promise = new Promise<void>((resolve) => {
                reader.onload = (event) => {
                    const base64String = (event.target?.result as string).split(',')[1];
                    newAttachments.push({
                        filename: file.name,
                        mimeType: file.type || "application/octet-stream",
                        content: base64String
                    });
                    resolve();
                };
            });
            reader.readAsDataURL(file);
            await promise;
        }

        setAttachments(prev => [...prev, ...newAttachments]);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    return (
        <div className="w-full max-w-3xl mx-auto flex flex-col gap-2">
            {/* Attachment Previews */}
            {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 px-1">
                    {attachments.map((att, i) => {
                        const isImage = att.mimeType.startsWith('image/');
                        return (
                            <div key={i} className="relative flex items-center bg-white border border-zinc-200 rounded-lg p-2 pr-8 shadow-sm group">
                                <div className="h-8 w-8 rounded bg-zinc-100 flex items-center justify-center mr-3 shrink-0 overflow-hidden">
                                    {isImage ? (
                                        <img src={`data:${att.mimeType};base64,${att.content}`} alt={att.filename} className="h-full w-full object-cover" />
                                    ) : (
                                        <File className="h-4 w-4 text-zinc-500" />
                                    )}
                                </div>
                                <div className="flex flex-col min-w-0 max-w-[150px]">
                                    <span className="text-xs font-medium text-zinc-700 truncate">{att.filename}</span>
                                    <span className="text-[10px] text-zinc-400 capitalize truncate">{att.mimeType.split('/')[1] || 'File'}</span>
                                </div>
                                <button
                                    aria-label="Remove attachment"
                                    onClick={() => removeAttachment(i)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-zinc-100 text-zinc-500 flex items-center justify-center hover:bg-red-100 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </div>
                        )
                    })}
                </div>
            )}

            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    const hasContent = (value || "").trim() || attachments.length > 0;
                    if (hasContent && !isLoading) {
                        onSubmit(e, attachments);
                        setAttachments([]);
                    }
                }}
                className="relative flex items-end w-full rounded-xl border border-white ring-1 ring-zinc-200 bg-white p-1 shadow-sm transition-all focus-within:ring-1 focus-within:ring-zinc-300"
            >
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    className="hidden"
                    multiple
                />
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-11 w-11 min-h-[44px] min-w-[44px] flex shrink-0 items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
                    title="Attach files"
                >
                    <Paperclip size={18} />
                </button>

                <textarea
                    id="chat-input"
                    name="chat-input"
                    aria-label="Chat message"
                    ref={textareaRef}
                    rows={1}
                    value={value || ""}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder || (attachments.length > 0 ? "Add a message..." : "Ask Aaliyah anything...")}
                    className="flex-1 mt-1.5 resize-none bg-transparent px-3 py-1.5 text-sm focus:outline-none placeholder:text-zinc-400 custom-scrollbar"
                />

                <button
                    type="submit"
                    aria-label="Send message"
                    disabled={(!(value || "").trim() && attachments.length === 0) || isLoading}
                    className={cn(
                        "flex shrink-0 h-11 w-11 min-h-[44px] min-w-[44px] ml-1 items-center justify-center rounded-lg transition-all",
                        ((value || "").trim() || attachments.length > 0) && !isLoading
                            ? "bg-black text-white hover:bg-zinc-800"
                            : "bg-zinc-100 text-zinc-400 cursor-not-allowed"
                    )}
                >
                    <ArrowUp size={18} />
                </button>
            </form>
        </div>
    );
})
