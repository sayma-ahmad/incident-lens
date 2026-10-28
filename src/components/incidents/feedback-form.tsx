"use client";

import { useState } from "react";

type Verdict = "correct" | "wrong" | "split";

const OPTIONS: { verdict: Verdict; label: string; style: string }[] = [
  { verdict: "correct", label: "Correct", style: "bg-green-600 hover:bg-green-700" },
  { verdict: "wrong", label: "Wrong", style: "bg-red-600 hover:bg-red-700" },
  { verdict: "split", label: "Should be split", style: "bg-amber-600 hover:bg-amber-700" },
];

export function FeedbackForm({ incidentId }: { incidentId: string }) {
  const [note, setNote] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saved, setSaved] = useState<Verdict | null>(null);

  async function submit(verdict: Verdict) {
    setState("saving");
    try {
      const res = await fetch(`/api/incidents/${encodeURIComponent(incidentId)}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(note.trim() ? { verdict, note: note.trim() } : { verdict }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setSaved(verdict);
      setNote("");
      setState("saved");
    } catch {
      setState("error");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={1000}
        rows={2}
        placeholder="Optional note, e.g. which alerts do not belong"
        className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
      />
      <div className="flex flex-wrap items-center gap-2">
        {OPTIONS.map((o) => (
          <button
            key={o.verdict}
            type="button"
            disabled={state === "saving"}
            onClick={() => submit(o.verdict)}
            className={`rounded px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50 ${o.style}`}
          >
            {o.label}
          </button>
        ))}
        {state === "saving" && <span className="text-sm text-gray-500">Saving…</span>}
        {state === "saved" && (
          <span className="text-sm font-medium text-green-700">
            Thanks, saved ({OPTIONS.find((o) => o.verdict === saved)?.label}).
          </span>
        )}
        {state === "error" && <span className="text-sm font-medium text-red-700">Could not save. Please try again.</span>}
      </div>
    </div>
  );
}
