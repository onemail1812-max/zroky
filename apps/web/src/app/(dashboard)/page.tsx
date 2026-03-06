"use client"
import * as React from "react"

export default function DashboardPage() {
    const [greeting, setGreeting] = React.useState("Good Morning")

    React.useEffect(() => {
        const hour = new Date().getHours()
        if (hour < 12) setGreeting("Good Morning")
        else if (hour < 17) setGreeting("Good Afternoon")
        else setGreeting("Good Evening")
    }, [])

    return (
        <div className="flex flex-col items-center justify-center h-[70vh] text-center space-y-4">
            <h2 className="text-2xl font-bold text-slate-900">{greeting}, Boss.</h2>
            <p className="text-slate-500 max-w-md">
                Your inbox is quiet. I&apos;m monitoring for urgent updates.
            </p>
            {/* Future: Feed Component Here */}
        </div>
    )
}
