import Link from "next/link"
import { AlertTriangle, Home } from "lucide-react"

export default function NotFound() {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-white font-sans text-zinc-900">
            <div className="flex max-w-md flex-col items-center text-center p-8">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-zinc-50 mb-6 border border-zinc-100 shadow-sm">
                    <AlertTriangle className="h-10 w-10 text-zinc-400" />
                </div>
                <h1 className="text-3xl font-bold tracking-tight mb-3">Page Not Found</h1>
                <p className="text-zinc-500 mb-8 leading-relaxed">
                    The workspace section you are looking for doesn't exist or has been moved.
                </p>
                <Link
                    href="/aaliyahworkspace"
                    className="group inline-flex items-center gap-2 rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-zinc-800 hover:shadow-md active:scale-95"
                >
                    <Home className="h-4 w-4 transition-transform group-hover:-translate-y-0.5" />
                    Return to Dashboard
                </Link>
            </div>
        </div>
    )
}
