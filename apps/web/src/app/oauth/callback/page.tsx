import { Suspense } from "react"
import OAuthCallbackClient from "./OAuthCallbackClient"

export default function OAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8 w-full max-w-md text-center">
            <div className="text-sm font-semibold text-slate-700">Loading OAuth callback...</div>
          </div>
        </div>
      }
    >
      <OAuthCallbackClient />
    </Suspense>
  )
}

