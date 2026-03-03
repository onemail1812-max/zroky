export default function NotFound() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-50">
            <div className="text-center">
                <h1 className="text-6xl font-bold text-zinc-900 mb-4">404</h1>
                <p className="text-lg text-zinc-500 mb-8">Page not found</p>
                <a
                    href="/aaliyahworkspace"
                    className="px-6 py-3 bg-zinc-900 text-white rounded-xl text-sm font-bold hover:bg-black transition-all"
                >
                    Go to Workspace
                </a>
            </div>
        </div>
    )
}
