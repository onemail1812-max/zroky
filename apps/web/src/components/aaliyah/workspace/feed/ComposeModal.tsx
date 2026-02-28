"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Paperclip, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { aaliyahApi } from "@/lib/aaliyah/api";

interface ComposeModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ComposeModal({ isOpen, onClose }: ComposeModalProps) {
    const [to, setTo] = React.useState("");
    const [cc, setCc] = React.useState("");
    const [bcc, setBcc] = React.useState("");
    const [subject, setSubject] = React.useState("");
    const [body, setBody] = React.useState("");
    const [attachments, setAttachments] = React.useState<{ name: string; type: string; data: string }[]>([]);
    const [isSending, setIsSending] = React.useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // Stop propagation so clicking inside the modal doesn't close it if we added an overlay click handler
    const handleContentClick = (e: React.MouseEvent) => e.stopPropagation();

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        const newAttachments = [...attachments];
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const reader = new FileReader();

            const promise = new Promise<{ name: string; type: string; data: string }>((resolve) => {
                reader.onload = () => {
                    const base64 = (reader.result as string).split(",")[1];
                    resolve({
                        name: file.name,
                        type: file.type,
                        data: base64
                    });
                };
            });
            reader.readAsDataURL(file);
            newAttachments.push(await promise);
        }
        setAttachments(newAttachments);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const handleSend = async () => {
        if (!to.trim() || !subject.trim() || !body.trim()) {
            toast.error("To, Subject, and Body are required.");
            return;
        }

        setIsSending(true);
        try {
            await aaliyahApi.post("/assist/compose", {
                to: to.split(",").map(e => e.trim()).filter(Boolean),
                cc: cc ? cc.split(",").map(e => e.trim()).filter(Boolean) : [],
                bcc: bcc ? bcc.split(",").map(e => e.trim()).filter(Boolean) : [],
                subject: subject.trim(),
                body: body.trim(),
                attachments: attachments
            });

            toast.success("Email sent successfully.");

            // Clear form
            setTo("");
            setCc("");
            setBcc("");
            setSubject("");
            setBody("");
            setAttachments([]);

            onClose();
        } catch (error) {
            console.error("Compose error:", error);
            toast.error("Failed to send email.");
        } finally {
            setIsSending(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-sm" onClick={onClose}>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ duration: 0.2 }}
                        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col font-sans border border-zinc-200"
                        onClick={handleContentClick}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 bg-zinc-50">
                            <h2 className="text-lg font-bold text-zinc-900 tracking-tight">New Message by Aaliyah</h2>
                            <button
                                onClick={onClose}
                                className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-200 rounded-full transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Form Fields */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            <div className="flex items-center border-b border-zinc-100 pb-2">
                                <label className="w-16 text-sm font-semibold text-zinc-500">To</label>
                                <input
                                    type="text"
                                    value={to}
                                    onChange={(e) => setTo(e.target.value)}
                                    placeholder="Enter email addresses (comma separated)"
                                    className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-medium text-zinc-900 outline-none placeholder:text-zinc-300"
                                    autoFocus
                                />
                            </div>

                            <div className="flex items-center border-b border-zinc-100 pb-2">
                                <label className="w-16 text-sm font-semibold text-zinc-500">Cc</label>
                                <input
                                    type="text"
                                    value={cc}
                                    onChange={(e) => setCc(e.target.value)}
                                    className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-medium text-zinc-900 outline-none placeholder:text-zinc-300"
                                />
                            </div>

                            <div className="flex items-center border-b border-zinc-100 pb-2">
                                <label className="w-16 text-sm font-semibold text-zinc-500">Bcc</label>
                                <input
                                    type="text"
                                    value={bcc}
                                    onChange={(e) => setBcc(e.target.value)}
                                    className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-medium text-zinc-900 outline-none placeholder:text-zinc-300"
                                />
                            </div>

                            <div className="flex items-center border-b border-zinc-100 pb-2 pt-2">
                                <input
                                    type="text"
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    placeholder="Subject"
                                    className="w-full bg-transparent border-none focus:ring-0 text-lg font-bold text-zinc-900 outline-none placeholder:text-zinc-300 placeholder:font-bold"
                                />
                            </div>

                            <div className="pt-2 min-h-[200px] flex flex-col">
                                <textarea
                                    value={body}
                                    onChange={(e) => setBody(e.target.value)}
                                    className="flex-1 w-full resize-none bg-transparent border-none focus:ring-0 text-sm leading-relaxed text-zinc-800 outline-none placeholder:text-zinc-400 custom-scrollbar"
                                    placeholder="Instruct Aaliyah on what to write, or write the draft yourself..."
                                />
                            </div>

                            {/* Attachments Preview */}
                            {attachments.length > 0 && (
                                <div className="flex flex-wrap gap-2 pt-2">
                                    {attachments.map((file, idx) => (
                                        <div key={idx} className="flex items-center gap-2 px-3 py-1.5 bg-zinc-100 text-zinc-700 rounded-lg text-xs font-medium border border-zinc-200 group">
                                            <Paperclip className="w-3 h-3 text-zinc-400" />
                                            <span className="truncate max-w-[150px]">{file.name}</span>
                                            <button
                                                onClick={() => removeAttachment(idx)}
                                                className="p-0.5 hover:bg-zinc-200 rounded-full transition-colors"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer area & Actions */}
                        <div className="px-6 py-4 border-t border-zinc-100 bg-zinc-50 flex justify-between items-center">
                            <input
                                type="file"
                                multiple
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                className="hidden"
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-200 rounded-lg transition-colors"
                            >
                                <Paperclip className="h-5 w-5" />
                            </button>

                            <button
                                onClick={handleSend}
                                disabled={isSending || !to.trim() || !body.trim()}
                                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-zinc-900 text-white text-sm font-bold rounded-xl hover:bg-black transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 shadow-xl shadow-zinc-900/20"
                            >
                                {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                Send via Aaliyah
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
