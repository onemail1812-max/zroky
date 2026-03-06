import { WorkspaceLayout } from "@/components/aaliyah/workspace/feed/WorkspaceLayout"
import * as React from "react"

export default function WorkspacePage() {
  return (
    <React.Suspense fallback={<div />}>
      <WorkspaceLayout />
    </React.Suspense>
  )
}
