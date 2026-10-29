import Link from "next/link";
import { notFound } from "next/navigation";

import { ConfidenceChip } from "@/components/incidents/confidence-chip";
import { FeedbackForm } from "@/components/incidents/feedback-form";
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

const VERDICT_LABEL: Record<string, string> = { correct: "Correct", wrong: "Wrong", split: "Should be split" };

function label(value: string | null) {
  return value ? value.replace(/_/g, " ") : "–";
}

function Field({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">{name}</dt>
      <dd className="mt-0.5 text-sm text-gray-900">{children}</dd>
    </div>
  );
}

export default async function IncidentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const incident = await getIncident(decodeURIComponent(id));
  if (!incident) notFound();

  const minutes = Math.max(Math.round((incident.endedAt.getTime() - incident.startedAt.getTime()) / 60000), 0);
  const recommended = incident.primaryTeam ? 1 : 0;

  return (
    <main className="mx-auto max-w-7xl p-6">
      <Link href="/incidents" className="text-sm text-blue-600 hover:underline">
        ← Back to incidents
      </Link>

      <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
        Probable correlation – needs engineer confirmation.
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-gray-900">{incident.id}</h1>
        <ConfidenceChip confidence={incident.confidence} />
      </div>

      <section className="mt-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Field name="Site">{incident.site}</Field>
          <Field name="Window (IST)">
            {dateTime.format(incident.startedAt)} – {time.format(incident.endedAt)} ({minutes} min)
          </Field>
          <Field name="Alerts">{incident.memberCount}</Field>
          <Field name="Repeats removed">{incident.repeatTotal}</Field>
          <Field name="Primary team">{incident.primaryTeam ?? "Needs triage"}</Field>
          <Field name="Supporting teams">{incident.supportingTeams ?? "None"}</Field>
          <Field name="Teams touched today → recommended">
            {incident.teamsToday ?? 0} → {recommended}
          </Field>
          <Field name="Confidence">
            <span className="capitalize">{incident.confidence ?? "low"}</span>
            {incident.confidenceReason && <span className="text-gray-600"> – {incident.confidenceReason}</span>}
          </Field>
        </dl>
      </section>

      <section className="mt-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-2 flex items-center gap-2">
          <h2 className="text-lg font-semibold text-gray-900">Explanation</h2>
          {incident.explanationAi ? (
            <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800 ring-1 ring-purple-300">
              AI-generated{incident.aiModel ? ` · ${incident.aiModel}` : ""}
            </span>
          ) : (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 ring-1 ring-gray-300">
              Rule-based summary
            </span>
          )}
        </div>
        <p className="text-sm leading-relaxed text-gray-800">
          {incident.explanationAi ?? incident.explanationTemplate ?? "No explanation available."}
        </p>
      </section>

      <section className="mt-4 rounded-lg border border-gray-200 bg-white shadow-sm">
        <h2 className="border-b border-gray-200 px-5 py-3 text-lg font-semibold text-gray-900">
          Timeline <span className="text-sm font-normal text-gray-500">({incident.members.length} rows)</span>
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-3 py-2">Time (IST)</th>
                <th className="px-3 py-2">Alert ID</th>
                <th className="px-3 py-2">Subject</th>
                <th className="px-3 py-2">Device type</th>
                <th className="px-3 py-2">Symptom</th>
                <th className="px-3 py-2">Department</th>
                <th className="px-3 py-2">Reason codes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {incident.members.map((m) => (
                <tr
                  key={m.alertId}
                  className={m.isRoot ? "bg-blue-50 font-medium" : m.isRepeat ? "text-gray-400" : "text-gray-800"}
                >
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">{time.format(m.createdAt)}</td>
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">
                    {m.alertId}
                    {m.isRoot && (
                      <span className="ml-2 rounded bg-blue-600 px-1.5 py-0.5 font-sans text-[10px] font-semibold uppercase text-white">
                        Probable root
                      </span>
                    )}
                    {m.isRepeat && m.repeatOf && <div className="font-sans text-[11px]">repeat of {m.repeatOf}</div>}
                  </td>
                  <td className="max-w-md px-3 py-2 text-xs">{m.subject}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs">{label(m.deviceType)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs">{label(m.symptom)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs">{m.department ?? "–"}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {(m.reason ?? "")
                        .split(",")
                        .map((r) => r.trim())
                        .filter(Boolean)
                        .map((r) => (
                          <span key={r} className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-700">
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
      </section>

      <section className="mt-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-1 text-lg font-semibold text-gray-900">Is this grouping right?</h2>
        <p className="mb-3 text-sm text-gray-600">Your answer is stored for the scorecard. Nothing is sent to ServiceNow.</p>
        <FeedbackForm incidentId={incident.id} />
        {incident.feedback.length > 0 && (
          <ul className="mt-4 space-y-1 border-t border-gray-100 pt-3 text-sm text-gray-700">
            {incident.feedback.map((f) => (
              <li key={f.id}>
                <span className="font-medium">{VERDICT_LABEL[f.verdict] ?? f.verdict}</span>
                <span className="text-gray-500"> · {dateTime.format(f.createdAt)}</span>
                {f.note && <span> – {f.note}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
