import { GlobalRail } from "@/components/shell/GlobalRail"
import { WorkspaceLayout } from "@/components/aaliyah/workspace/feed/WorkspaceLayout"

export default function AaliyahWorkspacePage() {
  return (
    <div className="flex h-screen w-full bg-zinc-50 dark:bg-zinc-950">
      <GlobalRail />
      <div className="pl-[72px] w-full h-full">
        <WorkspaceLayout />
      </div>
    </div>
  )
}
