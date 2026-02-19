import Link from "next/link"
import { Tag, Shield, ListStart } from "lucide-react"

export default function SettingsPage() {
  return (
    <div className="min-h-screen p-8">
      <div className="max-w-5xl mx-auto">
        <div className="text-[11px] uppercase tracking-[0.22em] font-semibold text-zinc-500">Preferences</div>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-zinc-900">Aaliyah Settings</h1>
        <p className="mt-2 text-sm font-medium text-zinc-600">
          Configure how Aaliyah behaves, what she can access, and how review-first works.
        </p>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">

          {/* Rules & Triage Settings (NEW) */}
          <div className="col-span-full rounded-2xl border border-zinc-200 bg-white p-6 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] transition-all hover:border-violet-200 hover:shadow-lg hover:shadow-violet-500/5">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-violet-600">
                  <Tag className="h-4 w-4" />
                  Intelligence Rules
                </div>
                <div className="mt-2 text-lg font-bold text-zinc-900">Inbox & Triage Logic</div>
                <p className="mt-1 max-w-lg text-sm font-medium text-zinc-500">
                  Configure VIP senders, internal domains, auto-labeling rules, and sync frequency.
                  View live conflict alerts and recent triage decisions.
                </p>
              </div>
              <div className="hidden sm:block h-12 w-12 rounded-full bg-violet-50 flex items-center justify-center text-violet-600">
                <Tag className="h-6 w-6" />
              </div>
            </div>
            <Link
              href="/settings/aaliyah"
              className="mt-6 inline-flex items-center rounded-full bg-violet-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-violet-700 transition-colors"
            >
              Manage Rules & Feed
            </Link>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-6 hover:border-zinc-300 transition-colors">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
              <ListStart className="h-4 w-4" />
              Onboarding
            </div>
            <div className="mt-2 text-sm font-bold text-zinc-900">Connectors & Basics</div>
            <p className="mt-1 text-xs text-zinc-500">Re-run the setup wizard to change email providers.</p>
            <Link
              href="/settings/integrations"
              className="mt-4 inline-flex items-center rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-bold text-zinc-900 hover:bg-zinc-50 transition-colors"
            >
              Manage Integrations
            </Link>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-6 hover:border-zinc-300 transition-colors">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
              <Shield className="h-4 w-4" />
              Guidelines
            </div>
            <div className="mt-2 text-sm font-bold text-zinc-900">Tone & Safety</div>
            <p className="mt-1 text-xs text-zinc-500">Define personality, boundaries, and approval flows.</p>
            <Link
              href="/guidelines"
              className="mt-4 inline-flex items-center rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-bold text-zinc-900 hover:bg-zinc-50 transition-colors"
            >
              Edit Guidelines
            </Link>
          </div>

        </div>
      </div>
    </div>
  )
}
