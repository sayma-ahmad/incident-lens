import Link from "next/link";

import { ConfidenceChip } from "@/components/incidents/confidence-chip";
import type { listIncidents } from "@/server/db/incidents-queries";

type IncidentItem = Awaited<ReturnType<typeof listIncidents>>["items"][number];

const dateTime = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const time = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function shorten(text: string | null, max = 90) {
  if (!text) return "–";
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export function IncidentCard({ item }: { item: IncidentItem }) {
  return (
    <Link
      href={`/incidents/${encodeURIComponent(item.id)}`}
      className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition hover:border-blue-400 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-semibold text-gray-900">{item.site}</div>
          <div className="text-sm text-gray-500">
            {dateTime.format(item.startedAt)} – {time.format(item.endedAt)} IST
          </div>
        </div>
        <div className="flex items-center gap-1">
          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-blue-200">
            Probable
          </span>
          <ConfidenceChip confidence={item.confidence} />
        </div>
      </div>

      <div className="text-sm text-gray-700">
        <span className="text-2xl font-bold text-gray-900">{item.memberCount}</span> alerts
        {item.repeatTotal > 0 && <span className="text-gray-500"> (+{item.repeatTotal} repeats)</span>}
      </div>

      <div className="text-sm text-gray-700">
        Teams today: <span className="font-medium">{item.teamsToday ?? 0}</span> → Recommended:{" "}
        <span className="font-medium">{item.primaryTeam ?? "Needs triage"}</span>
      </div>

      <div className="truncate rounded bg-gray-50 px-2 py-1 font-mono text-xs text-gray-600" title={item.rootSubject ?? ""}>
        {shorten(item.rootSubject)}
      </div>
    </Link>
  );
}
