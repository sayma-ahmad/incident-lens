import Link from "next/link";
import {
  Bar,
  Card,
  Chip,
  ConfidenceBadge,
  Disclosure,
  EmptyState,
  PageHeader,
  SectionLabel,
} from "@/components/ui";
import { getScorecard } from "@/server/db/incidents-queries";

export const dynamic = "force-dynamic";

const num = (n: number | null | undefined) => (n ?? 0).toLocaleString("en-IN");

interface ResultCardProps {
  title: string;
  value: string;
  target?: string;
  met?: boolean;
  progressPct: number;
  progressLabel?: string;
  explanation: string;
  detail: React.ReactNode;
}

function ResultCard({
  title,
  value,
  target,
  met,
  progressPct,
  progressLabel,
  explanation,
  detail,
}: ResultCardProps) {
  const boundedPct = Math.max(0, Math.min(100, Math.round(progressPct)));

  return (
    <Card className="flex flex-col justify-between p-6 space-y-4">
      <div className="space-y-3">
        {/* Header: title and target status pill */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-muted">
            {title}
          </span>

          {target !== undefined && (
            <div className="flex items-center gap-1.5">
              {met ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-bold text-accent">
                  <span className="flex size-4 items-center justify-center rounded-full bg-accent text-white">
                    <svg
                      className="size-2.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                  <span>Target met</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-panel/10 px-2.5 py-0.5 text-xs font-bold text-heading">
                  <span className="flex size-4 items-center justify-center rounded-full border border-panel text-panel">
                    <svg
                      className="size-2.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </span>
                  <span>Target not met</span>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Big value and target */}
        <div>
          <div className="text-3xl sm:text-4xl font-extrabold text-heading tracking-tight">
            {value}
          </div>
          {target && (
            <div className="mt-1 text-xs text-muted">
              Target: <span className="font-semibold text-heading">{target}</span>
            </div>
          )}
        </div>

        {/* Progress bar towards target or metric level */}
        <div className="pt-1">
          <Bar
            label={progressLabel ?? (target ? "Progress towards target" : "Metric level")}
            value={`${boundedPct}%`}
            percentage={boundedPct}
            barColor={met ? "bg-accent" : "bg-panel"}
          />
        </div>

        {/* Plain-language explanation */}
        <p className="text-sm font-medium leading-relaxed text-body">
          {explanation}
        </p>
      </div>

      {/* Technical detail footnote */}
      <div className="pt-3 border-t border-line text-xs text-muted leading-relaxed">
        {detail}
      </div>
    </Card>
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

  // Confidence calculations
  const highConf = s.confidence.find((r) => r.confidence?.toLowerCase() === "high")?.incidents ?? 0;
  const medConf = s.confidence.find((r) => r.confidence?.toLowerCase() === "medium")?.incidents ?? 0;
  const lowConf = s.confidence.find((r) => r.confidence?.toLowerCase() === "low")?.incidents ?? 0;
  const totalConf = Math.max(highConf + medConf + lowConf, 1);

  const highPct = Math.round((highConf / totalConf) * 100);
  const medPct = Math.round((medConf / totalConf) * 100);
  const lowPct = Math.max(0, 100 - highPct - medPct);

  // Benchmarks calculations
  const stormRatio = c?.storm_ratio ?? 0;
  const stormTarget = 5;
  const stormProgress = stormTarget > 0 ? (stormRatio / stormTarget) * 100 : 0;

  const avoidedPct = s.teams?.avoided_pct ?? 0;
  const avoidedTarget = 50;
  const avoidedProgress = avoidedTarget > 0 ? (avoidedPct / avoidedTarget) * 100 : 0;

  const agreementPct = s.agreement.agreement_pct ?? 0;
  const agreementTarget = 80;
  const agreementProgress = agreementTarget > 0 ? (agreementPct / agreementTarget) * 100 : 0;

  return (
    <main className="mx-auto max-w-7xl p-6 space-y-10">
      {/* PageHeader */}
      <PageHeader
        sectionLabel="STEP 6 · RESULTS"
        title="Did it help?"
        description="What Incident Lens would have saved in October, compared with the targets we set."
        howToRead={[
          "Each tile shows the result, target, and whether the target was met.",
          "Any unmet target is shown honestly with its operational explanation.",
          "Alert compression measures how many individual alerts collapse into a single actionable incident.",
          "Hand-offs avoided measures reduction in disjoint team touches across tickets.",
          "Team agreement measures if our recommended primary team matches the department that resolved the root alert.",
          "These numbers measure grouping and routing behaviour, not subjective accuracy.",
        ]}
      />

      <div className="text-xs text-muted">
        Shadow-mode analysis on {num(c?.total_alerts)} alerts from 1 Oct 2026. Groupings are probable, not confirmed.
      </div>

      {/* 1. Five result cards */}
      <section className="space-y-4">
        <div>
          <SectionLabel>KEY BENCHMARKS</SectionLabel>
          <h2 className="mt-1 text-xl sm:text-2xl font-bold tracking-tight text-heading">
            Target scorecard
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* Card 1: Alert compression overall */}
          <ResultCard
            title="Alert compression overall"
            value={`${c?.compression_ratio ?? 0} : 1`}
            progressPct={Math.min(Math.round(((c?.compression_ratio ?? 1) / 2) * 100), 100)}
            progressLabel="Compression level"
            explanation="On average, 1.3 alerts become one thing to look at."
            detail={
              <span>
                {num(c?.total_alerts)} alerts → {num(c?.incidents)} incidents +{" "}
                {num(c?.single_alerts)} single alerts
              </span>
            }
          />

          {/* Card 2: Alert compression in storms */}
          <ResultCard
            title="Alert compression in storms"
            value={`${c?.storm_ratio ?? 0} : 1`}
            target="5 : 1"
            met={stormRatio >= stormTarget}
            progressPct={stormProgress}
            explanation="In alert storms, 11 alerts become one incident."
            detail={
              <span>
                {num(c?.storm_alerts)} alerts in storms (5+ alerts) →{" "}
                {num(c?.storm_incidents)} storm incidents
              </span>
            }
          />

          {/* Card 3: Repeats removed */}
          <ResultCard
            title="Repeats removed"
            value={`${num(c?.repeats)} (${c?.repeat_share ?? 0}%)`}
            progressPct={c?.repeat_share ?? 0}
            progressLabel="Deduplication rate"
            explanation="About 1 in 12 alerts was the same device repeating itself."
            detail={
              <span>
                {num(c?.repeats)} duplicate alerts matching identical host and symptom within 10 minutes.
              </span>
            }
          />

          {/* Card 4: Hand-offs avoided */}
          <ResultCard
            title="Hand-offs avoided"
            value={`${avoidedPct}%`}
            target="50%"
            met={avoidedPct >= avoidedTarget}
            progressPct={avoidedProgress}
            explanation="Most alerts are closed automatically by RID-BOT, so there were few hand-offs between teams to save."
            detail={
              <span>
                {num(s.teams?.teams_touched)} teams touched today →{" "}
                {num(s.teams?.teams_recommended)} recommended ({num(s.teams?.teams_avoided)} avoided).
                RID-BOT is not counted as a human team.
              </span>
            }
          />

          {/* Card 5: Team agreement */}
          <ResultCard
            title="Team agreement"
            value={`${agreementPct}%`}
            target="80%"
            met={agreementPct >= agreementTarget}
            progressPct={agreementProgress}
            explanation="In 98 of 100 comparable incidents, our recommended team is the team that handled the probable-cause alert."
            detail={
              <span>
                {num(s.agreement?.agreed)} of {num(s.agreement?.compared)} comparable incidents agreed.
                RID-BOT and Doc Support excluded as automated responders.
              </span>
            }
          />
        </div>
      </section>

      {/* 2. Confidence spread */}
      <section className="space-y-4">
        <div>
          <SectionLabel>GROUP QUALITY</SectionLabel>
          <h2 className="mt-1 text-xl sm:text-2xl font-bold tracking-tight text-heading">
            Confidence spread
          </h2>
          <p className="mt-1 text-xs text-muted">
            Shows distribution of incident grouping confidence based on network topology rules. Click any segment to view filtered incidents.
          </p>
        </div>

        <Card className="p-6 space-y-5">
          {/* Stacked horizontal bar */}
          <div className="space-y-2">
            <div className="flex h-6 w-full overflow-hidden rounded-lg bg-line">
              {highConf > 0 && (
                <Link
                  href="/incidents?confidence=high"
                  style={{ width: `${highPct}%` }}
                  className="group relative flex h-full items-center justify-center bg-panel text-[11px] font-bold text-on-panel transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-accent"
                  title={`High confidence: ${num(highConf)} incidents (${highPct}%)`}
                  aria-label={`High confidence: ${num(highConf)} incidents (${highPct}%)`}
                >
                  <span className="truncate px-1">{highPct}% High</span>
                </Link>
              )}
              {medConf > 0 && (
                <Link
                  href="/incidents?confidence=medium"
                  style={{ width: `${medPct}%` }}
                  className="group relative flex h-full items-center justify-center bg-muted text-[11px] font-bold text-white transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-accent"
                  title={`Medium confidence: ${num(medConf)} incidents (${medPct}%)`}
                  aria-label={`Medium confidence: ${num(medConf)} incidents (${medPct}%)`}
                >
                  <span className="truncate px-1">{medPct}% Med</span>
                </Link>
              )}
              {lowConf > 0 && (
                <Link
                  href="/incidents?confidence=low"
                  style={{ width: `${lowPct}%` }}
                  className="group relative flex h-full items-center justify-center bg-chip text-[11px] font-bold text-heading border-l border-line transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-accent"
                  title={`Low confidence: ${num(lowConf)} incidents (${lowPct}%)`}
                  aria-label={`Low confidence: ${num(lowConf)} incidents (${lowPct}%)`}
                >
                  <span className="truncate px-1">{lowPct}% Low</span>
                </Link>
              )}
            </div>
          </div>

          {/* Interactive filter cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Link
              href="/incidents?confidence=high"
              className="flex items-center justify-between rounded-lg border border-line bg-surface p-4 transition hover:border-accent hover:shadow-xs group"
            >
              <div className="flex items-center gap-2">
                <ConfidenceBadge confidence="high" />
                <span className="text-xs text-muted font-medium">({highPct}%)</span>
              </div>
              <span className="text-xl font-bold text-heading group-hover:text-accent transition">
                {num(highConf)}
              </span>
            </Link>

            <Link
              href="/incidents?confidence=medium"
              className="flex items-center justify-between rounded-lg border border-line bg-surface p-4 transition hover:border-accent hover:shadow-xs group"
            >
              <div className="flex items-center gap-2">
                <ConfidenceBadge confidence="medium" />
                <span className="text-xs text-muted font-medium">({medPct}%)</span>
              </div>
              <span className="text-xl font-bold text-heading group-hover:text-accent transition">
                {num(medConf)}
              </span>
            </Link>

            <Link
              href="/incidents?confidence=low"
              className="flex items-center justify-between rounded-lg border border-line bg-surface p-4 transition hover:border-accent hover:shadow-xs group"
            >
              <div className="flex items-center gap-2">
                <ConfidenceBadge confidence="low" />
                <span className="text-xs text-muted font-medium">({lowPct}%)</span>
              </div>
              <span className="text-xl font-bold text-heading group-hover:text-accent transition">
                {num(lowConf)}
              </span>
            </Link>
          </div>
        </Card>
      </section>

      {/* 3. Engineer feedback */}
      <section className="space-y-4">
        <div>
          <SectionLabel>HUMAN IN THE LOOP</SectionLabel>
          <h2 className="mt-1 text-xl sm:text-2xl font-bold tracking-tight text-heading">
            Engineer feedback
          </h2>
          <p className="mt-1 text-xs text-muted">
            Feedback recorded by engineers when inspecting individual incidents.
          </p>
        </div>

        {feedbackTotal === 0 ? (
          <EmptyState
            title="No feedback recorded yet"
            message="Operational feedback from service desk engineers validates correlation groupings. Open any incident detail page to submit a verdict."
            action={
              <Link
                href="/incidents"
                className="inline-flex min-h-[40px] items-center rounded-lg bg-panel px-4 py-2 text-xs font-semibold text-on-panel hover:bg-panel/90 transition shadow-xs"
              >
                Review an incident →
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {VERDICTS.map((v) => {
              const count = s.feedback.find((f) => f.verdict === v.key)?.count ?? 0;
              return (
                <Card key={v.key} className="p-5 space-y-1">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted">
                    {v.label}
                  </div>
                  <div className="text-3xl font-bold text-heading">
                    {num(count)}
                  </div>
                  <div className="text-xs text-muted">
                    {feedbackTotal > 0
                      ? `${Math.round((count / feedbackTotal) * 100)}% of total responses`
                      : "0%"}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* 4. Team disagreements */}
      <section className="space-y-4">
        <div>
          <SectionLabel>OPERATIONAL REVIEW</SectionLabel>
          <h2 className="mt-1 text-xl sm:text-2xl font-bold tracking-tight text-heading">
            Team disagreements
          </h2>
          <p className="mt-1 text-xs text-muted">
            Incidents where our recommended primary team differs from the root alert's historical department ({num(disagreeCount)} incidents).
          </p>
        </div>

        {s.agreement.disagreements.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted">
            No team disagreements found.
          </Card>
        ) : (
          <div className="space-y-5">
            {/* Responsive disagreement cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {s.agreement.disagreements.slice(0, 6).map((d) => (
                <Link
                  key={d.id}
                  href={`/incidents/${encodeURIComponent(d.id)}`}
                  className="flex flex-col justify-between rounded-xl border border-line bg-surface p-5 shadow-xs transition hover:border-accent hover:shadow-md group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-heading group-hover:text-accent transition">
                        {d.id}
                      </span>
                      <ConfidenceBadge confidence={d.confidence} />
                    </div>

                    <div className="flex items-center gap-2">
                      <Chip className="font-bold">Site {d.site}</Chip>
                      <Chip>{d.member_count} alerts</Chip>
                    </div>

                    <div className="space-y-1 pt-1 text-xs">
                      <div>
                        <span className="text-muted">Recommended: </span>
                        <strong className="text-accent font-bold">
                          {d.primary_team}
                        </strong>
                      </div>
                      <div>
                        <span className="text-muted">Actual (root alert): </span>
                        <strong className="text-heading font-semibold">
                          {d.root_department}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-line text-right text-xs font-semibold text-accent group-hover:translate-x-0.5 transition-transform">
                    Inspect incident →
                  </div>
                </Link>
              ))}
            </div>

            {/* Complete original table accessible via Disclosure */}
            <Disclosure
              title={`Show details (${num(s.agreement.disagreements.length)} rows)`}
              openLabel="Show details"
              closeLabel="Hide details"
              className="shadow-xs"
            >
              <div className="overflow-x-auto border-t border-line">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-chip text-xs uppercase tracking-wide text-muted">
                    <tr>
                      <th className="px-4 py-3">Incident</th>
                      <th className="px-4 py-3">Site</th>
                      <th className="px-4 py-3">Alerts</th>
                      <th className="px-4 py-3">Recommended team</th>
                      <th className="px-4 py-3">Root alert department</th>
                      <th className="px-4 py-3">Confidence</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {s.agreement.disagreements.map((d) => (
                      <tr key={d.id} className="text-body hover:bg-chip/30">
                        <td className="px-4 py-3 font-mono text-xs">
                          <Link
                            href={`/incidents/${encodeURIComponent(d.id)}`}
                            className="font-semibold text-accent hover:underline"
                          >
                            {d.id}
                          </Link>
                        </td>
                        <td className="px-4 py-3">{d.site}</td>
                        <td className="px-4 py-3 font-medium text-heading">
                          {d.member_count}
                        </td>
                        <td className="px-4 py-3 font-semibold text-accent">
                          {d.primary_team}
                        </td>
                        <td className="px-4 py-3">{d.root_department}</td>
                        <td className="px-4 py-3">
                          <ConfidenceBadge confidence={d.confidence} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Disclosure>
          </div>
        )}
      </section>

      {/* 5. Closing note */}
      <section className="rounded-xl border border-line bg-chip/60 p-5 shadow-xs">
        <div className="flex items-start gap-3.5">
          <div className="mt-0.5 shrink-0 text-accent">
            <svg
              className="size-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <p className="text-xs sm:text-sm leading-relaxed text-heading font-medium">
            These numbers measure grouping and routing, not accuracy. Accuracy needs engineers to review a sample of incidents.
          </p>
        </div>
      </section>
    </main>
  );
}
