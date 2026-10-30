"use client";

import { useState } from "react";

type Verdict = "correct" | "wrong" | "split";

const OPTIONS: { verdict: Verdict; label: string; style: string }[] = [
  { verdict: "correct", label: "Correct", style: "bg-accent text-white hover:bg-accent/90 focus:ring-2 focus:ring-accent" },
  { verdict: "wrong", label: "Wrong", style: "bg-panel text-on-panel hover:bg-panel/90 focus:ring-2 focus:ring-panel" },
  { verdict: "split", label: "Should be split", style: "border border-line bg-surface text-heading hover:bg-chip focus:ring-2 focus:ring-accent" },
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
        className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-body outline-none focus:border-accent focus:ring-1 focus:ring-accent"
      />
      <div className="flex flex-wrap items-center gap-2">
        {OPTIONS.map((o) => (
          <button
            key={o.verdict}
            type="button"
            disabled={state === "saving"}
            onClick={() => submit(o.verdict)}
            className={`min-h-[40px] rounded-lg px-4 py-2 text-sm font-semibold transition disabled:opacity-50 ${o.style}`}
          >
            {o.label}
          </button>
        ))}
        {state === "saving" && <span className="text-sm text-muted">Saving…</span>}
        {state === "saved" && (
          <span className="text-sm font-semibold text-accent">
            Thanks, saved ({OPTIONS.find((o) => o.verdict === saved)?.label}).
          </span>
        )}
        {state === "error" && <span className="text-sm font-medium text-accent">Could not save. Please try again.</span>}
      </div>
    </div>
  );
}
