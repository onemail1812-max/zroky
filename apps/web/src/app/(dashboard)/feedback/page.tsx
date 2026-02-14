"use client"

import * as React from "react"

export default function FeedbackPage() {
  const [text, setText] = React.useState("")

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-[11px] uppercase tracking-[0.22em] font-semibold text-zinc-500">Feedback</div>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-zinc-900">Send Feedback</h1>
        <p className="mt-2 text-sm font-medium text-zinc-600">Share what feels confusing, slow, or risky. (Placeholder)</p>

        <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6">
          <label className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Message</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            className="mt-3 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-zinc-400"
            placeholder="What should we improve?"
          />
          <button
            type="button"
            disabled={!text.trim()}
            className="mt-4 rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-extrabold text-white hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  )
}

