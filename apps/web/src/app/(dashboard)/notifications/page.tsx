export default function NotificationsPage() {
  return (
    <div className="min-h-screen p-8">
      <div className="max-w-5xl mx-auto">
        <div className="text-[11px] uppercase tracking-[0.22em] font-semibold text-zinc-500">Central</div>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-zinc-900">Notifications</h1>
        <p className="mt-2 text-sm font-medium text-zinc-600">
          Aggregated alerts across all workspaces. (Placeholder)
        </p>

        <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6">
          <div className="text-sm font-semibold text-zinc-900">No notifications yet.</div>
          <div className="mt-1 text-sm text-zinc-600">Aaliyah will surface approvals and escalations here.</div>
        </div>
      </div>
    </div>
  )
}

