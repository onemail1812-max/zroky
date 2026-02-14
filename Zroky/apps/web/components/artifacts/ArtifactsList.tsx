"use client";

import { useEffect, useState } from "react";

type Artifact = {
  id: string;
  type: string;
  title: string;
  status: string;
  created_at: string;
};

export default function ArtifactsList({ employeeId }: { employeeId: string }) {
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadArtifacts() {
      setLoading(true);
      const res = await fetch(`/api/artifacts?employee_id=${employeeId}`);
      if (res.ok) {
        const data = await res.json();
        setArtifacts(data);
      }
      setLoading(false);
    }
    loadArtifacts();
  }, [employeeId]);

  if (loading) {
    return (
      <div className="text-sm text-neutral-500 px-4 py-6">
        Loading artifacts…
      </div>
    );
  }

  if (!artifacts.length) {
    return (
      <div className="text-sm text-neutral-500 px-4 py-6">
        No artifacts created yet.
      </div>
    );
  }

  return (
    <div className="space-y-3 px-4 py-4">
      {artifacts.map((a) => (
        <div
          key={a.id}
          className="rounded-xl bg-white shadow-sm px-4 py-3 flex items-center justify-between"
        >
          <div>
            <div className="text-sm font-medium text-neutral-900">
              {a.title || a.type}
            </div>
            <div className="text-xs text-neutral-500">
              {a.type} · {a.status}
            </div>
          </div>
          <div className="text-xs text-neutral-400">
            {new Date(a.created_at).toLocaleString()}
          </div>
        </div>
      ))}
    </div>
  );
}
