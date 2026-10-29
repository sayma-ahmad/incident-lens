import Link from "next/link";
import { Chip, ConfidenceBadge } from "@/components/ui";
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

function getPlainSummary(item: IncidentItem): string {
  if (item.explanationTemplate) {
    // Explanation template contains sentences like:
    // "71 alerts from NAGP1 arrived between 11 Oct 2026 09:54 and 10:52 IST, mostly 'link down' on access switches. The earliest, most upstream alert was ..."
    const parts = item.explanationTemplate.split(". ");
    if (parts.length > 0 && parts[0]?.trim()) {
      return parts.length > 1 && parts[1]?.trim()
        ? `${parts[0].trim()}. ${parts[1].trim()}.`
        : `${parts[0].trim()}.`;
    }
  }

  if (item.rootSubject) {
    return `Root cause alert: ${item.rootSubject}`;
  }

  return "Related alerts grouped by site within a 15-minute window.";
}

export function IncidentCard({ item }: { item: IncidentItem }) {
  const summaryText = getPlainSummary(item);
  const dotCount = Math.min(item.memberCount - 1, 7);

  return (
    <Link
      href={`/incidents/${encodeURIComponent(item.id)}`}
      className="flex flex-col justify-between rounded-xl border border-line bg-surface p-5 shadow-xs transition hover:border-accent hover:shadow-md group"
    >
      <div className="space-y-3">
        {/* Top badges & chips */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <Chip className="font-bold">Site {item.site}</Chip>
            <Chip>
              {dateFormat.format(item.startedAt)}, {timeFormat.format(item.startedAt)} –{" "}
              {timeFormat.format(item.endedAt)} IST
            </Chip>
            <Chip>
              {item.memberCount} alerts
              {item.repeatTotal > 0 && (
                <span className="text-muted font-normal">
                  {" "}
                  (+{item.repeatTotal} repeats)
                </span>
              )}
            </Chip>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="rounded-full bg-chip px-2 py-0.5 text-[11px] font-semibold text-heading border border-line">
              Probable
            </span>
            <ConfidenceBadge confidence={item.confidence} />
          </div>
        </div>

        {/* Incident ID and AI Explained tag */}
        <div className="flex items-center justify-between gap-2 pt-0.5">
          <span className="font-mono text-xs font-semibold text-muted group-hover:text-accent transition">
            {item.id}
          </span>
          {item.hasAi && (
            <span className="inline-flex items-center gap-1 rounded-full bg-chip px-2 py-0.5 text-[11px] font-bold text-heading border border-line">
              <svg
                className="size-3 text-accent"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3z" />
              </svg>
              <span>AI explained</span>
            </span>
          )}
        </div>

        {/* Plain language summary sentence */}
        <p className="text-sm text-body line-clamp-2 leading-relaxed">
          {summaryText}
        </p>

        {/* Small timeline strip: Red dot for root alert, grey dots for other alerts */}
        <div className="flex items-center gap-1.5 py-1" aria-hidden="true">
          <span
            className="size-2.5 rounded-full bg-accent ring-2 ring-accent/30"
            title="Root alert"
          />
          {Array.from({ length: Math.max(0, dotCount) }).map((_, i) => (
            <span key={i} className="size-1.5 rounded-full bg-muted/50" />
          ))}
          {item.memberCount > 8 && (
            <span className="text-[10px] font-medium text-muted">
              +{item.memberCount - 8}
            </span>
          )}
        </div>
      </div>

      {/* Footer / Recommended team */}
      <div className="mt-4 pt-3 border-t border-line flex flex-wrap items-center justify-between gap-2 text-xs">
        <div>
          <span className="text-muted">Teams today: </span>
          <span className="font-medium text-heading">{item.teamsToday ?? 0}</span>
          <span className="text-muted"> → Recommended: </span>
          <strong className="text-accent font-bold">
            {item.primaryTeam ?? "Needs triage"}
          </strong>
        </div>

        <span className="text-accent font-semibold group-hover:translate-x-0.5 transition-transform">
          View details →
        </span>
      </div>
    </Link>
  );
}
