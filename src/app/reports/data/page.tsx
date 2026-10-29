"use client";

import { useEffect, useState } from "react";
import { confidenceLabel, matchMethodLabel } from "@/lib/labels";

type DataReport = {
  sourceCounts: { source: string; row_count: number }[];
  alfaTicketPrefixCounts: {
    prefix: string;
    unique_ticket_ids: number;
    source_rows: number;
  }[];
  correlationSummary: {
    total_incidents: number;
    with_correlation_id: number;
    numeric_correlation_ids: number;
    prefixed_correlation_ids: number;
  };
  matchesByMethod: {
    match_method: string;
    confidence: string;
    links: number;
    unique_msolve_tickets: number;
    unique_alfa_tickets: number;
  }[];
  mappingSummary: {
    total_incidents: number;
    matched_incidents: number;
    unmatched_incidents: number;
    matched_with_correlation_id: number;
    unmatched_with_correlation_id: number;
  };
  mappingCoverageByContactType: {
    contact_type: string;
    has_correlation_id: boolean;
    incident_count: number;
    matched_incidents: number;
    unmatched_incidents: number;
  }[];
  unmatchedSample: {
    ticket_id: string;
    subject: string | null;
    contact_type: string | null;
    correlation_id: string | null;
    created_on: string;
  }[];
  assignmentGroupDepartmentComparison: {
    assignment_group: string;
    department: string;
    match_method: string;
    matched_pairs: number;
  }[];
  timeDifferenceStats: {
    links_with_time_difference: number;
    median_seconds: number | string | null;
    p90_seconds: number | string | null;
    matches_within_10_minutes: number;
  };
  timestampAssumption: string;
  timeDifferenceScope: string;
};

function number(value: number | string | null | undefined) {
  return Number(value ?? 0).toLocaleString("en-IN");
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
  value: number | string;
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

export default function DataReportPage() {
  const [report, setReport] = useState<DataReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadReport() {
      try {
        const response = await fetch("/api/reports/data");
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Unable to load the data report.");
        }

        if (!cancelled) setReport(result as DataReport);
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
            <h1 className="mt-1 text-2xl font-bold">Data and Mapping Report</h1>
            <p className="mt-1 text-sm text-slate-500">
              Source data quality and MSOLVE–Alfa ticket mapping results.
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
            Loading data and mapping report…
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
              <h2 className="mb-3 text-lg font-semibold">Mapping overview</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Metric
                  label="MSOLVE incidents"
                  value={report.mappingSummary.total_incidents}
                  note="Incident records in the source data"
                />
                <Metric
                  label="Incidents with a correlation ID"
                  value={report.correlationSummary.with_correlation_id}
                />
                <Metric
                  label="Matched incidents"
                  value={report.mappingSummary.matched_incidents}
                />
                <Metric
                  label="Unmatched incidents"
                  value={report.mappingSummary.unmatched_incidents}
                  note="Require further investigation"
                />
              </div>
            </section>

            <Section
              title="Source record counts"
              description="Original source rows, including repeated records."
            >
              <table className="w-full min-w-[450px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Source</th>
                    <th className="px-4 py-3 text-right">Records</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {report.sourceCounts.map((row) => (
                    <tr key={row.source}>
                      <td className="px-4 py-3">{row.source}</td>
                      <td className="px-4 py-3 text-right font-medium">
                        {number(row.row_count)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>

            <Section
              title="Alfa ticket prefixes"
              description="Source row counts are shown separately from unique ticket IDs."
            >
              <table className="w-full min-w-[500px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Prefix</th>
                    <th className="px-4 py-3 text-right">Unique ticket IDs</th>
                    <th className="px-4 py-3 text-right">Source rows</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {report.alfaTicketPrefixCounts.map((row) => (
                    <tr key={row.prefix}>
                      <td className="px-4 py-3 font-medium">{row.prefix}</td>
                      <td className="px-4 py-3 text-right">
                        {number(row.unique_ticket_ids)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {number(row.source_rows)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>

            <Section
              title="Matches by method"
              description="Exact ID links and subject/time candidates are reported separately."
            >
              <table className="w-full min-w-[750px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Method</th>
                    <th className="px-4 py-3">Confidence</th>
                    <th className="px-4 py-3 text-right">Links</th>
                    <th className="px-4 py-3 text-right">MSOLVE tickets</th>
                    <th className="px-4 py-3 text-right">Alfa tickets</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {report.matchesByMethod.map((row) => (
                    <tr key={`${row.match_method}-${row.confidence}`}>
                      <td className="px-4 py-3 font-medium">
                        {matchMethodLabel(row.match_method)}
                      </td>
                      <td className="px-4 py-3">{confidenceLabel(row.confidence)}</td>
                      <td className="px-4 py-3 text-right">{number(row.links)}</td>
                      <td className="px-4 py-3 text-right">
                        {number(row.unique_msolve_tickets)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {number(row.unique_alfa_tickets)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>

            <section>
              <h2 className="mb-3 text-lg font-semibold">Timestamp comparison</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Metric
                  label="Links with a time difference"
                  value={report.timeDifferenceStats.links_with_time_difference}
                />
                <Metric
                  label="Median time difference"
                  value={
                    report.timeDifferenceStats.median_seconds == null
                      ? "Not available"
                      : `${number(report.timeDifferenceStats.median_seconds)} sec`
                  }
                />
                <Metric
                  label="90th percentile"
                  value={
                    report.timeDifferenceStats.p90_seconds == null
                      ? "Not available"
                      : `${number(report.timeDifferenceStats.p90_seconds)} sec`
                  }
                />
                <Metric
                  label="Within ±10 minutes"
                  value={report.timeDifferenceStats.matches_within_10_minutes}
                />
              </div>
              <p className="mt-3 text-sm text-slate-500">
                {report.timeDifferenceScope}
              </p>
            </section>

            <Section
              title="Mapping coverage by contact type"
              description="Each category is separated according to whether a correlation ID is present."
            >
              <table className="w-full min-w-[750px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Contact type</th>
                    <th className="px-4 py-3">Correlation ID</th>
                    <th className="px-4 py-3 text-right">Incidents</th>
                    <th className="px-4 py-3 text-right">Matched</th>
                    <th className="px-4 py-3 text-right">Unmatched</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {report.mappingCoverageByContactType.map((row, index) => (
                    <tr key={`${row.contact_type}-${row.has_correlation_id}-${index}`}>
                      <td className="px-4 py-3">{row.contact_type}</td>
                      <td className="px-4 py-3">
                        {row.has_correlation_id ? "Present" : "Missing"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {number(row.incident_count)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {number(row.matched_incidents)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {number(row.unmatched_incidents)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>

            <Section
              title="Assignment group vs department"
              description="The API returns up to 100 grouped combinations for review."
            >
              <table className="w-full min-w-[750px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">MSOLVE assignment group</th>
                    <th className="px-4 py-3">Alfa department</th>
                    <th className="px-4 py-3">Match method</th>
                    <th className="px-4 py-3 text-right">Pairs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {report.assignmentGroupDepartmentComparison.map((row, index) => (
                    <tr key={`${row.assignment_group}-${row.department}-${row.match_method}-${index}`}>
                      <td className="px-4 py-3">{row.assignment_group}</td>
                      <td className="px-4 py-3">{row.department}</td>
                      <td className="px-4 py-3">{matchMethodLabel(row.match_method)}</td>
                      <td className="px-4 py-3 text-right">
                        {number(row.matched_pairs)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>

            <Section
              title="Sample of unmatched MSOLVE incidents"
              description={`Up to 50 records are shown. API sample size: ${report.unmatchedSample.length}.`}
            >
              <table className="w-full min-w-[750px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Ticket ID</th>
                    <th className="px-4 py-3">Subject</th>
                    <th className="px-4 py-3">Contact type</th>
                    <th className="px-4 py-3">Correlation ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {report.unmatchedSample.map((row) => (
                    <tr key={row.ticket_id}>
                      <td className="whitespace-nowrap px-4 py-3 font-medium">
                        {row.ticket_id}
                      </td>
                      <td className="max-w-lg px-4 py-3">
                        {row.subject || "—"}
                      </td>
                      <td className="px-4 py-3">{row.contact_type || "(blank)"}</td>
                      <td className="px-4 py-3">{row.correlation_id || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>

            <section className="rounded-xl border border-amber-200 bg-amber-50 p-5">
              <h2 className="font-semibold text-amber-950">
                Timestamp assumptions and limitations
              </h2>
              <p className="mt-2 text-sm leading-6 text-amber-900">
                {report.timestampAssumption}
              </p>
              <p className="mt-2 text-sm leading-6 text-amber-900">
                Subject-and-time matches are low-confidence candidates and are not
                confirmed duplicates. Reported time-difference statistics include
                only links where a difference was recorded.
              </p>
            </section>
          </>
        )}
      </div>
    </main>
  );
}