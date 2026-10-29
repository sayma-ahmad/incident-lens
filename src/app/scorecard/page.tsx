import Link from "next/link";

import { ConfidenceChip } from "@/components/incidents/confidence-chip";
import { getScorecard } from "@/server/db/incidents-queries";

export const dynamic = "force-dynamic";

const num = (n: number | null | undefined) => (n ?? 0).toLocaleString("en-IN");

function Tile({
  title,
  value,
  detail,
  target,
  met,
}: {
  title: string;
  value: string;
  detail: React.ReactNode;
  target?: string;
  met?: boolean;
}) {
  const ring = met === undefined ? "border-gray-200" : met ? "border-green-300" : "border-red-300";
  return (
    <div className={`flex flex-col gap-1 rounded-lg border bg-white p-5 shadow-sm ${ring}`}>
      <div className="text-xs font-medium uppercase tracking-wide text-gray-500">{title}</div>
      <div className="text-3xl font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-600">{detail}</div>
      {target && (
        <div className={`mt-1 text-xs font-medium ${met ? "text-green-700" : "text-red-700"}`}>
          Target {target} · {met ? "met" : "not met"}
        </div>
      )}
    </div>
  );
}

const VERDICTS: { key: string; label: string }[] = [
  { key: "correct", label: "Correct" },
  { key: "wrong", label: "Wrong" },
  { key: "split", label: "Should be split" },
];

export default async function ScorecardPage() {
  const s = await getScorecard();
  const c = s.compression;
  const disagreeCount = (s.agreement.compared ?? 0) - (s.agreement.agreed ?? 0);
  const feedbackTotal = s.feedback.reduce((sum, f) => sum + f.count, 0);

  return (
    <main className="mx-auto max-w-7xl p-6">
      <h1 className="text-2xl font-bold text-gray-900">Scorecard</h1>
      <p className="mt-1 text-sm text-gray-500">
        Shadow-mode results on {num(c?.total_alerts)} alerts from 1 Oct 2026. Groupings are probable, not confirmed.
      </p>

      <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Tile
          title="Alert compression (overall)"
          value={`${c?.compression_ratio ?? 0} : 1`}
          detail={`${num(c?.total_alerts)} alerts → ${num(c?.incidents)} incidents + ${num(c?.single_alerts)} single alerts`}
        />
        <Tile
          title="Alert compression (storms, 5+ alerts)"
          value={`${c?.storm_ratio ?? 0} : 1`}
          detail={`${num(c?.storm_alerts)} alerts → ${num(c?.storm_incidents)} incidents`}
          target="≥ 5 : 1"
          met={(c?.storm_ratio ?? 0) >= 5}
        />
        <Tile
          title="Repeats removed"
          value={num(c?.repeats)}
          detail={`${c?.repeat_share ?? 0}% of all alerts (same host and symptom within 10 min)`}
        />
        <Tile
          title="Team hand-offs avoided"
          value={`${s.teams?.avoided_pct ?? 0}%`}
          detail={`${num(s.teams?.teams_touched)} teams touched today → ${num(s.teams?.teams_recommended)} recommended (${num(s.teams?.teams_avoided)} avoided). RID-BOT is not counted as a team.`}
          target="≥ 50% fewer"
          met={(s.teams?.avoided_pct ?? 0) >= 50}
        />
        <Tile
          title="Team agreement (Top-1)"
          value={`${s.agreement.agreement_pct ?? 0}%`}
          detail={`${num(s.agreement.agreed)} of ${num(s.agreement.compared)} incidents: primary team = root alert's own department (RID-BOT and Doc Support ignored)`}
          target="≥ 80%"
          met={(s.agreement.agreement_pct ?? 0) >= 80}
        />
        <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Confidence spread</div>
          <ul className="space-y-2">
            {s.confidence.map((row) => (
              <li key={row.confidence ?? "none"} className="flex items-center justify-between">
                <Link href={`/incidents?confidence=${row.confidence ?? ""}`} className="hover:underline">
                  <ConfidenceChip confidence={row.confidence} />
                </Link>
                <span className="text-lg font-semibold text-gray-900">{num(row.incidents)}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-6 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Engineer feedback so far</h2>
        {feedbackTotal === 0 ? (
          <p className="mt-2 text-sm text-gray-500">No feedback yet. Use the buttons on an incident page.</p>
        ) : (
          <dl className="mt-3 grid grid-cols-3 gap-4">
            {VERDICTS.map((v) => (
              <div key={v.key}>
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">{v.label}</dt>
                <dd className="text-2xl font-bold text-gray-900">
                  {num(s.feedback.find((f) => f.verdict === v.key)?.count)}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      <section className="mt-6 rounded-lg border border-gray-200 bg-white shadow-sm">
        <h2 className="border-b border-gray-200 px-5 py-3 text-lg font-semibold text-gray-900">
          Team disagreements for review{" "}
          <span className="text-sm font-normal text-gray-500">
            ({num(disagreeCount)}
            {disagreeCount > s.agreement.disagreements.length ? `, largest ${s.agreement.disagreements.length} shown` : ""})
          </span>
        </h2>
        {s.agreement.disagreements.length === 0 ? (
          <p className="p-5 text-sm text-gray-500">No disagreements.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-3 py-2">Incident</th>
                  <th className="px-3 py-2">Site</th>
                  <th className="px-3 py-2">Alerts</th>
                  <th className="px-3 py-2">Recommended team</th>
                  <th className="px-3 py-2">Root alert's department</th>
                  <th className="px-3 py-2">Confidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {s.agreement.disagreements.map((d) => (
                  <tr key={d.id} className="text-gray-800">
                    <td className="px-3 py-2 font-mono text-xs">
                      <Link href={`/incidents/${encodeURIComponent(d.id)}`} className="text-blue-600 hover:underline">
                        {d.id}
                      </Link>
                    </td>
                    <td className="px-3 py-2">{d.site}</td>
                    <td className="px-3 py-2">{d.member_count}</td>
                    <td className="px-3 py-2">{d.primary_team}</td>
                    <td className="px-3 py-2">{d.root_department}</td>
                    <td className="px-3 py-2">
                      <ConfidenceChip confidence={d.confidence} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="mt-6 rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-600">
        {s.note} These numbers measure grouping and routing behaviour, not accuracy.
      </p>
    </main>
  );
}
