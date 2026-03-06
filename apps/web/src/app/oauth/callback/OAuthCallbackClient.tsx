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
      const provider = searchParams.get("provider")
      if (success) {
        setStatus("success")
        setMessage("Connection verified. Redirecting you back to your workspace...")
        localStorage.setItem("oauth_result", "success")

        if (window.opener) {
          setTimeout(() => window.close(), 1500)
        } else {
          // Fallback if not opened as popup
          const returnPath = sessionStorage.getItem('oauth_return_path') || '/aaliyahworkspace';
          const separator = returnPath.includes('?') ? '&' : '?';
          const finalUrl = `${returnPath}${separator}oauth_success=true${provider ? `&provider=${provider}` : ''}`;

          setTimeout(() => {
            window.location.href = finalUrl;
          }, 1500)
        }
        return
      }

      const error = searchParams.get("error")
      const errorDescription = searchParams.get("error_description")

      if (error) {
        setStatus("error")
        setMessage(errorDescription || "OAuth authorization was denied")
        notifyParent(false, error, errorDescription || undefined)

        if (!window.opener) {
          // Fallback if not opened as popup: Return to workspace after delay
          const returnPath = sessionStorage.getItem('oauth_return_path') || '/aaliyahworkspace';
          const separator = returnPath.includes('?') ? '&' : '?';
          const finalUrl = `${returnPath}${separator}oauth_error=${error}${errorDescription ? `&oauth_error_description=${encodeURIComponent(errorDescription)}` : ''}`;

          setTimeout(() => {
            window.location.href = finalUrl;
          }, 3000)
        }
        return
      }

      if (!code || !state) {
        setStatus("error")
        setMessage("Missing authorization code or state")
        notifyParent(false, "missing_params")

        if (!window.opener) {
          setTimeout(() => {
            window.location.href = '/aaliyahworkspace?oauth_error=missing_params';
          }, 3000)
        }
        return
      }

      try {
        const result = await connectorService.handleCallback(code, state)

        if (result.success) {
          const resultProvider = result.account?.provider || sessionStorage.getItem('oauth_provider');
          setStatus("success")
          setMessage(`Connected ${result.account?.email || "account"} successfully.`)
          localStorage.setItem("oauth_result", "success")
          notifyParent(true)

          if (window.opener) {
            setTimeout(() => window.close(), 1500)
          } else {
            // Fallback if not opened as popup
            const returnPath = sessionStorage.getItem('oauth_return_path') || '/aaliyahworkspace';
            const separator = returnPath.includes('?') ? '&' : '?';
            const finalUrl = `${returnPath}${separator}oauth_success=true${resultProvider ? `&provider=${resultProvider}` : ''}`;

            setTimeout(() => {
              window.location.href = finalUrl;
            }, 1500)
          }
        } else {
          setStatus("error")
          setMessage(result.error || "Failed to connect account")
          notifyParent(false, result.error)

          if (!window.opener) {
            const returnPath = sessionStorage.getItem('oauth_return_path') || '/aaliyahworkspace';
            const separator = returnPath.includes('?') ? '&' : '?';
            const finalUrl = `${returnPath}${separator}oauth_error=${result.error || 'callback_failed'}`;

            setTimeout(() => {
              window.location.href = finalUrl;
            }, 3000)
          }
        }
      } catch {
        setStatus("error")
        setMessage("An unexpected error occurred during authorization.")
        notifyParent(false, "unexpected_error")

        if (!window.opener) {
          setTimeout(() => {
            window.location.href = '/aaliyahworkspace?oauth_error=unexpected_error';
          }, 3000)
        }
      }
    }

    void handleCallback()
  }, [notifyParent, searchParams])

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Ambient background decoration */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white rounded-full blur-[100px] opacity-60 pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center text-center">
        {status === "loading" && (
          <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="h-16 w-16 mb-8 rounded-full border border-zinc-200 bg-white shadow-sm flex items-center justify-center relative">
              <div className="absolute inset-0 rounded-full border border-zinc-900 border-t-transparent animate-spin opacity-20" />
              <Loader2 className="h-6 w-6 text-zinc-900 animate-spin" />
            </div>
            <h1 className="text-2xl font-black text-zinc-900 tracking-tight mb-3">Authenticating</h1>
            <p className="text-sm font-medium text-zinc-500 max-w-[260px] leading-relaxed">
              Establishing a secure connection with your provider...
            </p>
          </div>
        )}

        {status === "success" && (
          <div className="flex flex-col items-center animate-in zoom-in-95 fade-in duration-500">
            <div className="h-20 w-20 mb-8 rounded-full bg-zinc-900 flex items-center justify-center shadow-2xl shadow-zinc-900/20 ring-4 ring-white">
              <Check className="h-8 w-8 text-white" strokeWidth={3} />
            </div>
            <h1 className="text-3xl font-black text-zinc-900 tracking-tight mb-3">Connected.</h1>
            <p className="text-sm font-medium text-zinc-500 max-w-[280px] leading-relaxed mb-4">
              {message}
            </p>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center animate-in zoom-in-95 fade-in duration-500">
            <div className="h-20 w-20 mb-8 rounded-full bg-white border-2 border-zinc-200 flex items-center justify-center shadow-sm">
              <X className="h-8 w-8 text-zinc-900" strokeWidth={2} />
            </div>
            <h1 className="text-3xl font-black text-zinc-900 tracking-tight mb-3">Connection Failed</h1>
            <p className="text-sm font-medium text-zinc-500 max-w-[280px] leading-relaxed mb-10">
              {message}
            </p>
            <button
              onClick={() => window.location.href = '/aaliyahworkspace'}
              className="px-8 py-3.5 bg-zinc-900 text-white rounded-2xl text-sm font-bold hover:bg-black hover:shadow-xl hover:-translate-y-0.5 transition-all w-full"
            >
              Return to Workspace
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
