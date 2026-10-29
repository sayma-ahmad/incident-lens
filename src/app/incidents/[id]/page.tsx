import Link from "next/link";
import { notFound } from "next/navigation";

import {
  Chip,
  ConfidenceBadge,
  Disclosure,
  ProbableNotice,
} from "@/components/ui";
import { AiInsightCard } from "@/components/ai/ai-insight-card";
import { FeedbackForm } from "@/components/incidents/feedback-form";
import { IncidentTimeline } from "@/components/incidents/incident-timeline";
import { getIncident } from "@/server/db/incidents-queries";
import { reasonLabel } from "@/lib/labels";

export const dynamic = "force-dynamic";

const dateTime = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const time = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

const dateFormat = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  day: "2-digit",
  month: "short",
});

const timeWindowFormat = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const VERDICT_LABEL: Record<string, string> = {
  correct: "Correct",
  wrong: "Wrong",
  split: "Should be split",
};

function label(value: string | null) {
  return value ? value.replace(/_/g, " ") : "–";
}

export default async function IncidentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const incident = await getIncident(decodeURIComponent(id));
  if (!incident) notFound();

  const minutes = Math.max(
    Math.round((incident.endedAt.getTime() - incident.startedAt.getTime()) / 60000),
    0
  );
  const recommended = incident.primaryTeam ? 1 : 0;

  return (
    <main className="mx-auto max-w-7xl p-6 space-y-6">
      {/* 1. Header */}
      <div>
        <Link
          href="/incidents"
          className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
        >
          <span>←</span>
          <span>Back to incidents</span>
        </Link>

        <div className="mt-4">
          <ProbableNotice />
        </div>

        <div className="mt-4">
          <p className="font-mono text-xs font-semibold text-muted">
            {incident.id}
          </p>
          <h1 className="mt-1 text-2xl font-bold text-heading sm:text-3xl">
            Probable incident at {incident.site}
          </h1>
        </div>

        {/* Chips row */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Chip className="font-bold">Site {incident.site}</Chip>
          <Chip>
            {dateFormat.format(incident.startedAt)},{" "}
            {timeWindowFormat.format(incident.startedAt)} –{" "}
            {timeWindowFormat.format(incident.endedAt)} IST ({minutes} min)
          </Chip>
          <Chip>{incident.memberCount} alerts</Chip>
          {incident.repeatTotal > 0 && (
            <Chip>{incident.repeatTotal} repeats removed</Chip>
          )}

          <div className="flex items-center gap-1.5 ml-auto">
            <span className="rounded-full bg-chip px-2.5 py-0.5 text-xs font-semibold text-heading border border-line">
              Probable
            </span>
            <ConfidenceBadge confidence={incident.confidence} />
            {incident.confidenceReason && (
              <span className="text-xs text-muted hidden sm:inline">
                ({incident.confidenceReason})
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 2. Shared AI explanation card */}
      <AiInsightCard
        incident={incident}
        rootAlertHref={`#alert-${incident.rootAlertId}`}
      />

      {/* 3. How this incident was formed */}
      <section className="rounded-xl border border-line bg-surface p-6 shadow-xs">
        <h2 className="text-lg font-semibold text-heading">
          How this incident was formed
        </h2>
        <p className="mt-1 text-xs text-muted">
          Three correlation steps grouped individual alerts into this single probable incident.
        </p>
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-line bg-chip/30 p-4">
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-full bg-panel text-xs font-bold text-on-panel">
                1
              </span>
              <h3 className="text-sm font-semibold text-heading">
                Time & site grouping
              </h3>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-body">
              <strong className="font-semibold text-heading">
                {incident.memberCount} alerts
              </strong>{" "}
              arrived from site{" "}
              <strong className="font-semibold text-heading">
                {incident.site}
              </strong>{" "}
              within a 15-minute sliding window.
            </p>
          </div>

          <div className="rounded-lg border border-line bg-chip/30 p-4">
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-full bg-panel text-xs font-bold text-on-panel">
                2
              </span>
              <h3 className="text-sm font-semibold text-heading">
                Repeat deduplication
              </h3>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-body">
              <strong className="font-semibold text-heading">
                {incident.repeatTotal} repeat alerts
              </strong>{" "}
              deduplicated (matching same host and symptom within 10 minutes).
            </p>
          </div>

          <div className="rounded-lg border border-line bg-chip/30 p-4">
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-full bg-panel text-xs font-bold text-on-panel">
                3
              </span>
              <h3 className="text-sm font-semibold text-heading">
                Probable root cause
              </h3>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-body">
              Root cause selected based on device tier upstream order, symptom severity
              ranking, and earliest timestamp.
              {incident.rootAlertId && (
                <span className="mt-1 block font-mono text-[11px] text-muted">
                  Root alert: {incident.rootAlertId}
                </span>
              )}
            </p>
          </div>
        </div>
      </section>

      {/* 4. Visual timeline */}
      <section className="rounded-xl border border-line bg-surface p-6 shadow-xs">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-heading">Incident timeline</h2>
          <p className="mt-0.5 text-xs text-muted">
            Alerts organized by network hierarchy and timestamp. Probable root cause is marked with red dot.
          </p>
        </div>
        <IncidentTimeline members={incident.members} />
      </section>

      {/* 5. Teams */}
      <section className="rounded-xl border border-line bg-surface p-6 shadow-xs">
        <h2 className="text-lg font-semibold text-heading">
          Teams & dispatch recommendation
        </h2>
        <p className="mt-0.5 text-xs text-muted">
          Recommends a single primary team to eliminate duplicate team dispatches.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border border-line p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted">
              Recommended primary team
            </div>
            <div className="mt-1 text-xl font-bold text-accent">
              {incident.primaryTeam ?? "Needs triage"}
            </div>
            <div className="mt-1 text-xs text-muted">
              Direct dispatch recommended for root cause resolution
            </div>
          </div>

          <div className="rounded-lg border border-line p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted">
              Supporting teams
            </div>
            <div className="mt-1 text-base font-semibold text-heading">
              {incident.supportingTeams || "None"}
            </div>
            <div className="mt-1 text-xs text-muted">
              Informed for downstream context if needed
            </div>
          </div>

          <div className="rounded-lg border border-line p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted">
              Teams dispatched today vs recommended
            </div>
            <div className="mt-2 flex items-center gap-3">
              <div className="rounded border border-line bg-chip px-3 py-1 text-center">
                <div className="text-xl font-bold text-heading">
                  {incident.teamsToday ?? 0}
                </div>
                <div className="text-[10px] uppercase text-muted">Today</div>
              </div>
              <span className="text-lg font-bold text-muted">→</span>
              <div className="rounded border border-line bg-accent/10 px-3 py-1 text-center">
                <div className="text-xl font-bold text-accent">{recommended}</div>
                <div className="text-[10px] uppercase text-muted">Recommended</div>
              </div>
            </div>
            <div className="mt-2 text-xs text-muted">
              {incident.teamsToday && incident.teamsToday > recommended
                ? `Consolidates work from ${incident.teamsToday} teams to ${recommended}.`
                : "Single team dispatch recommended."}
            </div>
          </div>
        </div>
      </section>

      {/* 6. Feedback */}
      <section className="rounded-xl border border-line bg-surface p-6 shadow-xs">
        <h2 className="text-lg font-semibold text-heading">Is this grouping right?</h2>
        <p className="mt-0.5 text-xs text-muted">
          Your answer is stored for the scorecard. Nothing is sent to ServiceNow.
        </p>
        <div className="mt-4">
          <FeedbackForm incidentId={incident.id} />
        </div>
        {incident.feedback.length > 0 && (
          <div className="mt-5 border-t border-line pt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
              Previous feedback
            </h3>
            <ul className="mt-2 space-y-2 text-sm text-body">
              {incident.feedback.map((f) => (
                <li key={f.id} className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-heading">
                    {VERDICT_LABEL[f.verdict] ?? f.verdict}
                  </span>
                  <span className="text-muted">· {dateTime.format(f.createdAt)}</span>
                  {f.note && <span className="text-body">– {f.note}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* 7. All alerts table */}
      <Disclosure
        title={`Show all ${incident.members.length} alerts as a table`}
        className="shadow-xs"
      >
        <div className="overflow-x-auto border-t border-line">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-chip text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Time (IST)</th>
                <th className="px-4 py-3">Alert ID</th>
                <th className="px-4 py-3">Subject</th>
                <th className="px-4 py-3">Device type</th>
                <th className="px-4 py-3">Symptom</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Reason codes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {incident.members.map((m) => (
                <tr
                  key={m.alertId}
                  className={
                    m.isRoot
                      ? "bg-accent/10 font-medium"
                      : m.isRepeat
                      ? "text-muted"
                      : "text-body"
                  }
                >
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">
                    {time.format(m.createdAt)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">
                    {m.alertId}
                    {m.isRoot && (
                      <span className="ml-2 rounded bg-accent px-1.5 py-0.5 font-sans text-[10px] font-semibold uppercase text-white">
                        Probable root
                      </span>
                    )}
                    {m.isRepeat && m.repeatOf && (
                      <div className="font-sans text-[11px] text-muted">
                        repeat of {m.repeatOf}
                      </div>
                    )}
                  </td>
                  <td className="max-w-md px-4 py-3 text-xs">{m.subject}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs">
                    {label(m.deviceType)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs">
                    {label(m.symptom)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs">
                    {m.department ?? "–"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(m.reason ?? "")
                        .split(",")
                        .map((r) => r.trim())
                        .filter(Boolean)
                        .map((r) => (
                          <span
                            key={r}
                            className="rounded bg-chip px-2 py-0.5 text-[11px] font-medium text-heading border border-line"
                          >
                            {reasonLabel(r)}
                          </span>
                        ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Disclosure>
    </main>
  );
}
