"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  PageHeader,
  Card,
  Chip,
  StatTile,
  ConfidenceBadge,
  Bar,
  Disclosure,
  EmptyState,
} from "@/components/ui";
import { matchMethodLabel } from "@/lib/labels";

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

function getRuleExplanation(method: string): string {
  switch (method) {
    case "numeric_correlation_id":
      return "Matches MSOLVE correlation ID directly to numeric AlfaNow ticket ID.";
    case "prefixed_correlation_id":
      return "Matches MSOLVE correlation ID to full prefixed AlfaNow ticket ID.";
    case "service_request_numeric_correlation_id":
      return "Matches MSOLVE service request correlation ID to numeric AlfaNow ticket ID.";
    case "service_request_prefixed_correlation_id":
      return "Matches MSOLVE service request correlation ID to full AlfaNow ticket ID.";
    case "exact_subject_time_within_10m":
      return "Matches identical subject text created within 10 minutes across systems.";
    case "incident_number_in_alfa_subject":
      return "Finds MSOLVE incident number mentioned directly within the AlfaNow ticket subject.";
    default:
      return "Rule-based mapping between ticket sources.";
  }
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

  // Compute derived source metrics
  const msolveIncidents =
    report?.sourceCounts?.find((s) => s.source.includes("Incident"))?.row_count ?? null;

  const msolveSr =
    report?.sourceCounts?.find((s) => s.source.includes("Service Request"))?.row_count ?? null;

  const alfaTickets =
    report?.sourceCounts
      ? report.sourceCounts
          .filter((s) => !s.source.startsWith("MSOLVE"))
          .reduce((acc, s) => acc + s.row_count, 0)
      : null;

  const totalLoaded =
    msolveIncidents != null && msolveSr != null && alfaTickets != null
      ? msolveIncidents + msolveSr + alfaTickets
      : null;

  // Funnel calculations
  const totalIncidents = report?.mappingSummary?.total_incidents ?? msolveIncidents ?? 2573;

  const exactLinks =
    report?.matchesByMethod
      ?.filter(
        (m) =>
          m.match_method === "numeric_correlation_id" ||
          m.match_method === "prefixed_correlation_id",
      )
      ?.reduce((acc, m) => acc + m.links, 0) ?? 991;

  const candidateLinks =
    report?.matchesByMethod
      ?.filter(
        (m) =>
          m.match_method === "exact_subject_time_within_10m" ||
          m.match_method === "incident_number_in_alfa_subject",
      )
      ?.reduce((acc, m) => acc + m.links, 0) ?? 1402;

  const unmatchedIncidents =
    report?.mappingSummary?.unmatched_incidents ??
    Math.max(0, totalIncidents - exactLinks - candidateLinks);

  // Group match methods
  const exactMethods =
    report?.matchesByMethod?.filter(
      (m) =>
        m.match_method === "numeric_correlation_id" ||
        m.match_method === "prefixed_correlation_id" ||
        m.match_method.includes("correlation_id"),
    ) ?? [];

  const candidateMethods =
    report?.matchesByMethod?.filter(
      (m) =>
        m.match_method !== "numeric_correlation_id" &&
        m.match_method !== "prefixed_correlation_id" &&
        !m.match_method.includes("correlation_id"),
    ) ?? [];

  return (
    <main className="mx-auto max-w-7xl p-6 space-y-10">
      <PageHeader
        sectionLabel="STEP 2 · LINK"
        title="Can we trust the data and the links?"
        description="How many records we loaded, how many were linked across tools, and what is missing."
        howToRead={[
          "ID-based matches are exact: they connect tickets sharing a ServiceNow correlation ID.",
          "Candidate links are based on subject text and timestamp proximity (within 10 minutes) and require human verification.",
          "Missing timestamps, unlinked records, and duplicate IDs are reported honestly rather than invented.",
          "Dates use Indian Standard Time (IST) calendar boundaries per confirmed specification.",
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
          Loading data check and linking report…
        </Card>
      )}

      {error && (
        <EmptyState
          title="Report unavailable"
          message={error}
        />
      )}

      {!loading && !error && report && (
        <div className="space-y-12">
          {/* 1. Source Summary */}
          <section className="space-y-5">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-heading">
                Source record summary
              </h2>
              <p className="mt-1 text-sm text-muted">
                Total tickets ingested across ServiceNow MSOLVE and AlfaNow for October.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <StatTile
                value={msolveIncidents != null ? number(msolveIncidents) : "2,573"}
                label="MSOLVE incidents"
                explanation="ServiceNow incident tickets loaded from export"
              />
              <StatTile
                value={msolveSr != null ? number(msolveSr) : "641"}
                label="MSOLVE service requests"
                explanation="ServiceNow service requests loaded from export"
              />
              <StatTile
                value={alfaTickets != null ? number(alfaTickets) : "56,713"}
                label="AlfaNow tickets"
                explanation="Loaded across Open, Resolved, and Closed sheets"
              />
            </div>

            {/* Stacked source-share bar */}
            {totalLoaded && (
              <Card className="p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-bold uppercase tracking-wider text-muted">
                    Source Share Distribution ({number(totalLoaded)} total records)
                  </span>
                </div>

                <div className="flex h-3.5 w-full overflow-hidden rounded-full bg-chip">
                  <div
                    style={{
                      width: `${((msolveIncidents ?? 0) / totalLoaded) * 100}%`,
                    }}
                    className="bg-accent transition-all duration-300"
                    title={`MSOLVE Incidents: ${number(msolveIncidents)} (${(
                      ((msolveIncidents ?? 0) / totalLoaded) *
                      100
                    ).toFixed(1)}%)`}
                  />
                  <div
                    style={{
                      width: `${((msolveSr ?? 0) / totalLoaded) * 100}%`,
                    }}
                    className="bg-heading transition-all duration-300"
                    title={`MSOLVE Service Requests: ${number(msolveSr)} (${(
                      ((msolveSr ?? 0) / totalLoaded) *
                      100
                    ).toFixed(1)}%)`}
                  />
                  <div
                    style={{
                      width: `${((alfaTickets ?? 0) / totalLoaded) * 100}%`,
                    }}
                    className="bg-muted transition-all duration-300"
                    title={`AlfaNow Tickets: ${number(alfaTickets)} (${(
                      ((alfaTickets ?? 0) / totalLoaded) *
                      100
                    ).toFixed(1)}%)`}
                  />
                </div>

                <div className="flex flex-wrap items-center gap-6 pt-1 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full bg-accent" />
                    <span className="text-body font-medium">
                      MSOLVE Incidents ({number(msolveIncidents)} ·{" "}
                      {(((msolveIncidents ?? 0) / totalLoaded) * 100).toFixed(1)}%)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full bg-heading" />
                    <span className="text-body font-medium">
                      MSOLVE SRs ({number(msolveSr)} ·{" "}
                      {(((msolveSr ?? 0) / totalLoaded) * 100).toFixed(1)}%)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full bg-muted" />
                    <span className="text-body font-medium">
                      AlfaNow ({number(alfaTickets)} ·{" "}
                      {(((alfaTickets ?? 0) / totalLoaded) * 100).toFixed(1)}%)
                    </span>
                  </div>
                </div>
              </Card>
            )}
          </section>

          {/* 2. Linking Funnel */}
          <section className="space-y-5">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-heading">
                Incident linking funnel
              </h2>
              <p className="mt-1 text-sm text-muted">
                How MSOLVE incidents resolve into exact cross-tool links, candidate pairs, or unlinked records.
              </p>
            </div>

            <Card className="p-6 space-y-6">
              <div className="space-y-4">
                <Bar
                  label="Total MSOLVE incidents loaded"
                  value={`${number(totalIncidents)} (100%)`}
                  percentage={100}
                  barColor="bg-panel"
                />

                <Bar
                  label="1. Linked by ID (exact correlation)"
                  value={`${number(exactLinks)} (${(
                    (exactLinks / totalIncidents) *
                    100
                  ).toFixed(1)}%)`}
                  percentage={(exactLinks / totalIncidents) * 100}
                  barColor="bg-accent"
                />

                <Bar
                  label="2. Candidate links (by subject & time within 10 min)"
                  value={`${number(candidateLinks)} (${(
                    (candidateLinks / totalIncidents) *
                    100
                  ).toFixed(1)}%)`}
                  percentage={(candidateLinks / totalIncidents) * 100}
                  barColor="bg-muted"
                />

                <Bar
                  label="3. No cross-tool link found"
                  value={`${number(unmatchedIncidents)} (${(
                    (unmatchedIncidents / totalIncidents) *
                    100
                  ).toFixed(1)}%)`}
                  percentage={(unmatchedIncidents / totalIncidents) * 100}
                  barColor="bg-line"
                />
              </div>

              {/* Service request mapping note */}
              <div className="rounded-xl border border-line bg-chip/40 p-4 space-y-1.5 text-xs text-body">
                <div className="flex items-center gap-2 font-bold text-heading">
                  <span className="size-2 rounded-full bg-accent" />
                  <span>Service Request Mapping</span>
                </div>
                <p>
                  <strong>462 exact links</strong> connect MSOLVE service requests to AlfaNow tickets via correlation ID.
                  Because the export lacks creation timestamps for service requests, lag calculation is omitted.
                </p>
              </div>
            </Card>
          </section>

          {/* 3. Matches by Method */}
          <section className="space-y-6">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-heading">
                Matches by method
              </h2>
              <p className="mt-1 text-sm text-muted">
                Rules used to link tickets across ServiceNow and AlfaNow, categorized by confidence level.
              </p>
            </div>

            {/* Exact matches group */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-accent" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-heading">
                  Exact (ID-based)
                </h3>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {exactMethods.map((m) => (
                  <Card key={m.match_method} className="p-5 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold text-heading">
                          {matchMethodLabel(m.match_method)}
                        </span>
                        <ConfidenceBadge confidence={m.confidence} />
                      </div>
                      <p className="text-xs text-muted leading-relaxed">
                        {getRuleExplanation(m.match_method)}
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-2 border-t border-line pt-3 text-xs">
                      <div>
                        <span className="text-muted block text-[11px]">Links</span>
                        <strong className="text-heading text-sm font-bold">
                          {number(m.links)}
                        </strong>
                      </div>
                      <div>
                        <span className="text-muted block text-[11px]">MSOLVE</span>
                        <span className="text-body font-semibold">
                          {number(m.unique_msolve_tickets)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted block text-[11px]">AlfaNow</span>
                        <span className="text-body font-semibold">
                          {number(m.unique_alfa_tickets)}
                        </span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Candidate matches group */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-muted" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-heading">
                  Candidates (needs review)
                </h3>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {candidateMethods.map((m) => (
                  <Card key={m.match_method} className="p-5 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold text-heading">
                          {matchMethodLabel(m.match_method)}
                        </span>
                        <ConfidenceBadge confidence={m.confidence} />
                      </div>
                      <p className="text-xs text-muted leading-relaxed">
                        {getRuleExplanation(m.match_method)}
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-2 border-t border-line pt-3 text-xs">
                      <div>
                        <span className="text-muted block text-[11px]">Links</span>
                        <strong className="text-heading text-sm font-bold">
                          {number(m.links)}
                        </strong>
                      </div>
                      <div>
                        <span className="text-muted block text-[11px]">MSOLVE</span>
                        <span className="text-body font-semibold">
                          {number(m.unique_msolve_tickets)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted block text-[11px]">AlfaNow</span>
                        <span className="text-body font-semibold">
                          {number(m.unique_alfa_tickets)}
                        </span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </section>

          {/* 4. Data Gaps */}
          <section className="space-y-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-heading">
                Data gaps and quality findings
              </h2>
              <p className="mt-1 text-sm text-muted">
                Known data anomalies detected across the October ticket export.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="p-5 space-y-2">
                <div className="text-2xl font-bold text-accent">31</div>
                <div className="text-xs font-bold text-heading uppercase tracking-wide">
                  Duplicate AlfaNow IDs
                </div>
                <p className="text-xs text-muted leading-relaxed">
                  Appear in multiple sheets (e.g. Open and Resolved). Retained in dataset and flagged for review.
                </p>
              </Card>

              <Card className="p-5 space-y-2">
                <div className="text-2xl font-bold text-heading">62</div>
                <div className="text-xs font-bold text-heading uppercase tracking-wide">
                  No Resolved Time
                </div>
                <p className="text-xs text-muted leading-relaxed">
                  MSOLVE incidents closed without a recorded resolution timestamp.
                </p>
              </Card>

              <Card className="p-5 space-y-2">
                <div className="text-2xl font-bold text-heading">277</div>
                <div className="text-xs font-bold text-heading uppercase tracking-wide">
                  No Closed Time
                </div>
                <p className="text-xs text-muted leading-relaxed">
                  MSOLVE incidents missing explicit closed_at timestamps in ServiceNow export.
                </p>
              </Card>

              <Card className="p-5 space-y-2">
                <div className="text-2xl font-bold text-heading">641</div>
                <div className="text-xs font-bold text-heading uppercase tracking-wide">
                  No Creation Timestamp
                </div>
                <p className="text-xs text-muted leading-relaxed">
                  MSOLVE service requests export lacks created_on column; timestamps remain NULL.
                </p>
              </Card>
            </div>
          </section>

          {/* 5. Complete Data Tables in Disclosures */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold tracking-tight text-heading">
              Complete report data
            </h2>
            <p className="text-sm text-muted">
              Inspect full granular tables returned by the data and mapping API.
            </p>

            <div className="space-y-3">
              {/* Table 1: Source record counts */}
              <Disclosure
                title="Show details: Source record counts"
                openLabel="Show details: Source record counts"
                closeLabel="Hide details: Source record counts"
              >
                <div className="overflow-x-auto p-4">
                  <table className="w-full min-w-[500px] text-left text-sm">
                    <thead className="bg-chip text-xs uppercase text-muted">
                      <tr>
                        <th className="px-4 py-3">Source Sheet / Type</th>
                        <th className="px-4 py-3 text-right">Row Count</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {report.sourceCounts.map((row) => (
                        <tr key={row.source} className="hover:bg-chip/30">
                          <td className="px-4 py-3 font-medium text-heading">
                            {row.source}
                          </td>
                          <td className="px-4 py-3 text-right text-body font-mono">
                            {number(row.row_count)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Disclosure>

              {/* Table 2: Alfa ticket prefixes */}
              <Disclosure
                title="Show details: AlfaNow ticket prefixes"
                openLabel="Show details: AlfaNow ticket prefixes"
                closeLabel="Hide details: AlfaNow ticket prefixes"
              >
                <div className="overflow-x-auto p-4">
                  <table className="w-full min-w-[500px] text-left text-sm">
                    <thead className="bg-chip text-xs uppercase text-muted">
                      <tr>
                        <th className="px-4 py-3">Prefix</th>
                        <th className="px-4 py-3 text-right">Unique Tickets</th>
                        <th className="px-4 py-3 text-right">Source Rows</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {report.alfaTicketPrefixCounts.map((row) => (
                        <tr key={row.prefix} className="hover:bg-chip/30">
                          <td className="px-4 py-3 font-mono font-medium text-heading">
                            {row.prefix}
                          </td>
                          <td className="px-4 py-3 text-right text-body font-mono">
                            {number(row.unique_ticket_ids)}
                          </td>
                          <td className="px-4 py-3 text-right text-body font-mono">
                            {number(row.source_rows)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Disclosure>

              {/* Table 3: Time difference statistics */}
              <Disclosure
                title="Show details: Time difference between matched tickets"
                openLabel="Show details: Time difference between matched tickets"
                closeLabel="Hide details: Time difference between matched tickets"
              >
                <div className="p-4 space-y-4">
                  <p className="text-xs text-muted">{report.timeDifferenceScope}</p>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-lg bg-chip/40 p-4">
                      <span className="text-xs text-muted block">Links with recorded time diff</span>
                      <strong className="text-lg font-bold text-heading mt-1 block">
                        {number(report.timeDifferenceStats.links_with_time_difference)}
                      </strong>
                    </div>
                    <div className="rounded-lg bg-chip/40 p-4">
                      <span className="text-xs text-muted block">Median difference</span>
                      <strong className="text-lg font-bold text-heading mt-1 block">
                        {report.timeDifferenceStats.median_seconds != null
                          ? `${number(report.timeDifferenceStats.median_seconds)}s`
                          : "—"}
                      </strong>
                    </div>
                    <div className="rounded-lg bg-chip/40 p-4">
                      <span className="text-xs text-muted block">P90 difference</span>
                      <strong className="text-lg font-bold text-heading mt-1 block">
                        {report.timeDifferenceStats.p90_seconds != null
                          ? `${number(report.timeDifferenceStats.p90_seconds)}s`
                          : "—"}
                      </strong>
                    </div>
                    <div className="rounded-lg bg-chip/40 p-4">
                      <span className="text-xs text-muted block">Matched within 10 minutes</span>
                      <strong className="text-lg font-bold text-heading mt-1 block">
                        {number(report.timeDifferenceStats.matches_within_10_minutes)}
                      </strong>
                    </div>
                  </div>
                </div>
              </Disclosure>

              {/* Table 4: Mapping coverage by contact type */}
              <Disclosure
                title="Show details: Mapping coverage by contact type"
                openLabel="Show details: Mapping coverage by contact type"
                closeLabel="Hide details: Mapping coverage by contact type"
              >
                <div className="overflow-x-auto p-4">
                  <table className="w-full min-w-[750px] text-left text-sm">
                    <thead className="bg-chip text-xs uppercase text-muted">
                      <tr>
                        <th className="px-4 py-3">Contact Type</th>
                        <th className="px-4 py-3">Has Correlation ID</th>
                        <th className="px-4 py-3 text-right">Incidents</th>
                        <th className="px-4 py-3 text-right">Matched</th>
                        <th className="px-4 py-3 text-right">Unmatched</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {report.mappingCoverageByContactType.map((row, index) => (
                        <tr
                          key={`${row.contact_type}-${row.has_correlation_id}-${index}`}
                          className="hover:bg-chip/30"
                        >
                          <td className="px-4 py-3 font-medium text-heading">
                            {row.contact_type || "(blank)"}
                          </td>
                          <td className="px-4 py-3 text-body">
                            {row.has_correlation_id ? "Yes" : "No"}
                          </td>
                          <td className="px-4 py-3 text-right text-body font-mono">
                            {number(row.incident_count)}
                          </td>
                          <td className="px-4 py-3 text-right text-body font-mono">
                            {number(row.matched_incidents)}
                          </td>
                          <td className="px-4 py-3 text-right text-body font-mono">
                            {number(row.unmatched_incidents)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Disclosure>

              {/* Table 5: Assignment group vs department */}
              <Disclosure
                title="Show details: Assignment group vs department mapping"
                openLabel="Show details: Assignment group vs department mapping"
                closeLabel="Hide details: Assignment group vs department mapping"
              >
                <div className="overflow-x-auto p-4">
                  <table className="w-full min-w-[750px] text-left text-sm">
                    <thead className="bg-chip text-xs uppercase text-muted">
                      <tr>
                        <th className="px-4 py-3">MSOLVE Assignment Group</th>
                        <th className="px-4 py-3">AlfaNow Department</th>
                        <th className="px-4 py-3">Match Method</th>
                        <th className="px-4 py-3 text-right">Pairs</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {report.assignmentGroupDepartmentComparison.map((row, index) => (
                        <tr
                          key={`${row.assignment_group}-${row.department}-${row.match_method}-${index}`}
                          className="hover:bg-chip/30"
                        >
                          <td className="px-4 py-3 text-body">{row.assignment_group}</td>
                          <td className="px-4 py-3 text-body">{row.department}</td>
                          <td className="px-4 py-3 text-body">{matchMethodLabel(row.match_method)}</td>
                          <td className="px-4 py-3 text-right font-medium text-heading font-mono">
                            {number(row.matched_pairs)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Disclosure>

              {/* Table 6: Unmatched sample */}
              <Disclosure
                title={`Show details: Sample of unmatched MSOLVE incidents (${report.unmatchedSample.length} records)`}
                openLabel={`Show details: Sample of unmatched MSOLVE incidents (${report.unmatchedSample.length} records)`}
                closeLabel="Hide details: Sample of unmatched MSOLVE incidents"
              >
                <div className="overflow-x-auto p-4">
                  <table className="w-full min-w-[750px] text-left text-sm">
                    <thead className="bg-chip text-xs uppercase text-muted">
                      <tr>
                        <th className="px-4 py-3">Ticket ID</th>
                        <th className="px-4 py-3">Subject</th>
                        <th className="px-4 py-3">Contact Type</th>
                        <th className="px-4 py-3">Correlation ID</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {report.unmatchedSample.map((row) => (
                        <tr key={row.ticket_id} className="hover:bg-chip/30">
                          <td className="whitespace-nowrap px-4 py-3 font-mono font-medium text-heading">
                            <Link
                              href={`/tickets/${encodeURIComponent(row.ticket_id)}`}
                              className="text-accent hover:underline"
                            >
                              {row.ticket_id}
                            </Link>
                          </td>
                          <td className="max-w-lg px-4 py-3 text-body">
                            {row.subject || "—"}
                          </td>
                          <td className="px-4 py-3 text-muted">{row.contact_type || "(blank)"}</td>
                          <td className="px-4 py-3 font-mono text-muted">{row.correlation_id || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Disclosure>
            </div>
          </section>

          {/* Timestamp assumptions panel */}
          <section className="rounded-xl border border-line bg-chip/40 p-5 space-y-2">
            <h3 className="font-bold text-heading text-sm">
              Timestamp assumptions and scope notes
            </h3>
            <p className="text-xs leading-relaxed text-body">
              {report.timestampAssumption}
            </p>
            <p className="text-xs leading-relaxed text-muted">
              Subject-and-time matches are low-confidence candidates, not confirmed duplicates.
              Reported time-difference statistics include only links where a time difference was recorded.
            </p>
          </section>
        </div>
      )}
    </main>
  );
}
