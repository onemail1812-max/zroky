export default function UpdatesPage() {
  return (
    <div className="min-h-screen p-8">
      <div className="max-w-5xl mx-auto">
        <div className="text-[11px] uppercase tracking-[0.22em] font-semibold text-zinc-500">Global Info</div>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-zinc-900">Updates</h1>
        <p className="mt-2 text-sm font-medium text-zinc-600">App news and changelog. (Placeholder)</p>

        <div className="mt-8 space-y-3">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5">
            <div className="text-sm font-extrabold text-zinc-900">v0</div>
            <div className="mt-1 text-sm text-zinc-600">Initial workspace layout: Global rail + operational sidebar + stream.</div>
          </div>
        </div>
      </div>
    </div>
  )
}

