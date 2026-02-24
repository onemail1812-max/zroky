import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Mailbox, Hand, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface NotificationCardProps {
    id: string;
    title: string;
    description: string;
    type: 'draft_ready' | 'needs_clarity' | 'auto_archived' | 'labeled';
    onDismiss: (id: string) => void;
    onClick?: (id: string) => void;
}

export function NotificationCard({ id, title, description, type, onDismiss, onClick }: NotificationCardProps) {
    const Icon = {
        draft_ready: Sparkles,
        needs_clarity: Hand,
        auto_archived: Mailbox,
        labeled: CheckCircle2,
    }[type] || Sparkles;

    const iconColor = {
        draft_ready: 'text-blue-500 bg-blue-50',
        needs_clarity: 'text-amber-500 bg-amber-50',
        auto_archived: 'text-zinc-500 bg-zinc-100',
        labeled: 'text-emerald-500 bg-emerald-50',
    }[type];

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
            className="w-[380px] bg-white/95 backdrop-blur-xl border border-zinc-200 shadow-[0_20px_40px_rgba(0,0,0,0.08)] rounded-2xl overflow-hidden cursor-pointer active:scale-95 transition-transform"
            onClick={() => onClick?.(id)}
        >
            <div className="p-4 flex items-start gap-4">
                <div className={cn("mt-1 p-2 rounded-xl shrink-0", iconColor)}>
                    <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0 pr-2">
                    <p className="text-[14px] font-semibold text-zinc-900 tracking-tight mb-0.5 truncate">
                        {title}
                    </p>
                    <p className="text-[13px] text-zinc-500 leading-snug line-clamp-2">
                        {description}
                    </p>
                </div>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDismiss(id);
                    }}
                    className="p-1.5 text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 rounded-lg transition-colors shrink-0"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>

            {/* Action Bar based on Type */}
            {(type === 'draft_ready' || type === 'needs_clarity') && (
                <div className="px-4 py-3 bg-zinc-50/50 border-t border-zinc-100 flex items-center justify-end gap-2">
                    <button className="text-[12px] font-semibold text-zinc-600 hover:text-zinc-900 px-3 py-1.5 rounded-lg hover:bg-zinc-200/50 transition-colors">
                        Review Now
                    </button>
                </div>
            )}
        </motion.div>
    );
}
