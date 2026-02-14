"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Tab = {
  label: string;
  href: string;
};

export default function EmployeeTabs({ employeeId }: { employeeId: string }) {
  const pathname = usePathname();

  const tabs: Tab[] = [
    { label: "Chat", href: `/employees/${employeeId}/chat` },
    { label: "Artifacts", href: `/employees/${employeeId}/artifacts` },
    { label: "Studio", href: `/employees/${employeeId}/studio` },
    { label: "Approvals", href: `/employees/${employeeId}/approvals` },
  ];

  return (
    <div className="flex items-center gap-2 border-b border-neutral-200 px-4">
      {tabs.map((tab) => {
        const active = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`rounded-t-lg px-3 py-2 text-sm ${
              active
                ? "bg-white text-neutral-900 shadow-sm"
                : "text-neutral-500 hover:text-neutral-900"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
