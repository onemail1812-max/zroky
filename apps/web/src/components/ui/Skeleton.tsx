/**
 * Reusable skeleton & shimmer loading primitives.
 * Usage:
 *   <Skeleton className="h-4 w-48" />
 *   <SkeletonEmail />          — inbox list row
 *   <SkeletonEmailBody />      — thread view body
 *   <SkeletonCard />           — dashboard card
 */
import { cn } from "@/lib/utils"

// ─── Base ───────────────────────────────────────────────────────────────────

export function Skeleton({ className }: { className?: string }) {
    return (
        <div
            className={cn(
                "relative overflow-hidden rounded-md bg-zinc-100 before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.4s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/60 before:to-transparent",
                className
            )}
        />
    )
}

// ─── Inbox list row ──────────────────────────────────────────────────────────

export function SkeletonEmail() {
    return (
        <div className="px-4 py-3 border-b border-zinc-100 space-y-2">
            <div className="flex justify-between items-center">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-3 w-12" />
            </div>
            <Skeleton className="h-3 w-[80%]" />
            <Skeleton className="h-2.5 w-[65%]" />
        </div>
    )
}

// ─── Thread body ─────────────────────────────────────────────────────────────

export function SkeletonEmailBody() {
    return (
        <div className="space-y-2.5 py-1">
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-[92%]" />
            <Skeleton className="h-3.5 w-[97%]" />
            <Skeleton className="h-3.5 w-[85%]" />
            <div className="pt-2" />
            <Skeleton className="h-3.5 w-[90%]" />
            <Skeleton className="h-3.5 w-[75%]" />
            <Skeleton className="h-3.5 w-[88%]" />
        </div>
    )
}

// ─── Dashboard card ──────────────────────────────────────────────────────────

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
    return (
        <div className="rounded-xl border border-zinc-100 bg-white p-6 space-y-3">
            <Skeleton className="h-4 w-40 mb-1" />
            <Skeleton className="h-3 w-24 mb-3" />
            {Array.from({ length: lines }).map((_, i) => (
                <Skeleton key={i} className={`h-3 ${i % 2 === 0 ? "w-full" : "w-[80%]"}`} />
            ))}
        </div>
    )
}

// ─── Generic spinner ────────────────────────────────────────────────────────

export function Spinner({ size = "md", className }: { size?: "sm" | "md" | "lg"; className?: string }) {
    const sizes = { sm: "h-4 w-4 border-2", md: "h-6 w-6 border-2", lg: "h-9 w-9 border-[3px]" }
    return (
        <div className={cn("flex items-center justify-center", className)}>
            <div className={cn("rounded-full border-zinc-200 border-t-zinc-800 animate-spin", sizes[size])} />
        </div>
    )
}

// ─── Full-page centered loader ───────────────────────────────────────────────

export function PageLoader({ label }: { label?: string }) {
    return (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-zinc-400">
            <Spinner size="lg" />
            {label && <p className="text-xs font-medium uppercase tracking-widest animate-pulse">{label}</p>}
        </div>
    )
}
