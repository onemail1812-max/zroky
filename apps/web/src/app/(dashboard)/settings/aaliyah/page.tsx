"use client"

import { RulesSettings } from "@/components/aaliyah/features/RulesSettings"
import { GeneralSettings } from "@/components/aaliyah/features/GeneralSettings"
import { TemplateSettings } from "@/components/aaliyah/features/TemplateSettings"
import { ActionLog } from "@/components/aaliyah/features/ActionLog"
import { InboxOverview } from "@/components/aaliyah/features/InboxOverview"

export default function AaliyahSettingsPage() {
    return (
        <div className="flex flex-col gap-8 p-8 max-w-7xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Aaliyah Intelligence</h1>
                <p className="text-zinc-500 mt-2 text-lg">
                    Configure how your Executive Assistant perceives, organizes, and acts on your world.
                </p>
            </div>

            <div className="grid gap-12 lg:grid-cols-[1fr_400px]">
                {/* Main Settings Column */}
                <div className="space-y-10">
                    <GeneralSettings />
                    <div className="border-t pt-8" />
                    <TemplateSettings />
                    <div className="border-t pt-8" />
                    <RulesSettings />
                    <div className="border-t pt-8" />
                    <ActionLog />
                </div>

                {/* Sidebar: Live Feed */}
                <div className="space-y-6">
                    <div className="sticky top-8">
                        <InboxOverview />
                    </div>
                </div>
            </div>
        </div>
    )
}
