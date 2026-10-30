"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  PageHeader,
  Card,
  Chip,
  StatTile,
  Bar,
  Disclosure,
  EmptyState,
} from "@/components/ui";

type BaselineReport = {
  period: {
    from: string;
    through: string;
    timezone: string;
  };
  dailyVolumes: {
    report_date: string;
    alfa_records: number;
    msolve_incidents: number;
  }[];
  closureStats: {
    closed_alfa_records: number;
    closed_by_system: number;
    system_closed_percentage: number | string | null;
  };
  busiestPeriods: {
    period_start: string;
    period_end: string;
    total_records: number;
    alfa_records: number;
    msolve_incidents: number;
    distinct_departments: number;
  }[];
  repeatedSubjects: {
    subject: string;
    record_count: number;
    unique_ticket_ids: number;
  }[];
  departmentVolumes: {
    department: string;
    ticket_records: number;
    unique_ticket_ids: number;
    closed_by_system_records: number;
  }[];
  notes: string[];
};

function number(value: number | string | null | undefined) {
  return Number(value ?? 0).toLocaleString("en-IN");
}

function dateLabel(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return value;

  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function shortDateLabel(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return value;

  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  }).format(date);
}

function periodLabel(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
  if (!match) return value;

  const [, year, month, day, hour, minute] = match;
  return `${dateLabel(`${year}-${month}-${day}`)}, ${hour}:${minute} IST`;
}

function extractDateOnly(value: string): string {
  const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
  return match && match[1] ? match[1] : value.slice(0, 10);
}

export default function BaselineReportPage() {
  const [report, setReport] = useState<BaselineReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadReport() {
      try {
        const response = await fetch("/api/reports/baseline");
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Unable to load the baseline report.");
        }

        if (!cancelled) setReport(result as BaselineReport);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Unable to load the report.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadReport();
    return () => {
      cancelled = true;
    };
  }, []);

  const dailyTotals =
    report?.dailyVolumes.map((d) => ({
      ...d,
      combined: d.alfa_records + d.msolve_incidents,
    })) ?? [];

  const maxDayTotal = Math.max(
    ...dailyTotals.map((d) => d.combined),
    1,
  );

  const busiestDay = dailyTotals.reduce(
    (max, d) => (d.combined > (max?.combined ?? 0) ? d : max),
    null as (typeof dailyTotals)[0] | null,
  );

  const topRepeated = report?.repeatedSubjects.slice(0, 10) ?? [];
  const maxRepeatedCount = Math.max(
    ...topRepeated.map((r) => r.record_count),
    1,
  );

  const topDepartments = report?.departmentVolumes ?? [];
  const maxDeptCount = Math.max(
    ...topDepartments.map((d) => d.ticket_records),
    1,
  );

  return (
    <main className="mx-auto max-w-7xl p-6 space-y-10">
      <PageHeader
        sectionLabel="STEP 3 · BASELINE"
        title="How noisy is it today?"
        description="The volume engineers face without Incident Lens: tickets per day, the busiest moments, and the most repeated subjects."
        howToRead={[
          "Shows daily ticket volumes and baseline noise levels prior to correlation.",
          "Identifies busiest 15-minute bursts across infrastructure environments.",
          "Highlights the most frequent repeated subjects and department ticket shares.",
          "Displays the proportion of alerts resolved automatically by system automation (e.g. RID-BOT).",
        ]}
      />

      <div className="flex items-center gap-4">
        <Link
          href="/tickets"
          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-line bg-surface px-4 py-1.5 text-xs font-semibold text-body hover:bg-chip transition"
        >
          <span aria-hidden="true">←</span>
          <span>Explore tickets</span>
        </Link>
      </div>

      {loading && (
        <Card className="p-8 text-center text-muted">
          Loading baseline noise analysis report…
        </Card>
      )}

      {error && (
        <EmptyState
          title="Baseline report unavailable"
          message={error}
        />
      )}

      {!loading && !error && report && (
        <div className="space-y-12">
          <section className="space-y-4">
            <h2 className="text-xl font-bold tracking-tight text-heading">
              Baseline volume metrics
            </h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatTile
                value={`${dateLabel(report.period.from)} – ${dateLabel(report.period.through)}`}
                label="Coverage window"
                explanation="Confirmed timezone: Asia/Kolkata (IST)"
              />
              <StatTile
                value={number(report.closureStats.closed_alfa_records)}
                label="Closed AlfaNow records"
                explanation="Scope of automated-closure analysis"
              />
              <StatTile
                value={number(report.closureStats.closed_by_system)}
                label="Closed automatically by System"
                explanation="Resolved by system automation or RID-BOT"
              />
              <StatTile
                value={
                  report.closureStats.system_closed_percentage != null
                    ? `${Number(report.closureStats.system_closed_percentage).toFixed(1)}%`
                    : "—"
                }
                label="Automatic closure share"
                explanation="Share of closed AlfaNow alerts resolved without human action"
              />
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-heading">
                  1. Tickets per day
                </h2>
                <p className="mt-1 text-sm text-muted">
                  Daily ticket counts across MSOLVE incidents and AlfaNow alerts for October 2026.
                </p>
              </div>

              {busiestDay && (
                <div className="text-xs text-muted">
                  Busiest day:{" "}
                  <strong className="text-accent font-bold">
                    {dateLabel(busiestDay.report_date)}
                  </strong>{" "}
                  with {number(busiestDay.combined)} tickets
                </div>
              )}
            </div>

            <Card className="p-6">
              <div className="pt-8 pb-2">
                <div className="flex items-end justify-between gap-1 sm:gap-2 h-64 border-b border-line px-2">
                  {dailyTotals.map((day) => {
                    const isPeak = day.report_date === busiestDay?.report_date;
                    const heightPct = Math.max(
                      6,
                      Math.round((day.combined / maxDayTotal) * 100),
                    );

                    return (
                      <div
                        key={day.report_date}
                        className="flex flex-col items-center flex-1 h-full justify-end group relative"
                      >
                        {isPeak && (
                          <div className="absolute -top-7 text-[10px] font-bold text-accent bg-accent/10 px-1.5 py-0.5 rounded whitespace-nowrap">
                            Peak: {number(day.combined)}
                          </div>
                        )}

                        <div
                          style={{ height: `${heightPct}%` }}
                          className={`w-full max-w-[28px] rounded-t-md transition-all duration-300 ${
                            isPeak
                              ? "bg-accent shadow-sm"
                              : "bg-chip hover:bg-muted group-hover:bg-heading/40"
                          }`}
                          title={`${dateLabel(day.report_date)}: ${number(
                            day.combined,
                          )} tickets (${number(day.alfa_records)} AlfaNow, ${number(
                            day.msolve_incidents,
                          )} MSOLVE)`}
                        />

                        <span
                          className={`mt-2 text-[10px] sm:text-xs tracking-tight truncate ${
                            isPeak
                              ? "font-bold text-accent"
                              : "text-muted group-hover:text-heading"
                          }`}
                        >
                          {shortDateLabel(day.report_date)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted pt-2">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="size-3 rounded bg-accent" />
                    <span>Busiest day (Peak alert volume)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="size-3 rounded bg-chip border border-line" />
                    <span>Daily volume</span>
                  </div>
                </div>
                <span>Hover over any bar to view the exact breakdown</span>
              </div>
            </Card>
          </section>

          <section className="space-y-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-heading">
                2. Busiest 15-minute periods
              </h2>
              <p className="mt-1 text-sm text-muted">
                Peak burst periods recorded across infrastructure. Click any period to explore probable incidents on that date.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {report.busiestPeriods.slice(0, 5).map((period, idx) => {
                const dateParam = extractDateOnly(period.period_start);

                return (
                  <Card
                    key={`${period.period_start}-${period.period_end}`}
                    className="p-5 flex flex-col justify-between hover:border-accent transition group"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="flex size-7 items-center justify-center rounded-full bg-accent/10 text-accent font-bold text-xs">
                          #{idx + 1}
                        </span>
                        <Chip className="text-[11px] font-semibold">
                          {period.distinct_departments} depts impacted
                        </Chip>
                      </div>

                      <div>
                        <div className="text-xs font-bold uppercase tracking-wider text-muted">
                          15-Minute Window (IST)
                        </div>
                        <h3 className="text-sm sm:text-base font-bold text-heading mt-0.5">
                          {periodLabel(period.period_start)}
                        </h3>
                      </div>

                      <div className="rounded-lg bg-chip/40 p-3 space-y-1">
                        <div className="flex items-baseline justify-between">
                          <span className="text-xs text-muted">Burst Volume:</span>
                          <span className="text-xl font-bold text-accent">
                            {number(period.total_records)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-muted">
                          <span>AlfaNow: {number(period.alfa_records)}</span>
                          <span>MSOLVE: {number(period.msolve_incidents)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-line">
                      <Link
                        href={`/incidents?date=${encodeURIComponent(dateParam)}`}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-accent hover:underline"
                      >
                        <span>View incidents for this date</span>
                        <span aria-hidden="true">→</span>
                      </Link>
                    </div>
                  </Card>
                );
              })}
            </div>
          </section>

          <section className="space-y-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-heading">
                3. Top 10 most repeated subjects
              </h2>
              <p className="mt-1 text-sm text-muted">
                Subjects with the highest repeated alert volume, indicating widespread recurring alert patterns.
              </p>
            </div>

            <Card className="p-6 space-y-4">
              {topRepeated.map((subject, idx) => {
                const percentage = Math.round(
                  (subject.record_count / maxRepeatedCount) * 100,
                );

                return (
                  <div key={idx} className="space-y-1">
                    <Bar
                      label={
                        <span
                          className="font-medium text-heading truncate block max-w-xl"
                          title={subject.subject}
                        >
                          #{idx + 1} {subject.subject}
                        </span>
                      }
                      value={`${number(subject.record_count)} records (${number(
                        subject.unique_ticket_ids,
                      )} IDs)`}
                      percentage={percentage}
                      barColor={idx === 0 ? "bg-accent" : "bg-muted/40"}
                    />
                  </div>
                );
              })}
            </Card>
          </section>

          <section className="space-y-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-heading">
                4. Ticket volume by department
              </h2>
              <p className="mt-1 text-sm text-muted">
                Distribution of alerts across departments, including RID-BOT system automation share.
              </p>
            </div>

            <Card className="p-6 space-y-4">
              {topDepartments.slice(0, 8).map((dept, idx) => {
                const percentage = Math.round(
                  (dept.ticket_records / maxDeptCount) * 100,
                );

                return (
                  <div key={idx} className="space-y-1">
                    <Bar
                      label={
                        <span className="font-semibold text-heading">
                          {dept.department}
                        </span>
                      }
                      value={`${number(dept.ticket_records)} alerts (${number(
                        dept.closed_by_system_records,
                      )} closed by System)`}
                      percentage={percentage}
                      barColor={idx === 0 ? "bg-accent" : "bg-muted/40"}
                    />
                  </div>
                );
              })}
            </Card>
          </section>

          <section className="space-y-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-heading">
                5. Complete baseline report data
              </h2>
              <p className="mt-1 text-sm text-muted">
                Granular tabular records for each baseline dimension.
              </p>
            </div>

            <div className="space-y-3">
              <Disclosure
                title="Show details: Full daily ticket volumes"
                openLabel="Show details: Full daily ticket volumes"
                closeLabel="Hide details: Full daily ticket volumes"
              >
                <div className="overflow-x-auto p-4">
                  <table className="w-full min-w-[500px] text-left text-sm">
                    <thead className="bg-chip text-xs uppercase text-muted">
                      <tr>
                        <th className="px-4 py-3">Date (IST)</th>
                        <th className="px-4 py-3 text-right">AlfaNow Tickets</th>
                        <th className="px-4 py-3 text-right">MSOLVE Incidents</th>
                        <th className="px-4 py-3 text-right">Combined Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {report.dailyVolumes.map((row) => (
                        <tr key={row.report_date} className="hover:bg-chip/30">
                          <td className="px-4 py-3 font-medium text-heading">
                            {dateLabel(row.report_date)}
                          </td>
                          <td className="px-4 py-3 text-right text-body font-mono">
                            {number(row.alfa_records)}
                          </td>
                          <td className="px-4 py-3 text-right text-body font-mono">
                            {number(row.msolve_incidents)}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-heading font-mono">
                            {number(row.alfa_records + row.msolve_incidents)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Disclosure>

              <Disclosure
                title="Show details: Top 10 busiest 15-minute periods"
                openLabel="Show details: Top 10 busiest 15-minute periods"
                closeLabel="Hide details: Top 10 busiest 15-minute periods"
              >
                <div className="overflow-x-auto p-4">
                  <table className="w-full min-w-[650px] text-left text-sm">
                    <thead className="bg-chip text-xs uppercase text-muted">
                      <tr>
                        <th className="px-4 py-3">15-Minute Period (IST)</th>
                        <th className="px-4 py-3 text-right">Total Records</th>
                        <th className="px-4 py-3 text-right">AlfaNow Tickets</th>
                        <th className="px-4 py-3 text-right">MSOLVE Incidents</th>
                        <th className="px-4 py-3 text-right">Departments</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {report.busiestPeriods.map((row) => (
                        <tr
                          key={`${row.period_start}-${row.period_end}`}
                          className="hover:bg-chip/30"
                        >
                          <td className="px-4 py-3 font-medium text-heading">
                            {periodLabel(row.period_start)}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-accent font-mono">
                            {number(row.total_records)}
                          </td>
                          <td className="px-4 py-3 text-right text-body font-mono">
                            {number(row.alfa_records)}
                          </td>
                          <td className="px-4 py-3 text-right text-body font-mono">
                            {number(row.msolve_incidents)}
                          </td>
                          <td className="px-4 py-3 text-right text-body font-mono">
                            {number(row.distinct_departments)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Disclosure>

              <Disclosure
                title={`Show details: 20 most repeated subjects (${report.repeatedSubjects.length} records)`}
                openLabel={`Show details: 20 most repeated subjects (${report.repeatedSubjects.length} records)`}
                closeLabel="Hide details: 20 most repeated subjects"
              >
                <div className="overflow-x-auto p-4">
                  <table className="w-full min-w-[650px] text-left text-sm">
                    <thead className="bg-chip text-xs uppercase text-muted">
                      <tr>
                        <th className="px-4 py-3">Subject</th>
                        <th className="px-4 py-3 text-right">Source Records</th>
                        <th className="px-4 py-3 text-right">Unique Ticket IDs</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {report.repeatedSubjects.map((row, index) => (
                        <tr key={`${row.subject}-${index}`} className="hover:bg-chip/30">
                          <td className="max-w-3xl px-4 py-3 text-body font-medium">
                            {row.subject}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-heading font-mono">
                            {number(row.record_count)}
                          </td>
                          <td className="px-4 py-3 text-right text-body font-mono">
                            {number(row.unique_ticket_ids)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Disclosure>

              <Disclosure
                title="Show details: Full department ticket breakdown"
                openLabel="Show details: Full department ticket breakdown"
                closeLabel="Hide details: Full department ticket breakdown"
              >
                <div className="overflow-x-auto p-4">
                  <table className="w-full min-w-[700px] text-left text-sm">
                    <thead className="bg-chip text-xs uppercase text-muted">
                      <tr>
                        <th className="px-4 py-3">Department</th>
                        <th className="px-4 py-3 text-right">Source Records</th>
                        <th className="px-4 py-3 text-right">Unique Ticket IDs</th>
                        <th className="px-4 py-3 text-right">Closed by System</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {report.departmentVolumes.map((row) => (
                        <tr key={row.department} className="hover:bg-chip/30">
                          <td className="px-4 py-3 font-medium text-heading">
                            {row.department}
                          </td>
                          <td className="px-4 py-3 text-right text-body font-mono">
                            {number(row.ticket_records)}
                          </td>
                          <td className="px-4 py-3 text-right text-body font-mono">
                            {number(row.unique_ticket_ids)}
                          </td>
                          <td className="px-4 py-3 text-right text-body font-mono">
                            {number(row.closed_by_system_records)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Disclosure>
            </div>
          </section>

          <section className="rounded-xl border border-line bg-chip/40 p-5 space-y-3">
            <h3 className="font-bold text-heading text-sm">
              Definitions and baseline methodology
            </h3>
            <ul className="list-disc space-y-1.5 pl-5 text-xs leading-relaxed text-body">
              {report.notes.map((note, i) => (
                <li key={i}>{note}</li>
              ))}
            </ul>
            <p className="text-xs leading-relaxed text-muted pt-1">
              All timezone-naive timestamps are interpreted as IST, as confirmed by the PM.
              Alfa Closed Created On values containing an explicit Z suffix are interpreted as UTC.
            </p>
          </section>
        </div>
      )}
    </main>
  );
}
