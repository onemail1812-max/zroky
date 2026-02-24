import { Metadata } from "next"
import { GlobalCalendar } from "@/components/calendar/GlobalCalendar"

export const metadata: Metadata = {
    title: "Global Calendar | Zroky",
    description: "Unified team schedule and employee orchestration",
}

export default function CalendarPage() {
    return (
        <div className="flex h-screen w-full bg-[#FAFAFA] text-zinc-900 font-sans">
            <GlobalCalendar />
        </div>
    )
}
