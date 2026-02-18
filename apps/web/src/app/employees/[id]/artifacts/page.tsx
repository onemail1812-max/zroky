"use client";

export default function EmployeeArtifactsPage({
  params,
}: {
  params: { id: string };
}) {
  const employeeId = params.id;

  return (
    <div className="h-full w-full rounded-xl bg-neutral-50 flex items-center justify-center">
      <div className="text-neutral-400">Artifacts for employee {employeeId} - Under Construction</div>
    </div>
  );
}
