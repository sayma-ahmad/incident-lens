"use client";

import { useEffect, useState } from "react";

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

function periodLabel(value: string) {
  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/,
  );

  if (!match) return value;

  const [, year, month, day, hour, minute] = match;
  return `${dateLabel(`${year}-${month}-${day}`)}, ${hour}:${minute} IST`;
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="font-semibold text-slate-900">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        )}
      </div>
      <div className="overflow-x-auto p-5">{children}</div>
    </section>
  );
}

function Metric({
  label,
  value,
  note,
}: {
  label: string;
  value: string | number;
  note?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
        {typeof value === "number" ? number(value) : value}
      </p>
      {note && <p className="mt-2 text-xs text-slate-500">{note}</p>}
    </div>
  );
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

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5">
          <div>
            <a href="/" className="text-sm font-semibold text-indigo-700">
              Incident Lens
            </a>
            <h1 className="mt-1 text-2xl font-bold">Baseline Report</h1>
            <p className="mt-1 text-sm text-slate-500">
              Ticket volume before correlation and grouping.
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-6 px-5 py-7">
        <a
          href="/tickets"
          className="inline-flex rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
        >
          ← Back to tickets
        </a>

        {loading && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-slate-500">
            Loading baseline report…
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {!loading && !error && report && (
          <>
            <section>
              <h2 className="mb-1 text-lg font-semibold">Reporting period</h2>
              <p className="mb-4 text-sm text-slate-500">
                {dateLabel(report.period.from)} – {dateLabel(report.period.through)}
                {" · "}{report.period.timezone}
              </p>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Metric
                  label="Closed Alfa tickets"
                  value={report.closureStats.closed_alfa_records}
                />
                <Metric
                  label="Closed by System"
                  value={report.closureStats.closed_by_system}
                />
                <Metric
                  label="System-closed percentage"
                  value={`${number(report.closureStats.system_closed_percentage)}%`}
                  note="Calculated across all Closed Alfa records."
                />
                <Metric
                  label="Busiest periods reported"
                  value={report.busiestPeriods.length}
                  note="15-minute periods"
                />
              </div>
            </section>

            <Section
              title="Daily ticket volumes"
              description="Alfa source records and MSOLVE incidents from 1–15 October 2026."
            >
              <table className="w-full min-w-[550px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Date (IST)</th>
                    <th className="px-4 py-3 text-right">Alfa records</th>
                    <th className="px-4 py-3 text-right">MSOLVE incidents</th>
                    <th className="px-4 py-3 text-right">Combined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {report.dailyVolumes.map((row) => (
                    <tr key={row.report_date}>
                      <td className="px-4 py-3">{dateLabel(row.report_date)}</td>
                      <td className="px-4 py-3 text-right">
                        {number(row.alfa_records)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {number(row.msolve_incidents)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {number(row.alfa_records + row.msolve_incidents)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>

            <Section
              title="20 busiest 15-minute periods"
              description="Combined Alfa records and MSOLVE incidents, ranked by volume."
            >
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Period start (IST)</th>
                    <th className="px-4 py-3">Period end (IST)</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3 text-right">Alfa</th>
                    <th className="px-4 py-3 text-right">MSOLVE</th>
                    <th className="px-4 py-3 text-right">Departments</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {report.busiestPeriods.map((row, index) => (
                    <tr key={`${row.period_start}-${index}`}>
                      <td className="whitespace-nowrap px-4 py-3">
                        {periodLabel(row.period_start)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        {periodLabel(row.period_end)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {number(row.total_records)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {number(row.alfa_records)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {number(row.msolve_incidents)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {number(row.distinct_departments)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>

            <Section
              title="20 most repeated subjects"
              description="Repeated subject text and number of source records."
            >
              <table className="w-full min-w-[650px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Subject</th>
                    <th className="px-4 py-3 text-right">Source records</th>
                    <th className="px-4 py-3 text-right">Unique ticket IDs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {report.repeatedSubjects.map((row, index) => (
                    <tr key={`${row.subject}-${index}`}>
                      <td className="max-w-3xl px-4 py-3">{row.subject}</td>
                      <td className="px-4 py-3 text-right">
                        {number(row.record_count)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {number(row.unique_ticket_ids)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>

            <Section
              title="Ticket volume by department"
              description="Includes RID-BOT and shows the share closed automatically by System."
            >
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3 text-right">Source records</th>
                    <th className="px-4 py-3 text-right">Unique ticket IDs</th>
                    <th className="px-4 py-3 text-right">Closed by System</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {report.departmentVolumes.map((row) => (
                    <tr key={row.department}>
                      <td className="px-4 py-3 font-medium">{row.department}</td>
                      <td className="px-4 py-3 text-right">
                        {number(row.ticket_records)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {number(row.unique_ticket_ids)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {number(row.closed_by_system_records)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>

            <section className="rounded-xl border border-amber-200 bg-amber-50 p-5">
              <h2 className="font-semibold text-amber-950">
                Definitions and limitations
              </h2>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-amber-900">
                {report.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
              <p className="mt-3 text-sm leading-6 text-amber-900">
                All timezone-naive timestamps are interpreted as IST, as confirmed
                by the PM. Alfa Closed Created On values containing an explicit Z
                suffix are interpreted as UTC.
              </p>
            </section>
          </>
        )}
      </div>
    </main>
  );
}