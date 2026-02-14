"use client";

import { useEffect, useState } from "react";

type Approval = {
  id: string;
  entity_type: string;
  entity_id: string;
  status: string;
  created_at: string;
};

export default function EmployeeApprovalsPage({
  params,
}: {
  params: { id: string };
}) {
  const employeeId = params.id;
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadApprovals() {
      setLoading(true);
      const res = await fetch(`/api/actions?employee_id=${employeeId}`);
      if (res.ok) {
        const data = await res.json();
        setApprovals(data);
      }
      setLoading(false);
    }
    loadApprovals();
  }, [employeeId]);

  if (loading) {
    return (
      <div className="px-4 py-6 text-sm text-neutral-500">
        Loading approvals…
      </div>
    );
  }

  if (!approvals.length) {
    return (
      <div className="px-4 py-6 text-sm text-neutral-500">
        No pending approvals.
      </div>
    );
  }

  return (
    <div className="space-y-3 px-4 py-4">
      {approvals.map((a) => (
        <div
          key={a.id}
          className="rounded-xl bg-white shadow-sm px-4 py-3 flex justify-between"
        >
          <div>
            <div className="text-sm font-medium text-neutral-900">
              {a.entity_type}
            </div>
            <div className="text-xs text-neutral-500">Status: {a.status}</div>
          </div>
          <div className="text-xs text-neutral-400">
            {new Date(a.created_at).toLocaleString()}
          </div>
        </div>
      ))}
    </div>
  );
}
