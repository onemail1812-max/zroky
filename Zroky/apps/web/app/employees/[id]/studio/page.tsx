"use client";

import { useState } from "react";

export default function EmployeeStudioPage({
  params,
}: {
  params: { id: string };
}) {
  const employeeId = params.id;
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  async function generateImage() {
    if (!prompt.trim()) return;
    setLoading(true);

    const res = await fetch(`/api/artifacts/image/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employee_id: employeeId,
        prompt,
        width: 1080,
        height: 1080,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      setResult(data);
    }

    setLoading(false);
  }

  return (
    <div className="h-full w-full rounded-xl bg-neutral-50 p-6 space-y-6">
      <div>
        <h2 className="text-sm font-medium text-neutral-900">
          Creative Studio (Draft Only)
        </h2>
        <p className="text-xs text-neutral-500">
          Images generated here are drafts and require approval before use.
        </p>
      </div>

      <div className="space-y-3">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe the image you want Shlok to generate…"
          className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
          rows={3}
        />
        <button
          onClick={generateImage}
          disabled={loading}
          className="rounded-xl bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {loading ? "Generating…" : "Generate Image"}
        </button>
      </div>

      {result && (
        <div className="rounded-xl bg-white shadow-sm p-4">
          <div className="text-xs text-neutral-500 mb-2">
            Draft Image Artifact
          </div>
          {result.image_url && (
            <img
              src={result.image_url}
              alt="Generated"
              className="rounded-lg max-w-full"
            />
          )}
        </div>
      )}
    </div>
  );
}
