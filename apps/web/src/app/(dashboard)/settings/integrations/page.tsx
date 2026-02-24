"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

/**
 * Unified Connection Hub Redirect
 * Following product design to centralize all integrations on the /brain page.
 */
export default function IntegrationsPage() {
    const router = useRouter()

    React.useEffect(() => {
        router.replace('/brain')
    }, [router])

    return (
        <div className="h-screen flex flex-col items-center justify-center gap-4 bg-white">
            <Loader2 className="h-8 w-8 animate-spin text-zinc-300" />
            <p className="text-sm font-bold text-zinc-500 uppercase tracking-widest">
                Redirecting to Brain Hub...
            </p>
        </div>
    )
}
