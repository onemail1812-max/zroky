export default function DashboardPage() {
    return (
        <div className="flex flex-col items-center justify-center h-[70vh] text-center space-y-4">
            <h2 className="text-2xl font-bold text-slate-900">Good Morning, Boss.</h2>
            <p className="text-slate-500 max-w-md">
                Your inbox is quiet. I&apos;m monitoring for urgent updates.
            </p>
            {/* Future: Feed Component Here */}
        </div>
    )
}
