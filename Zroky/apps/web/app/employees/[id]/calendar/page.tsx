"use client";

import { useEffect, useState } from "react";

type Schedule = {
  id: string;
  title: string;
  scheduled_for: string;
  status: string;
  created_at: string;
};

export default function EmployeeCalendarPage({
  params,
}: {
  params: { id: string };
}) {
  const employeeId = params.id;
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSchedules() {
      setLoading(true);
      const res = await fetch(`/api/schedules?employee_id=${employeeId}`);
      if (res.ok) {
        const data = await res.json();
        setSchedules(data);
      }
      setLoading(false);
    }
    loadSchedules();
  }, [employeeId]);

  if (loading) {
    return (
      <div className="px-4 py-6 text-sm text-neutral-500">
        Loading schedule drafts…
      </div>
    );
  }

  if (!schedules.length) {
    return (
      <div className="px-4 py-6 text-sm text-neutral-500">
        No scheduled drafts yet.
      </div>
    );
  }

  return (
    <div className="h-full w-full rounded-xl bg-neutral-50 p-6 space-y-4">
      <div>
        <h2 className="text-sm font-medium text-neutral-900">
          Content Calendar (Drafts)
        </h2>
        <p className="text-xs text-neutral-500">
          All entries are drafts and require explicit approval.
        </p>
      </div>

      <div className="space-y-3">
        {schedules.map((s) => (
          <div
            key={s.id}
            className="rounded-xl bg-white shadow-sm px-4 py-3 flex justify-between"
          >
            <div>
              <div className="text-sm font-medium text-neutral-900">
                {s.title}
              </div>
              <div className="text-xs text-neutral-500">
                Status: {s.status}
              </div>
            </div>
            <div className="text-xs text-neutral-400">
              {new Date(s.scheduled_for).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
