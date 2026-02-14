export default function ProfilePage() {
  return (
    <div className="min-h-screen p-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-[11px] uppercase tracking-[0.22em] font-semibold text-zinc-500">Account</div>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-zinc-900">Profile</h1>
        <p className="mt-2 text-sm font-medium text-zinc-600">Account management. (Placeholder)</p>

        <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6">
          <div className="text-sm font-semibold text-zinc-900">Signed in</div>
          <div className="mt-1 text-sm text-zinc-600">User details will appear here.</div>
        </div>
      </div>
    </div>
  )
}

