"use client"

import { useCallback, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Check, Loader2, X } from "lucide-react"

import { connectorService } from "@/services/connector.service"

export default function OAuthCallbackClient() {
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("")

  const notifyParent = useCallback((success: boolean, error?: string, errorDescription?: string) => {
    if (window.opener) {
      window.opener.postMessage(
        {
          type: "oauth_complete",
          success,
          error,
          errorDescription,
        },
        "*"
      )
    }
  }, [])

  useEffect(() => {
    async function handleCallback() {
      const code = searchParams.get("code")
      const state = searchParams.get("state")

      // Backend-handled completion (connectors.py redirects with ?success=true)
      const success = searchParams.get("success") === "true"
      if (success) {
        setStatus("success")
        setMessage("Connected successfully! Returning to app...")
        localStorage.setItem("oauth_result", "success")

        // Redirect back to where the user came from
        const returnPath = sessionStorage.getItem('oauth_return_path') || '/onboarding';
        setTimeout(() => {
          window.location.href = returnPath;
        }, 1500)
        return
      }

      const error = searchParams.get("error")
      const errorDescription = searchParams.get("error_description")

      if (error) {
        setStatus("error")
        setMessage(errorDescription || "OAuth authorization was denied")
        notifyParent(false, error, errorDescription || undefined)
        return
      }

      if (!code || !state) {
        setStatus("error")
        setMessage("Missing authorization code or state")
        notifyParent(false, "missing_params")
        return
      }

      try {
        const result = await connectorService.handleCallback(code, state)

        if (result.success) {
          setStatus("success")
          setMessage(`Connected ${result.account?.email || "account"} successfully!`)
          localStorage.setItem("oauth_result", "success")
          notifyParent(true)
          setTimeout(() => window.close(), 2000)
        } else {
          setStatus("error")
          setMessage(result.error || "Failed to connect account")
          notifyParent(false, result.error)
        }
      } catch {
        setStatus("error")
        setMessage("An unexpected error occurred")
        notifyParent(false, "unexpected_error")
      }
    }

    void handleCallback()
  }, [notifyParent, searchParams])

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="bg-white/70 backdrop-blur-2xl rounded-3xl border border-zinc-200/70 ring-1 ring-black/5 p-8 w-full max-w-md text-center">
        {status === "loading" && (
          <>
            <div className="h-16 w-16 mx-auto mb-6 bg-zinc-900/5 rounded-2xl flex items-center justify-center ring-1 ring-black/5">
              <Loader2 className="h-8 w-8 text-zinc-900 animate-spin" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 mb-2">Connecting Account</h1>
            <p className="text-slate-500">Please wait while we complete the authorization...</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="h-16 w-16 mx-auto mb-6 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-[0_18px_44px_-36px_rgba(0,0,0,0.55)]">
              <Check className="h-8 w-8 text-white" strokeWidth={3} />
            </div>
            <h1 className="text-xl font-bold text-slate-900 mb-2">Connected Successfully!</h1>
            <p className="text-slate-500">{message}</p>
            <p className="text-sm text-slate-400 mt-4">This window will close automatically...</p>
          </>
        )}

        {status === "error" && (
          <>
            <div className="h-16 w-16 mx-auto mb-6 bg-white rounded-2xl flex items-center justify-center border-2 border-zinc-900">
              <X className="h-8 w-8 text-zinc-900" strokeWidth={3} />
            </div>
            <h1 className="text-xl font-bold text-slate-900 mb-2">Connection Failed</h1>
            <p className="text-slate-500 mb-6">{message}</p>
            <button
              onClick={() => window.close()}
              className="px-6 py-3 bg-zinc-900 text-white rounded-xl font-semibold hover:bg-zinc-800 transition-colors shadow-[0_18px_44px_-36px_rgba(0,0,0,0.55)]"
            >
              Close Window
            </button>
          </>
        )}
      </div>
    </div>
  )
}
