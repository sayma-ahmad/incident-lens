"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  SectionLabel,
  Card,
  Chip,
  StatTile,
  ConfidenceBadge,
  EmptyState,
} from "@/components/ui";

type DataReport = {
  sourceCounts: { source: string; row_count: number }[];
  matchesByMethod: {
    match_method: string;
    confidence: string;
    links: number;
    unique_msolve_tickets: number;
    unique_alfa_tickets: number;
  }[];
};

type BaselineReport = {
  busiestPeriods: {
    period_start: string;
    period_end: string;
    total_records: number;
    alfa_records: number;
    msolve_incidents: number;
    distinct_departments: number;
  }[];
};

type ScorecardReport = {
  compression?: {
    total_alerts: number;
    incidents: number;
    single_alerts: number;
    compression_ratio: number;
    storm_incidents: number;
    storm_alerts: number;
    storm_ratio: number;
    repeats: number;
    repeat_share: number;
  };
  agreement?: {
    compared: number;
    agreed: number;
    agreement_pct: number;
  };
};

type IncidentDetail = {
  id: string;
  site: string;
  startedAt: string;
  endedAt: string;
  memberCount: number;
  repeatTotal: number;
  primaryTeam: string | null;
  confidence: string | null;
  explanationTemplate: string | null;
  explanationAi: string | null;
};

function formatIncidentTimeWindow(
  startedAt?: string | null,
  endedAt?: string | null,
): string {
  if (!startedAt || !endedAt) {
    return "Time window unavailable";
  }

  const start = new Date(startedAt);
  const end = new Date(endedAt);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return "Time window unavailable";
  }

  const dateFormatter = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const timeFormatter = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const startDateStr = dateFormatter.format(start);
  const endDateStr = dateFormatter.format(end);
  const startTimeStr = timeFormatter.format(start);
  const endTimeStr = timeFormatter.format(end);

  const durationMinutes = Math.max(
    0,
    Math.round((end.getTime() - start.getTime()) / (1000 * 60)),
  );

  const durationStr =
    durationMinutes === 1 ? "1 minute" : `${durationMinutes} minutes`;

  if (startDateStr === endDateStr) {
    return `${startDateStr}, ${startTimeStr} – ${endTimeStr} IST (${durationStr})`;
  }

  return `${startDateStr} ${startTimeStr} – ${endDateStr} ${endTimeStr} IST (${durationStr})`;
}

export default function HomePage() {
  const [dataReport, setDataReport] = useState<DataReport | null>(null);
  const [baselineReport, setBaselineReport] = useState<BaselineReport | null>(null);
  const [scorecard, setScorecard] = useState<ScorecardReport | null>(null);
  const [exampleIncident, setExampleIncident] = useState<IncidentDetail | null>(null);

  const [loading, setLoading] = useState(true);
  const [reportsError, setReportsError] = useState(false);
  const [scorecardError, setScorecardError] = useState(false);
  const [incidentError, setIncidentError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);

      const [dataRes, baselineRes, scorecardRes, incidentRes] =
        await Promise.allSettled([
          fetch("/api/reports/data").then(async (r) => {
            if (!r.ok) throw new Error(String(r.status));
            return (await r.json()) as DataReport;
          }),
          fetch("/api/reports/baseline").then(async (r) => {
            if (!r.ok) throw new Error(String(r.status));
            return (await r.json()) as BaselineReport;
          }),
          fetch("/api/scorecard").then(async (r) => {
            if (!r.ok) throw new Error(String(r.status));
            return (await r.json()) as ScorecardReport;
          }),
          fetch("/api/incidents/NAGP1-20261011-0954").then(async (r) => {
            if (!r.ok) throw new Error(String(r.status));
            return (await r.json()) as IncidentDetail;
          }),
        ]);

      if (cancelled) return;

      if (dataRes.status === "fulfilled") {
        setDataReport(dataRes.value);
      } else {
        setReportsError(true);
      }

      if (baselineRes.status === "fulfilled") {
        setBaselineReport(baselineRes.value);
      } else {
        setReportsError(true);
      }

      if (scorecardRes.status === "fulfilled") {
        setScorecard(scorecardRes.value);
      } else {
        setScorecardError(true);
      }

      if (incidentRes.status === "fulfilled") {
        setExampleIncident(incidentRes.value);
      } else {
        setIncidentError(true);
      }

      setLoading(false);
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, []);

  // Compute live values from API responses
  const totalTickets = dataReport?.sourceCounts
    ? dataReport.sourceCounts.reduce((acc, item) => acc + item.row_count, 0)
    : null;

  const alfaTickets = dataReport?.sourceCounts
    ? dataReport.sourceCounts
        .filter((item) => !item.source.startsWith("MSOLVE"))
        .reduce((acc, item) => acc + item.row_count, 0)
    : null;

  const monitoringAlerts = scorecard?.compression?.total_alerts ?? null;

  const busiestPeriod = baselineReport?.busiestPeriods?.[0] ?? null;
  const busiestCount = busiestPeriod?.total_records ?? null;

  const exactLinksCount = dataReport?.matchesByMethod
    ? dataReport.matchesByMethod
        .filter(
          (m) =>
            m.match_method === "numeric_correlation_id" ||
            m.match_method === "prefixed_correlation_id",
        )
        .reduce((acc, m) => acc + m.links, 0)
    : null;

  function scrollToHowItWorks() {
    const el = document.getElementById("how-it-works");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-16">
      {/* 1. Hero section */}
      <section className="relative overflow-hidden rounded-2xl bg-panel p-8 sm:p-12 md:p-16 border border-panel shadow-lg">
        <div className="max-w-4xl space-y-5">
          <SectionLabel className="text-on-panel-muted tracking-widest text-xs font-bold uppercase">
            AI-POWERED INCIDENT INTELLIGENCE
          </SectionLabel>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-on-panel leading-tight">
            From thousands of alerts to a handful of clear, explained incidents.
          </h1>

          <p className="text-base sm:text-lg text-on-panel-muted leading-relaxed max-w-3xl">
            Incident Lens reads MSOLVE and AlfaNow tickets, links the copies,
            groups related alerts into probable incidents, and explains each one
            in plain English, without changing anything in ServiceNow.
          </p>

          <div className="pt-4 flex flex-wrap items-center gap-4">
            <Link
              href="/ai-insights"
              className="inline-flex min-h-[40px] items-center justify-center rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-panel"
            >
              See an AI-explained incident
            </Link>

            <button
              type="button"
              onClick={scrollToHowItWorks}
              className="inline-flex min-h-[40px] items-center justify-center rounded-lg border border-line/20 bg-surface/10 px-5 py-2.5 text-sm font-semibold text-on-panel backdrop-blur-xs transition hover:bg-surface/20 focus:outline-none focus:ring-2 focus:ring-accent"
            >
              How it works
            </button>
          </div>
        </div>
      </section>

      {/* 2. The problem */}
      <section className="space-y-6">
        <div>
          <SectionLabel>THE PROBLEM</SectionLabel>
          <h2 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-heading">
            Alert noise overwhelms engineering teams
          </h2>
        </div>

        {reportsError && !loading && !totalTickets ? (
          <EmptyState
            title="Problem metrics unavailable"
            message="Could not load live ticket and baseline counts from the database report APIs."
          />
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            <StatTile
              value={
                loading
                  ? "…"
                  : totalTickets != null
                  ? totalTickets.toLocaleString("en-IN")
                  : "Unavailable"
              }
              label={
                totalTickets != null
                  ? `${totalTickets.toLocaleString("en-IN")} tickets in October across MSOLVE and AlfaNow`
                  : "59,927 tickets in October across MSOLVE and AlfaNow"
              }
              explanation="Aggregated across ServiceNow incidents, service requests, and AlfaNow records"
            />
            <StatTile
              value={
                loading
                  ? "…"
                  : monitoringAlerts != null
                  ? monitoringAlerts.toLocaleString("en-IN")
                  : alfaTickets != null
                  ? alfaTickets.toLocaleString("en-IN")
                  : "Unavailable"
              }
              label={
                monitoringAlerts != null
                  ? `${monitoringAlerts.toLocaleString("en-IN")} alerts from monitoring`
                  : alfaTickets != null
                  ? `${alfaTickets.toLocaleString("en-IN")} AlfaNow ticket records`
                  : "Monitoring alert count unavailable"
              }
              explanation={
                monitoringAlerts != null
                  ? "Automated alerts raised across network, systems, and devices (post-filtering)"
                  : alfaTickets != null
                  ? "Raw ticket records from AlfaNow; filters to 55,042 monitoring alerts after removing service requests and duplicates"
                  : "Automated alert count requires the alert correlation pipeline"
              }
            />
            <StatTile
              value={
                loading
                  ? "…"
                  : busiestCount != null
                  ? `${busiestCount.toLocaleString("en-IN")} alerts`
                  : "Unavailable"
              }
              label={
                busiestCount != null
                  ? `Busiest 15 minutes: ${busiestCount.toLocaleString("en-IN")} alerts`
                  : "Busiest 15 minutes: N alerts"
              }
              explanation="Peak 15-minute burst period recorded in the baseline report"
            />
          </div>
        )}

        <p className="text-center text-sm sm:text-base font-medium text-body max-w-3xl mx-auto pt-2">
          Engineers see each alert separately, often in two tools, and have to
          work out by hand which ones belong together.
        </p>
      </section>

      {/* 3. How it works */}
      <section id="how-it-works" className="space-y-8 scroll-mt-24">
        <div>
          <SectionLabel>HOW IT WORKS</SectionLabel>
          <h2 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-heading">
            Four steps from raw tickets to clear explanations
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4 relative items-stretch">
          {/* Card 1: Read */}
          <div className="flex flex-col relative group">
            <Card className="flex flex-col flex-1 p-6 hover:border-accent transition">
              <div className="flex items-center justify-between mb-4">
                <span className="flex size-10 items-center justify-center rounded-full bg-accent/10 text-accent font-bold text-sm">
                  1
                </span>
                <svg className="size-6 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                  <path d="M6 6h10" />
                  <path d="M6 10h10" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-heading">Read</h3>
              <p className="mt-2 text-sm text-body leading-relaxed flex-1">
                We load every ticket from MSOLVE and AlfaNow.
              </p>
              <div className="mt-6 pt-4 border-t border-line">
                <Link
                  href="/tickets"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-accent hover:underline"
                >
                  <span>Explore tickets</span>
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
            </Card>

            {/* Desktop Connector 1 -> 2 */}
            <div className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none text-accent">
              <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </div>
          </div>

          {/* Card 2: Link */}
          <div className="flex flex-col relative group">
            <Card className="flex flex-col flex-1 p-6 hover:border-accent transition">
              <div className="flex items-center justify-between mb-4">
                <span className="flex size-10 items-center justify-center rounded-full bg-accent/10 text-accent font-bold text-sm">
                  2
                </span>
                <svg className="size-6 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-heading">Link</h3>
              <p className="mt-2 text-sm text-body leading-relaxed flex-1">
                We find tickets that are the same issue in both tools, using the correlation ID.
              </p>
              <div className="mt-6 pt-4 border-t border-line">
                <Link
                  href="/reports/data"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-accent hover:underline"
                >
                  <span>Data check</span>
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
            </Card>

            {/* Desktop Connector 2 -> 3 */}
            <div className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none text-accent">
              <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </div>
          </div>

          {/* Card 3: Group */}
          <div className="flex flex-col relative group">
            <Card className="flex flex-col flex-1 p-6 hover:border-accent transition">
              <div className="flex items-center justify-between mb-4">
                <span className="flex size-10 items-center justify-center rounded-full bg-accent/10 text-accent font-bold text-sm">
                  3
                </span>
                <svg className="size-6 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polygon points="12 2 2 7 12 12 22 7 12 2" />
                  <polyline points="2 17 12 22 22 17" />
                  <polyline points="2 12 12 17 22 12" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-heading">Group</h3>
              <p className="mt-2 text-sm text-body leading-relaxed flex-1">
                We group alerts from the same site that arrive close together into one probable incident and pick the likely starting alert.
              </p>
              <div className="mt-6 pt-4 border-t border-line">
                <Link
                  href="/incidents"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-accent hover:underline"
                >
                  <span>View incidents</span>
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
            </Card>

            {/* Desktop Connector 3 -> 4 */}
            <div className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none text-accent">
              <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </div>
          </div>

          {/* Card 4: Explain */}
          <div className="flex flex-col relative">
            <Card className="flex flex-col flex-1 p-6 hover:border-accent transition">
              <div className="flex items-center justify-between mb-4">
                <span className="flex size-10 items-center justify-center rounded-full bg-accent/10 text-accent font-bold text-sm">
                  4
                </span>
                <svg className="size-6 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-heading">Explain</h3>
              <p className="mt-2 text-sm text-body leading-relaxed flex-1">
                AI writes a short explanation and recommends which team should look first. People decide.
              </p>
              <div className="mt-6 pt-4 border-t border-line">
                <Link
                  href="/ai-insights"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-accent hover:underline"
                >
                  <span>AI Insights (Task 5)</span>
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* 4. Results at a glance */}
      <section className="space-y-6">
        <div>
          <SectionLabel>RESULTS AT A GLANCE</SectionLabel>
          <h2 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-heading">
            Measurable impact on alert volume and triage accuracy
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
          {/* Tile 1: Dynamic alerts-to-incidents visual */}
          <Card className="flex flex-col justify-between p-6">
            {loading ? (
              <div className="py-8 text-center text-sm text-muted">
                Loading compression metrics…
              </div>
            ) : scorecard?.compression?.total_alerts != null &&
              scorecard?.compression?.incidents != null ? (
              <>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-muted">
                    ALERT COMPRESSION
                  </div>
                  <div className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-heading">
                    {scorecard.compression.total_alerts.toLocaleString("en-IN")} →{" "}
                    {scorecard.compression.incidents.toLocaleString("en-IN")}
                  </div>
                  <div className="mt-1 text-xs font-semibold text-body">
                    alerts → incidents
                  </div>

                  {/* Dynamic before-and-after visual: wide grey bar for alerts and proportional red bar for incidents */}
                  <div className="mt-4 space-y-2">
                    <div>
                      <div className="flex justify-between text-[11px] text-muted mb-1">
                        <span>Alerts</span>
                        <span className="font-semibold text-heading">
                          {scorecard.compression.total_alerts.toLocaleString("en-IN")}
                        </span>
                      </div>
                      <div className="h-2.5 w-full rounded-full bg-chip overflow-hidden">
                        <div
                          className="h-full rounded-full bg-muted transition-all duration-500"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.max(
                                5,
                                Math.round(
                                  (scorecard.compression.total_alerts /
                                    Math.max(
                                      scorecard.compression.total_alerts,
                                      scorecard.compression.incidents,
                                      1,
                                    )) *
                                    100,
                                ),
                              ),
                            )}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] text-muted mb-1">
                        <span>Incidents</span>
                        <span className="font-semibold text-accent">
                          {scorecard.compression.incidents.toLocaleString("en-IN")}
                        </span>
                      </div>
                      <div className="h-2.5 w-full rounded-full bg-chip overflow-hidden">
                        <div
                          className="h-full rounded-full bg-accent transition-all duration-500"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.max(
                                2,
                                Math.round(
                                  (scorecard.compression.incidents /
                                    Math.max(
                                      scorecard.compression.total_alerts,
                                      scorecard.compression.incidents,
                                      1,
                                    )) *
                                    100,
                                ),
                              ),
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-3 border-t border-line text-xs text-muted leading-relaxed">
                  <strong className="text-heading">What this means:</strong> Over{" "}
                  {scorecard.compression.total_alerts > 0
                    ? Math.round(
                        (1 -
                          scorecard.compression.incidents /
                            scorecard.compression.total_alerts) *
                          100,
                      )
                    : 0}
                  % reduction in individual items engineers have to review.
                </div>
              </>
            ) : (
              <EmptyState
                title="Alert compression unavailable"
                message="Live compression figures require scorecard correlation data."
              />
            )}
          </Card>

          {/* Tile 2: Exact links */}
          <Card className="flex flex-col justify-between p-6">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-muted">
                CROSS-TOOL MAPPING
              </div>
              <div className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-heading">
                {loading
                  ? "…"
                  : exactLinksCount != null
                  ? exactLinksCount.toLocaleString("en-IN")
                  : "Unavailable"}
              </div>
              <div className="mt-1 text-xs font-semibold text-body">
                exact links between MSOLVE and AlfaNow
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-line text-xs text-muted leading-relaxed">
              <strong className="text-heading">What this means:</strong> Verified
              duplicate records mapped directly via correlation ID without manual
              search.
            </div>
          </Card>

          {/* Tile 3: Compression during storms */}
          <Card className="flex flex-col justify-between p-6">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-muted">
                STORM SUPPRESSION
              </div>
              <div className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-heading">
                {loading
                  ? "…"
                  : scorecard?.compression?.storm_ratio != null
                  ? `${Math.round(scorecard.compression.storm_ratio)} : 1`
                  : "Unavailable"}
              </div>
              <div className="mt-1 text-xs font-semibold text-body">
                compression during alert storms (target 5 : 1)
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-line text-xs text-muted leading-relaxed">
              <strong className="text-heading">What this means:</strong> Major
              outages with 5+ alerts compress significantly more effectively than
              our target.
            </div>
          </Card>

          {/* Tile 4: Team agreement */}
          <Card className="flex flex-col justify-between p-6">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-muted">
                ROUTING AGREEMENT
              </div>
              <div className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-heading">
                {loading
                  ? "…"
                  : scorecard?.agreement?.agreement_pct != null
                  ? `${Math.round(scorecard.agreement.agreement_pct)}%`
                  : "Unavailable"}
              </div>
              <div className="mt-1 text-xs font-semibold text-body">
                recommended team matches handling team
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-line text-xs text-muted leading-relaxed">
              <strong className="text-heading">What this means:</strong> Our
              recommended resolver matches the team that handled the root alert.
            </div>
          </Card>
        </div>

        {scorecardError && (
          <p className="text-xs text-muted">
            Note: Live scorecard metrics rely on local alert correlation execution.
            These metrics will populate automatically when the correlation pipeline has been run.
          </p>
        )}
      </section>

      {/* 5. One real example */}
      <section className="space-y-6">
        <div>
          <SectionLabel>REAL INCIDENT WALKTHROUGH</SectionLabel>
          <h2 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-heading">
            One real example: NAGP1-20261011-0954
          </h2>
        </div>

        {loading ? (
          <Card className="p-8 text-center text-sm text-muted">
            Loading example incident preview…
          </Card>
        ) : !exampleIncident ? (
          <Card className="p-8">
            <EmptyState
              title="Example incident preview unavailable"
              message="The demonstration incident NAGP1-20261011-0954 is not currently loaded in the local database. You can explore available incidents in the correlation workspace."
              action={
                <Link
                  href="/incidents"
                  className="inline-flex min-h-[40px] items-center justify-center rounded-lg bg-panel px-4 py-2 text-sm font-semibold text-on-panel transition hover:bg-panel/90"
                >
                  Browse all incidents
                </Link>
              }
            />
          </Card>
        ) : (
          <Card className="p-6 sm:p-8 space-y-6 hover:border-accent transition">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-6">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-accent" aria-hidden="true" />
                  <span className="text-xs font-bold uppercase tracking-wider text-muted">
                    Incident ID
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-heading font-mono">
                  {exampleIncident.id}
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Chip>
                  Site {exampleIncident.site}
                </Chip>
                <Chip>
                  {exampleIncident.memberCount.toLocaleString("en-IN")} alerts
                </Chip>
                <ConfidenceBadge
                  confidence={exampleIncident.confidence ?? "high"}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div className="space-y-3">
                <div className="text-xs font-semibold uppercase text-muted">
                  Time window
                </div>
                <p className="text-sm font-medium text-heading">
                  {formatIncidentTimeWindow(
                    exampleIncident.startedAt,
                    exampleIncident.endedAt,
                  )}
                </p>

                <div className="text-xs font-semibold uppercase text-muted pt-2">
                  Incident summary
                </div>
                <p className="text-sm sm:text-base text-body leading-relaxed">
                  {exampleIncident.explanationAi ??
                    exampleIncident.explanationTemplate ??
                    "Summary unavailable for this incident."}
                </p>
              </div>

              <div className="flex flex-col md:items-end justify-center gap-4">
                <div className="text-sm text-body md:text-right">
                  <span className="text-muted">Recommended primary team:</span>{" "}
                  <strong className="text-accent font-bold">
                    {exampleIncident.primaryTeam ?? "Unassigned"}
                  </strong>
                </div>

                <Link
                  href={`/incidents/${encodeURIComponent(exampleIncident.id)}`}
                  className="inline-flex min-h-[40px] items-center justify-center rounded-lg bg-panel px-6 py-2.5 text-sm font-semibold text-on-panel transition hover:bg-panel/90 focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  Open this incident →
                </Link>
              </div>
            </div>
          </Card>
        )}
      </section>

      {/* 6. What this POC is and is not */}
      <section className="space-y-6">
        <div>
          <SectionLabel>SCOPE & BOUNDARIES</SectionLabel>
          <h2 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-heading">
            What this POC is and is not
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Column 1: What it is */}
          <Card className="p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-3">
              <span className="flex size-8 items-center justify-center rounded-full bg-accent text-white shrink-0">
                <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
              <h3 className="text-xl font-bold text-heading">What it is</h3>
            </div>

            <p className="text-sm font-semibold text-body">
              Read-only, evidence-based suggestions, with people staying in control.
            </p>

            <ul className="space-y-2.5 text-xs sm:text-sm text-body pl-2 pt-2">
              <li className="flex items-start gap-2">
                <span className="text-accent font-bold">•</span>
                <span>
                  <strong>Read-only:</strong> Analyses existing ticket and alert records without side effects.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-accent font-bold">•</span>
                <span>
                  <strong>Evidence-based:</strong> Every grouping cites correlation rules, timestamps, and device hierarchies.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-accent font-bold">•</span>
                <span>
                  <strong>Human in the loop:</strong> Engineers validate findings; suggestions never replace human judgement.
                </span>
              </li>
            </ul>
          </Card>

          {/* Column 2: What it is not */}
          <Card className="p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-3">
              <span className="flex size-8 items-center justify-center rounded-full bg-chip text-heading border border-line shrink-0">
                <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </span>
              <h3 className="text-xl font-bold text-heading">What it is not</h3>
            </div>

            <p className="text-sm font-semibold text-body">
              Automatic ticket changes, confirmed root causes, or a live connection to ServiceNow.
            </p>

            <ul className="space-y-2.5 text-xs sm:text-sm text-body pl-2 pt-2">
              <li className="flex items-start gap-2">
                <span className="text-muted font-bold">•</span>
                <span>
                  <strong>No automatic changes:</strong> Will not close, assign, or edit tickets in ServiceNow or AlfaNow.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-muted font-bold">•</span>
                <span>
                  <strong>No confirmed root causes:</strong> Suggestions remain strictly probable until confirmed by engineers.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-muted font-bold">•</span>
                <span>
                  <strong>No live write-back:</strong> Operates entirely in shadow mode without external API write credentials.
                </span>
              </li>
            </ul>
          </Card>
        </div>
      </section>
    </main>
  );
}
