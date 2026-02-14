import { GlobalRail } from "@/components/shell/GlobalRail"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-appBg text-textPrimary">
      <div className="hidden md:block">
        <GlobalRail />
      </div>

      <main className="min-h-screen pl-0 md:pl-[72px]">{children}</main>
    </div>
  )
}
