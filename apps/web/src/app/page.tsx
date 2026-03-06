import { GlobalRail } from "@/components/shell/GlobalRail"
import { WorkspaceLayout } from "@/components/aaliyah/workspace/feed/WorkspaceLayout"
import * as React from "react"

export default function AaliyahWorkspacePage() {
  return (
    <div className="flex h-screen w-full bg-zinc-50 dark:bg-zinc-950">
      <GlobalRail />
      <div className="pl-[72px] w-full h-full">
        <React.Suspense fallback={<div />}>
          <WorkspaceLayout />
        </React.Suspense>
      </div>
    </div>
  )
}
