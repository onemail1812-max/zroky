"use client";

import ArtifactsList from "@/components/artifacts/ArtifactsList";

export default function EmployeeArtifactsPage({
  params,
}: {
  params: { id: string };
}) {
  const employeeId = params.id;

  return (
    <div className="h-full w-full rounded-xl bg-neutral-50">
      <ArtifactsList employeeId={employeeId} />
    </div>
  );
}
