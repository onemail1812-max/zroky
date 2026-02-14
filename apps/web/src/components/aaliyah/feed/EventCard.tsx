
import * as React from "react"
import { Card, CardContent } from "@/components/aaliyah/ui/Card"
import { Mail, Clock, ArrowRight, BrainCircuit } from "lucide-react"

interface EventCardProps {
    type: "email" | "calendar" | "system"
    title: string
    subtitle: string
    timestamp: string
    priority?: "high" | "medium" | "low"
}

export function EventCard({ type, title, subtitle, timestamp, priority }: EventCardProps) {
    return (
        <div className="flex gap-4">
            {/* Icon Column */}
            <div className="flex flex-col items-center">
                <div className="h-8 w-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                    {type === "email" && <Mail className="h-4 w-4 text-slate-600" />}
                    {type === "calendar" && <Clock className="h-4 w-4 text-slate-600" />}
                    {type === "system" && <BrainCircuit className="h-4 w-4 text-purple-600" />}
                </div>
                <div className="w-px h-full bg-slate-200 my-2" />
            </div>

            {/* Content Card */}
            <Card className="flex-1 mb-6 border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-1">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                            {type === "email" ? "New Email" : type} • {timestamp}
                        </span>
                        {priority === "high" && (
                            <span className="bg-red-50 text-red-600 text-xs px-2 py-0.5 rounded-full font-medium border border-red-100">
                                Urgent
                            </span>
                        )}
                    </div>

                    <h3 className="text-sm font-semibold text-slate-900 mb-1">{title}</h3>
                    <p className="text-sm text-slate-600 line-clamp-2">{subtitle}</p>

                    {/* Dynamic Action Area */}
                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <div className="flex gap-2">
                            <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                            <span className="text-xs text-slate-500 font-medium">Aaliyah is drafting a reply...</span>
                        </div>
                        {/* <Button variant="ghost" size="sm" className="text-xs h-7">View Context <ArrowRight className="ml-1 h-3 w-3"/></Button> */}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
