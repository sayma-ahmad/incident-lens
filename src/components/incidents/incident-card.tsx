import Link from "next/link";
import type { listIncidents } from "@/server/db/incidents-queries";

type IncidentItem = Awaited<ReturnType<typeof listIncidents>>["items"][number];

const timeFormat = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const dateFormat = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  day: "2-digit",
  month: "short",
});

function probableCause(item: IncidentItem): string {
  const match = item.explanationTemplate?.match(/most upstream alert was \S+ \(([^)]+)\)/);
  if (match?.[1]) {
    const text = match[1].trim();
    return text.charAt(0).toUpperCase() + text.slice(1);
  }
  return item.rootSubject ?? "Not identified";
}

const CONFIDENCE_DOT: Record<string, { dot: string; label: string }> = {
  high: { dot: "bg-accent", label: "High confidence" },
  medium: { dot: "bg-heading", label: "Medium confidence" },
  low: { dot: "bg-muted/50", label: "Low confidence" },
};

function ConfidenceDot({ confidence }: { confidence: string | null }) {
  const c = CONFIDENCE_DOT[(confidence ?? "low").toLowerCase()] ?? CONFIDENCE_DOT.low!;
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-[11px] font-semibold text-heading">
      <span className={`size-2 rounded-full ${c.dot}`} aria-hidden="true" />
      {c.label}
    </span>
  );
}

export function IncidentCard({ item }: { item: IncidentItem }) {
  return (
    <Link
      href={`/incidents/${encodeURIComponent(item.id)}`}
      className="group relative flex flex-col overflow-hidden rounded-xl border border-line bg-surface p-5 shadow-xs transition hover:border-muted/60 hover:shadow-md focus:outline-none"
    >
      <div className="flex-1">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-bold text-heading">{item.site}</p>
          <p className="mt-0.5 text-xs text-muted">
            {dateFormat.format(item.startedAt)} · {timeFormat.format(item.startedAt)} – {timeFormat.format(item.endedAt)} IST
          </p>
        </div>
        <ConfidenceDot confidence={item.confidence} />
      </div>

      <div className="mt-4 flex items-baseline gap-2">
        <span className="text-3xl font-bold tracking-tight text-heading">{item.memberCount}</span>
        <span className="text-sm text-body">alerts</span>
        {item.repeatTotal > 0 && (
          <span className="text-xs text-muted">+{item.repeatTotal} {item.repeatTotal === 1 ? "repeat" : "repeats"}</span>
        )}
      </div>

      <p className="mt-3 text-sm text-body line-clamp-2">
        <span className="font-semibold text-heading">Probable cause: </span>
        {probableCause(item)}
      </p>
      </div>

      <div className="mt-5 flex items-end justify-between gap-3 border-t border-line pt-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Recommended team</p>
          <p className="mt-0.5 text-sm font-bold text-heading">{item.primaryTeam ?? "Needs triage"}</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-white shadow-xs transition duration-200 lg:translate-y-2 lg:opacity-0 lg:group-hover:translate-y-0 lg:group-hover:opacity-100 lg:group-focus-visible:translate-y-0 lg:group-focus-visible:opacity-100">
          <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3z" />
          </svg>
          View AI summary
          <span aria-hidden="true">→</span>
        </span>
      </div>
    </Link>
  );
}
