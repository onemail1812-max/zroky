"use client";

import { useEffect, useState } from "react";

type ReferencePlaybook = {
  type: "video";
  source: "youtube" | "vimeo" | "other";
  url: string;
  title?: string;
  notes?: string;
};

type Guideline = {
  content_json: {
    instructions?: string;
    reference_playbooks?: ReferencePlaybook[];
    [key: string]: any;
  };
  content_text?: string;
};

export default function EmployeeGuidelinesPage({
  params,
}: {
  params: { id: string };
}) {
  const employeeId = params.id;
  const [guideline, setGuideline] = useState<Guideline | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadGuideline() {
      setLoading(true);
      const res = await fetch(`/api/employees/${employeeId}/guidelines`);
      if (res.ok) {
        const data = await res.json();
        setGuideline(data);
      }
      setLoading(false);
    }
    loadGuideline();
  }, [employeeId]);

  if (loading) {
    return (
      <div className="px-4 py-6 text-sm text-neutral-500">
        Loading guidelines…
      </div>
    );
  }

  if (!guideline) {
    return (
      <div className="px-4 py-6 text-sm text-neutral-500">
        No guidelines found.
      </div>
    );
  }

  const playbooks = guideline.content_json?.reference_playbooks || [];

  return (
    <div className="h-full w-full rounded-xl bg-neutral-50 p-6 space-y-6">
      <div>
        <h2 className="text-sm font-medium text-neutral-900">
          Guidelines (Read Only)
        </h2>
        <p className="text-xs text-neutral-500">
          These guide Shlok’s behavior. Reference playbooks are advisory only.
        </p>
      </div>

      {guideline.content_json?.instructions && (
        <div className="rounded-xl bg-white shadow-sm p-4">
          <div className="text-xs text-neutral-500 mb-1">Instructions</div>
          <div className="text-sm text-neutral-900 whitespace-pre-wrap">
            {guideline.content_json.instructions}
          </div>
        </div>
      )}

      {playbooks.length > 0 && (
        <div className="rounded-xl bg-white shadow-sm p-4 space-y-3">
          <div className="text-xs text-neutral-500">
            Reference Playbooks (Advisory)
          </div>
          {playbooks.map((pb, idx) => (
            <div key={idx} className="rounded-lg bg-neutral-50 p-3 text-sm">
              <div className="font-medium text-neutral-900">
                {pb.title || pb.url}
              </div>
              <div className="text-xs text-neutral-500">
                Source: {pb.source}
              </div>
              {pb.notes && (
                <div className="text-xs text-neutral-600 mt-1">
                  {pb.notes}
                </div>
              )}
              <a
                href={pb.url}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-blue-600 underline mt-1 inline-block"
              >
                Open reference
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
