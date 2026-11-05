"use client";

import { useEffect, useState, useRef, type FormEvent } from "react";
import Link from "next/link";
import {
  PageHeader,
  Card,
  Chip,
  StatTile,
  Disclosure,
  EmptyState,
  SelectField,
  DateField,
} from "@/components/ui";
import { deviceTypeLabel, symptomLabel } from "@/lib/labels";

export interface CorrelationSummary {
  total: number;
  distinctTickets: number;
  withDevice: number;
  withLocation: number;
  withInterface: number;
  repeats: number;
  autoClosed: number;
  inIncidents: number;
  stage1Correlated: number;
  stage2Cascading: number;
  upstreamRoots: number;
}

export interface CorrelationEventItem {
  ticket_id: string;
  created_at: string;
  location: string | null;
  device_hostname: string | null;
  interface_name: string | null;
  device_type: string | null;
  tier: number | null;
  symptom: string | null;
  symptom_rank: number | null;
  source_department: string | null;
  recommended_team: string;
  is_root_trigger: boolean;
  incident_id: string | null;
  subject: string | null;
  is_repeat: boolean;
  repeat_count: number;
  auto_closed: boolean;
  correlation_stage: "stage1_same_location" | "stage2_cascading" | "single_device";
  is_upstream_root: boolean;
  correlated_upstream_device: string | null;
  stage1_device_count: number;
  stage2_site_count: number;
  window_seconds: number;
}

export interface CorrelatedClusterItem {
  cluster_id: string;
  stage: "stage1_same_location" | "stage2_cascading";
  location: string | null;
  total_alerts: number;
  distinct_devices: number;
  distinct_locations: number;
  started_at: string;
  ended_at: string;
  root_ticket_id: string;
  upstream_device: string | null;
  upstream_device_type: string | null;
  upstream_tier: number | null;
  upstream_symptom: string | null;
  affected_devices: string[];
  affected_locations: string[];
  ticket_ids: string[];
}

interface ApiResult {
  summary: CorrelationSummary;
  limit: number;
  offset: number;
  windowSeconds: number;
  stage: string;
  items: CorrelationEventItem[];
  clusters?: CorrelatedClusterItem[];
}

interface Filters {
  from: string;
  to: string;
  site: string;
  device: string;
  team: string;
  deviceType: string;
  windowSeconds: number;
  stage: "all" | "stage1" | "stage2" | "upstream_root";
  viewMode: "alerts" | "clusters";
}

const emptyFilters: Filters = {
  from: "",
  to: "",
  site: "",
  device: "",
  team: "",
  deviceType: "",
  windowSeconds: 45,
  stage: "all",
  viewMode: "alerts",
};

const PAGE_SIZE = 50;

const PRESET_WINDOWS = [
  { value: 30, label: "30s", desc: "30-second initial baseline" },
  { value: 45, label: "45s", desc: "45-second recommended baseline" },
  { value: 60, label: "60s", desc: "1-minute standard window" },
  { value: 75, label: "75s", desc: "1m 15s extended window" },
  { value: 90, label: "90s", desc: "1m 30s cascading discovery" },
  { value: 120, label: "120s", desc: "2-minute wide window" },
  { value: 180, label: "180s", desc: "3-minute saturation ceiling" },
];

const STAGE_OPTIONS = [
  { value: "all", label: "All alerts & stages" },
  { value: "stage1", label: "Stage 1 · Same-location multi-device" },
  { value: "stage2", label: "Stage 2 · Cross-location cascading" },
  { value: "upstream_root", label: "Upstream root triggers only" },
];

const TEAM_OPTIONS = [
  { value: "", label: "All teams" },
  { value: "RID-Network", label: "RID-Network" },
  { value: "RID_Windows", label: "RID_Windows" },
  { value: "RID_Linux", label: "RID_Linux" },
  { value: "RID_Storage", label: "RID_Storage" },
  { value: "Internal Exchange", label: "Internal Exchange" },
  { value: "RID_Virtualization", label: "RID_Virtualization" },
  { value: "Share Point", label: "Share Point" },
  { value: "Intune", label: "Intune" },
  { value: "Needs triage", label: "Needs triage" },
];

const LAYER_OPTIONS = [
  { value: "", label: "All layers" },
  { value: "sdwan_firewall", label: "Firewall / SD-WAN (Tier 1)" },
  { value: "core_switch", label: "Core switch (Tier 1)" },
  { value: "access_switch", label: "Access switch (Tier 2)" },
  { value: "access_point", label: "Access point (Tier 3)" },
  { value: "windows_server", label: "Windows server (Tier 4)" },
  { value: "linux_server", label: "Linux server (Tier 4)" },
  { value: "storage", label: "Storage (Tier 4)" },
  { value: "other", label: "Other device (Tier 5)" },
];

function formatTime(value: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return (
    new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
      timeStyle: "medium",
      timeZone: "Asia/Kolkata",
    }).format(date) + " IST"
  );
}

function formatLayer(deviceType: string | null, tier: number | null) {
  if (!deviceType && tier === null) return "Unknown layer";
  const label = deviceTypeLabel(deviceType);
  return tier !== null ? `${label} (Tier ${tier})` : label;
}

function formatTrigger(symptom: string | null) {
  if (!symptom) return "Unknown trigger";
  return symptomLabel(symptom);
}

interface AlertAnalysisDashboardProps {
  sectionLabel?: string;
  title?: string;
  description?: string;
}

export function AlertAnalysisDashboard({
  sectionLabel = "STEP 3.5 · ANALYSIS",
  title = "Alert Analysis & Incident Correlation",
  description = "Inspect distinct alert tickets, execute iterative trial-and-error correlation threshold discovery, and identify upstream failure triggers across dependent network devices and physical sites.",
}: AlertAnalysisDashboardProps) {
  const [result, setResult] = useState<ApiResult | null>(null);
  const [clustersList, setClustersList] = useState<CorrelatedClusterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingClusters, setLoadingClusters] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);

  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState<Filters>(emptyFilters);

  // Iterative discovery tracking: tracks previous window & correlated volume to detect saturation threshold
  const prevWindowRef = useRef<number>(45);
  const prevCorrelatedRef = useRef<number | null>(null);
  const [thresholdFeedback, setThresholdFeedback] = useState<{
    prevWindow: number;
    newWindow: number;
    deltaTickets: number;
    isSaturated: boolean;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadEvents() {
      setLoading(true);
      setError("");

      const offset = (page - 1) * PAGE_SIZE;
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(offset),
        windowSeconds: String(appliedFilters.windowSeconds),
        stage: appliedFilters.stage,
      });

      if (appliedFilters.from) {
        const fromIso = appliedFilters.from.includes("T")
          ? `${appliedFilters.from}:00+05:30`
          : `${appliedFilters.from}T00:00:00+05:30`;
        params.set("from", fromIso);
      }

      if (appliedFilters.to) {
        const toIso = appliedFilters.to.includes("T")
          ? `${appliedFilters.to}:00+05:30`
          : `${appliedFilters.to}T23:59:59+05:30`;
        params.set("to", toIso);
      }

      if (appliedFilters.site.trim()) {
        params.set("site", appliedFilters.site.trim());
      }
      if (appliedFilters.device.trim()) {
        params.set("device", appliedFilters.device.trim());
      }
      if (appliedFilters.team.trim()) {
        params.set("team", appliedFilters.team.trim());
      }
      if (appliedFilters.deviceType.trim()) {
        params.set("deviceType", appliedFilters.deviceType.trim());
      }

      try {
        const response = await fetch(`/api/alert-correlation?${params.toString()}`);
        const data = (await response.json()) as ApiResult | { error?: string };

        if (!response.ok) {
          throw new Error(
            "error" in data && data.error ? data.error : "Unable to load alert analysis records.",
          );
        }

        if (!cancelled) {
          const apiRes = data as ApiResult;
          setResult(apiRes);

          // Calculate correlation threshold feedback when window changes
          const currentCorrelated = apiRes.summary.stage1Correlated + apiRes.summary.stage2Cascading;
          if (
            prevCorrelatedRef.current !== null &&
            prevWindowRef.current !== appliedFilters.windowSeconds
          ) {
            const delta = currentCorrelated - prevCorrelatedRef.current;
            setThresholdFeedback({
              prevWindow: prevWindowRef.current,
              newWindow: appliedFilters.windowSeconds,
              deltaTickets: delta,
              isSaturated: delta === 0 && appliedFilters.windowSeconds > prevWindowRef.current,
            });
          }

          prevWindowRef.current = appliedFilters.windowSeconds;
          prevCorrelatedRef.current = currentCorrelated;
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to load alert records.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadEvents();

    return () => {
      cancelled = true;
    };
  }, [page, appliedFilters]);

  // Load cluster groupings if clusters view mode is selected
  useEffect(() => {
    let cancelled = false;

    async function loadClusters() {
      if (appliedFilters.viewMode !== "clusters") return;

      setLoadingClusters(true);
      const params = new URLSearchParams({
        windowSeconds: String(appliedFilters.windowSeconds),
        stage: appliedFilters.stage,
        limit: "50",
      });

      if (appliedFilters.site.trim()) params.set("site", appliedFilters.site.trim());
      if (appliedFilters.device.trim()) params.set("device", appliedFilters.device.trim());
      if (appliedFilters.team.trim()) params.set("team", appliedFilters.team.trim());
      if (appliedFilters.deviceType.trim()) params.set("deviceType", appliedFilters.deviceType.trim());

      try {
        const res = await fetch(`/api/alert-correlation/clusters?${params.toString()}`);
        if (res.ok) {
          const list = (await res.json()) as CorrelatedClusterItem[];
          if (!cancelled) {
            setClustersList(list);
          }
        }
      } catch (e) {
        console.error("Failed loading clusters:", e);
      } finally {
        if (!cancelled) {
          setLoadingClusters(false);
        }
      }
    }

    void loadClusters();

    return () => {
      cancelled = true;
    };
  }, [appliedFilters]);

  function handleFilterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (filters.from && filters.to && filters.from > filters.to) {
      setError("The start date must be earlier than or equal to the end date.");
      return;
    }

    setPage(1);
    setAppliedFilters({ ...filters });
  }

  function handleReset() {
    setFilters({ ...emptyFilters });
    setAppliedFilters({ ...emptyFilters });
    setThresholdFeedback(null);
    setPage(1);
  }

  function updateWindowSeconds(seconds: number) {
    const val = Math.min(Math.max(Math.round(seconds), 15), 600);
    const updated = { ...filters, windowSeconds: val };
    setFilters(updated);
    setAppliedFilters((prev) => ({ ...prev, windowSeconds: val }));
    setPage(1);
  }

  function stepWindow(delta: number) {
    const nextVal = Math.min(Math.max(appliedFilters.windowSeconds + delta, 15), 600);
    updateWindowSeconds(nextVal);
  }

  function updateStage(stage: Filters["stage"]) {
    const updated = { ...filters, stage };
    setFilters(updated);
    setAppliedFilters((prev) => ({ ...prev, stage }));
    setPage(1);
  }

  function removeFilter(key: keyof Filters) {
    const updated = { ...appliedFilters, [key]: emptyFilters[key] };
    setFilters(updated);
    setAppliedFilters(updated);
    setPage(1);
  }

  const hasActiveFilters = Boolean(
    appliedFilters.from ||
      appliedFilters.to ||
      appliedFilters.site ||
      appliedFilters.device ||
      appliedFilters.team ||
      appliedFilters.deviceType ||
      appliedFilters.stage !== "all" ||
      appliedFilters.windowSeconds !== 45,
  );

  const summary = result?.summary ?? {
    total: 0,
    distinctTickets: 0,
    withDevice: 0,
    withLocation: 0,
    withInterface: 0,
    repeats: 0,
    autoClosed: 0,
    inIncidents: 0,
    stage1Correlated: 0,
    stage2Cascading: 0,
    upstreamRoots: 0,
  };

  const totalCorrelated = summary.stage1Correlated + summary.stage2Cascading;
  const totalPages = Math.max(Math.ceil((summary.total ?? 0) / PAGE_SIZE), 1);
  const currentOffset = (page - 1) * PAGE_SIZE;
  const currentCount = result?.items.length ?? 0;
  const rangeStart = summary.total > 0 ? currentOffset + 1 : 0;
  const rangeEnd = Math.min(currentOffset + currentCount, summary.total);

  return (
    <main className="mx-auto max-w-7xl p-6 space-y-6">
      {/* Page Header */}
      <PageHeader
        sectionLabel={sectionLabel}
        title={title}
        description={description}
        howToRead={[
          "Each card represents a distinct monitoring alert event loaded from AlfaNow.",
          "Actual device hostname and interface name are shown separately with monospace styling wherever supported by the source data.",
          "Network layer (device tier), likely trigger (symptom), source department, and recommended team are derived from confirmed attributes and tier rules.",
          "Upstream root triggers are identified by network layer (Tier 1 Core Switch / Firewall > Tier 2 Access Switch > Tier 3 AP > Tier 4 Server) and symptom severity.",
          "Stage 1 correlation groups distinct tickets from different devices at the same location within the selected time window.",
          "Stage 2 correlation identifies cascading anomalies across different locations sharing matching timestamps.",
          "Iterative trial-and-error discovery: Dynamically expand the correlation window (30s, 45s, 60s, 75s, 90s, etc.) until the saturation threshold is reached where increasing the window no longer yields new correlated tickets.",
          "Missing device names, locations, and dependencies are never invented or assumed; they strictly remain marked as Unknown.",
        ]}
      />

      {/* Time Window Controls & Saturation Discovery */}
      <div className="rounded-xl border border-line bg-surface p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Quick Step Controls & Presets */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-heading">Correlation Window:</span>

            {/* Step buttons (-15s / +15s) */}
            <div className="inline-flex rounded-lg border border-line bg-chip/40 p-0.5 shadow-xs">
              <button
                type="button"
                onClick={() => stepWindow(-15)}
                disabled={appliedFilters.windowSeconds <= 15}
                className="rounded-md px-2.5 py-1 text-xs font-bold text-body hover:bg-surface hover:text-heading disabled:opacity-30 transition"
                title="Step down by 15 seconds"
              >
                − 15s
              </button>
              <span className="px-3 py-1 font-mono font-bold text-accent border-x border-line">
                {appliedFilters.windowSeconds}s
              </span>
              <button
                type="button"
                onClick={() => stepWindow(15)}
                disabled={appliedFilters.windowSeconds >= 600}
                className="rounded-md px-2.5 py-1 text-xs font-bold text-body hover:bg-surface hover:text-heading disabled:opacity-30 transition"
                title="Step up by 15 seconds"
              >
                + 15s
              </button>
            </div>

            {/* Preset buttons */}
            <div className="inline-flex flex-wrap rounded-lg border border-line bg-chip/40 p-1 shadow-xs gap-1">
              {PRESET_WINDOWS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => updateWindowSeconds(opt.value)}
                  className={`rounded-md px-2 py-0.5 text-xs font-semibold transition ${
                    appliedFilters.windowSeconds === opt.value
                      ? "bg-panel text-on-panel shadow-xs"
                      : "text-body hover:text-heading hover:bg-surface"
                  }`}
                  title={opt.desc}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Live Slider Input for Continuous Range */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted font-mono whitespace-nowrap">15s</span>
            <input
              type="range"
              min="15"
              max="180"
              step="5"
              value={appliedFilters.windowSeconds}
              onChange={(e) => updateWindowSeconds(Number(e.target.value))}
              className="w-32 sm:w-44 accent-accent cursor-pointer"
              title={`Slider: ${appliedFilters.windowSeconds} seconds`}
            />
            <span className="text-xs text-muted font-mono whitespace-nowrap">180s+</span>
          </div>
        </div>

          {/* Correlation Threshold Feedback Banner */}
          {thresholdFeedback && (
            <div
              className={`rounded-lg p-2.5 text-xs flex flex-wrap items-center justify-between gap-2 border transition-all ${
                thresholdFeedback.isSaturated
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400"
                  : thresholdFeedback.deltaTickets > 0
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
                  : "bg-chip border-line text-body"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="font-bold">Threshold Feedback:</span>
                {thresholdFeedback.isSaturated ? (
                  <span>
                    <strong>Saturation threshold reached!</strong> Expanding from {thresholdFeedback.prevWindow}s to {thresholdFeedback.newWindow}s yielded <strong>+0 new correlated tickets</strong>. Correlation is fully captured at {thresholdFeedback.prevWindow}s.
                  </span>
                ) : thresholdFeedback.deltaTickets > 0 ? (
                  <span>
                    Expanding from {thresholdFeedback.prevWindow}s to {thresholdFeedback.newWindow}s discovered <strong>+{thresholdFeedback.deltaTickets.toLocaleString("en-IN")} newly correlated tickets</strong>. Increase window further to test if more tickets correlate.
                  </span>
                ) : (
                  <span>
                    Window adjusted from {thresholdFeedback.prevWindow}s to {thresholdFeedback.newWindow}s ({thresholdFeedback.deltaTickets > 0 ? `+${thresholdFeedback.deltaTickets}` : thresholdFeedback.deltaTickets} delta).
                  </span>
                )}
              </div>

              <div className="font-mono text-[11px] font-semibold">
                Total correlated: {totalCorrelated.toLocaleString("en-IN")} tickets
              </div>
            </div>
          )}
        </div>

      {/* Summary Metrics Cards (Computed across complete filtered dataset with Distinct Tickets clearly featured) */}
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatTile
          value={loading && !result ? "—" : (summary.distinctTickets || summary.total).toLocaleString("en-IN")}
          label="Distinct ticket count"
          explanation="De-duplicated unique ticket IDs"
        />
        <StatTile
          value={loading && !result ? "—" : summary.total.toLocaleString("en-IN")}
          label="Total alerts"
          explanation="Alert event records matching filters"
        />
        <StatTile
          value={loading && !result ? "—" : summary.upstreamRoots.toLocaleString("en-IN")}
          label="Upstream root triggers"
          explanation="Primary failure causes (Tier 1/2)"
        />
        <StatTile
          value={loading && !result ? "—" : summary.stage1Correlated.toLocaleString("en-IN")}
          label="Stage 1: Same location"
          explanation={`Multi-device tickets in ${appliedFilters.windowSeconds}s`}
        />
        <StatTile
          value={loading && !result ? "—" : summary.stage2Cascading.toLocaleString("en-IN")}
          label="Stage 2: Cascading"
          explanation={`Cross-site alerts in ${appliedFilters.windowSeconds}s`}
        />
        <StatTile
          value={loading && !result ? "—" : summary.withDevice.toLocaleString("en-IN")}
          label="Identified hostnames"
          explanation="Explicit hostnames in source"
        />
      </section>

      {/* Second row of secondary summary metrics */}
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile
          value={loading && !result ? "—" : summary.withInterface.toLocaleString("en-IN")}
          label="Interface-level alerts"
          explanation="Identified interface names"
        />
        <StatTile
          value={loading && !result ? "—" : summary.withLocation.toLocaleString("en-IN")}
          label="Identified locations"
          explanation="Explicit site/location codes"
        />
        <StatTile
          value={loading && !result ? "—" : summary.repeats.toLocaleString("en-IN")}
          label="10m repeat alerts"
          explanation="Same device & problem in 10m"
        />
        <StatTile
          value={loading && !result ? "—" : summary.inIncidents.toLocaleString("en-IN")}
          label="Incidents member"
          explanation="Grouped in legacy incident table"
        />
      </section>

      {/* View Switcher: Correlated Clusters vs Individual Alerts vs Stage selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-muted">View Mode:</span>
          <div className="inline-flex rounded-lg border border-line bg-surface p-1 text-xs">
            <button
              type="button"
              onClick={() => {
                setFilters((p) => ({ ...p, viewMode: "alerts" }));
                setAppliedFilters((p) => ({ ...p, viewMode: "alerts" }));
              }}
              className={`rounded-md px-3 py-1 font-semibold transition ${
                appliedFilters.viewMode === "alerts"
                  ? "bg-panel text-on-panel shadow-xs"
                  : "text-body hover:text-heading"
              }`}
            >
              Alert Cards ({summary.total.toLocaleString("en-IN")})
            </button>
            <button
              type="button"
              onClick={() => {
                setFilters((p) => ({ ...p, viewMode: "clusters" }));
                setAppliedFilters((p) => ({ ...p, viewMode: "clusters" }));
              }}
              className={`rounded-md px-3 py-1 font-semibold transition ${
                appliedFilters.viewMode === "clusters"
                  ? "bg-panel text-on-panel shadow-xs"
                  : "text-body hover:text-heading"
              }`}
            >
              Correlated Incident Clusters
            </button>
          </div>
        </div>

        {/* Stage Filter Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="font-semibold text-muted mr-1">Stage:</span>
          {STAGE_OPTIONS.map((st) => (
            <button
              key={st.value}
              type="button"
              onClick={() => updateStage(st.value as Filters["stage"])}
              className={`rounded-full px-2.5 py-1 text-xs font-semibold border transition ${
                appliedFilters.stage === st.value
                  ? "bg-accent text-white border-accent"
                  : "bg-surface border-line text-body hover:bg-chip"
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filter Section Card */}
      <Card className="p-5 space-y-4">
        <form onSubmit={handleFilterSubmit} className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
            <h2 className="text-sm font-semibold text-heading">Filter alert records & correlation window</h2>
            <p className="text-xs text-muted">Timestamps follow Indian Standard Time (IST).</p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <DateField
              label="Created from"
              value={filters.from}
              onChange={(v) => setFilters((prev) => ({ ...prev, from: v }))}
            />

            <DateField
              label="Created through"
              value={filters.to}
              onChange={(v) => setFilters((prev) => ({ ...prev, to: v }))}
            />

            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-body text-xs">Location / Site</span>
              <input
                type="text"
                value={filters.site}
                onChange={(e) => setFilters((prev) => ({ ...prev, site: e.target.value }))}
                placeholder="e.g. KNDFD, NAGP1, NSKP2"
                className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-heading outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-body text-xs">Device Hostname</span>
              <input
                type="text"
                value={filters.device}
                onChange={(e) => setFilters((prev) => ({ ...prev, device: e.target.value }))}
                placeholder="e.g. EDG-SDW01, MDF-CSW01"
                className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-heading outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <SelectField
              label="Network Layer"
              options={LAYER_OPTIONS}
              value={filters.deviceType}
              onChange={(v) => setFilters((prev) => ({ ...prev, deviceType: v }))}
            />

            <SelectField
              label="Recommended Team"
              options={TEAM_OPTIONS}
              value={filters.team}
              onChange={(v) => setFilters((prev) => ({ ...prev, team: v }))}
            />

            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-body text-xs">Sliding Time Window (Seconds)</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="15"
                  max="600"
                  step="5"
                  value={filters.windowSeconds}
                  onChange={(e) => setFilters((prev) => ({ ...prev, windowSeconds: Number(e.target.value) }))}
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-heading outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                />
                <span className="text-xs text-muted font-mono shrink-0">sec</span>
              </div>
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-line">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                className="min-h-[40px] rounded-lg bg-panel px-5 py-2 text-sm font-semibold text-on-panel transition hover:bg-panel/90 focus:outline-none focus:ring-2 focus:ring-accent"
              >
                Apply filters
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="min-h-[40px] rounded-lg border border-line bg-surface px-4 py-2 text-sm font-semibold text-body hover:bg-chip transition focus:outline-none focus:ring-2 focus:ring-accent"
              >
                Reset
              </button>
            </div>

            <span className="text-xs text-muted">
              {summary.total.toLocaleString("en-IN")} total tickets matching criteria ({summary.distinctTickets.toLocaleString("en-IN")} distinct tickets)
            </span>
          </div>
        </form>
      </Card>

      {/* Active Filters Bar */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold text-muted">Active filters:</span>
          {appliedFilters.windowSeconds !== 45 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-1 text-accent border border-accent/20 font-bold">
              Window: {appliedFilters.windowSeconds}s
              <button
                type="button"
                onClick={() => updateWindowSeconds(45)}
                className="hover:opacity-80 font-bold"
                aria-label="Reset window to 45s"
              >
                ×
              </button>
            </span>
          )}
          {appliedFilters.stage !== "all" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-chip px-2.5 py-1 text-heading border border-line">
              Stage: {appliedFilters.stage}
              <button
                type="button"
                onClick={() => updateStage("all")}
                className="hover:text-accent font-bold"
                aria-label="Remove stage filter"
              >
                ×
              </button>
            </span>
          )}
          {appliedFilters.from && (
            <span className="inline-flex items-center gap-1 rounded-full bg-chip px-2.5 py-1 text-heading border border-line">
              From: {appliedFilters.from}
              <button
                type="button"
                onClick={() => removeFilter("from")}
                className="hover:text-accent font-bold"
                aria-label="Remove start date filter"
              >
                ×
              </button>
            </span>
          )}
          {appliedFilters.to && (
            <span className="inline-flex items-center gap-1 rounded-full bg-chip px-2.5 py-1 text-heading border border-line">
              To: {appliedFilters.to}
              <button
                type="button"
                onClick={() => removeFilter("to")}
                className="hover:text-accent font-bold"
                aria-label="Remove end date filter"
              >
                ×
              </button>
            </span>
          )}
          {appliedFilters.site && (
            <span className="inline-flex items-center gap-1 rounded-full bg-chip px-2.5 py-1 text-heading border border-line">
              Site: {appliedFilters.site}
              <button
                type="button"
                onClick={() => removeFilter("site")}
                className="hover:text-accent font-bold"
                aria-label="Remove site filter"
              >
                ×
              </button>
            </span>
          )}
          {appliedFilters.device && (
            <span className="inline-flex items-center gap-1 rounded-full bg-chip px-2.5 py-1 text-heading border border-line">
              Device: {appliedFilters.device}
              <button
                type="button"
                onClick={() => removeFilter("device")}
                className="hover:text-accent font-bold"
                aria-label="Remove device filter"
              >
                ×
              </button>
            </span>
          )}
          {appliedFilters.deviceType && (
            <span className="inline-flex items-center gap-1 rounded-full bg-chip px-2.5 py-1 text-heading border border-line">
              Layer: {deviceTypeLabel(appliedFilters.deviceType)}
              <button
                type="button"
                onClick={() => removeFilter("deviceType")}
                className="hover:text-accent font-bold"
                aria-label="Remove layer filter"
              >
                ×
              </button>
            </span>
          )}
          {appliedFilters.team && (
            <span className="inline-flex items-center gap-1 rounded-full bg-chip px-2.5 py-1 text-heading border border-line">
              Team: {appliedFilters.team}
              <button
                type="button"
                onClick={() => removeFilter("team")}
                className="hover:text-accent font-bold"
                aria-label="Remove team filter"
              >
                ×
              </button>
            </span>
          )}
          <button
            type="button"
            onClick={handleReset}
            className="font-bold text-accent hover:underline ml-1"
          >
            Clear all
          </button>
        </div>
      )}

      {/* CLUSTERS VIEW (Correlated Incident Groups) */}
      {appliedFilters.viewMode === "clusters" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <h3 className="font-bold text-heading text-base">
              Correlated Incident Clusters ({clustersList.length} clusters identified within {appliedFilters.windowSeconds}s window)
            </h3>
            <span className="text-xs text-muted">
              Clusters group downstream dependent devices under their upstream failure root cause
            </span>
          </div>

          {loadingClusters ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="p-5 space-y-3 animate-pulse">
                  <div className="h-4 w-32 rounded bg-chip" />
                  <div className="h-6 w-64 rounded bg-chip" />
                  <div className="h-10 w-full rounded bg-chip" />
                </Card>
              ))}
            </div>
          ) : clustersList.length > 0 ? (
            <div className="space-y-4">
              {clustersList.map((cluster) => {
                const isStage1 = cluster.stage === "stage1_same_location";
                return (
                  <Card
                    key={cluster.cluster_id}
                    className="p-5 space-y-4 hover:border-accent transition group"
                  >
                    {/* Cluster Header */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/60 pb-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-base font-bold text-heading group-hover:text-accent transition">
                          {cluster.cluster_id}
                        </span>
                        <span className="text-xs text-muted">·</span>
                        {isStage1 ? (
                          <span className="rounded bg-accent/10 text-accent border border-accent/20 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider">
                            Stage 1 · Same-Site Multi-Device Cluster
                          </span>
                        ) : (
                          <span className="rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider">
                            Stage 2 · Cross-Location Cascading Anomaly
                          </span>
                        )}

                        {cluster.location && (
                          <Chip className="bg-chip font-bold text-xs">Site {cluster.location}</Chip>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Chip className="bg-chip font-mono text-xs font-bold">
                          {cluster.total_alerts} alerts
                        </Chip>
                        <Chip className="bg-chip font-mono text-xs">
                          {cluster.distinct_devices} devices
                        </Chip>
                        {cluster.distinct_locations > 1 && (
                          <Chip className="bg-accent/10 text-accent font-mono text-xs font-bold">
                            {cluster.distinct_locations} sites
                          </Chip>
                        )}
                      </div>
                    </div>

                    {/* Root Cause & Upstream Failure Banner */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3.5 rounded-lg border border-accent/20 bg-accent/5">
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-accent block">
                          Upstream Failure Device
                        </span>
                        <span className="font-mono text-sm font-bold text-heading block truncate" title={cluster.upstream_device || "unknown"}>
                          {cluster.upstream_device || "Unknown upstream device"}
                        </span>
                        <span className="text-xs text-muted block">
                          {formatLayer(cluster.upstream_device_type, cluster.upstream_tier)}
                        </span>
                      </div>

                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-muted block">
                          Root Trigger Symptom & Ticket
                        </span>
                        <span className="text-xs font-bold text-heading block">
                          {formatTrigger(cluster.upstream_symptom)}
                        </span>
                        <span className="font-mono text-xs text-accent block">
                          Root Ticket: {cluster.root_ticket_id}
                        </span>
                      </div>

                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-muted block">
                          Time Window
                        </span>
                        <span className="font-mono text-xs text-heading block">
                          {formatTime(cluster.started_at)}
                        </span>
                        <span className="text-[11px] text-muted block">
                          Window duration: {appliedFilters.windowSeconds} seconds
                        </span>
                      </div>
                    </div>

                    {/* Affected Sites (Stage 2) */}
                    {cluster.distinct_locations > 1 && cluster.affected_locations.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-xs font-semibold text-muted">
                          Cascading across {cluster.affected_locations.length} physical sites:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {cluster.affected_locations.map((loc) => (
                            <Chip key={loc} className="bg-chip text-xs font-mono font-medium">
                              Site {loc}
                            </Chip>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Dependent Devices List */}
                    <div className="space-y-1.5">
                      <span className="text-xs font-semibold text-muted">
                        Dependent devices triggered ({cluster.affected_devices.length}):
                      </span>
                      <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1 border border-line/40 rounded-md bg-surface/50">
                        {cluster.affected_devices.map((dev) => (
                          <span
                            key={dev}
                            className={`inline-block font-mono text-[11px] px-2 py-0.5 rounded border ${
                              dev === cluster.upstream_device
                                ? "bg-accent/20 border-accent text-accent font-bold"
                                : "bg-chip border-line text-heading"
                            }`}
                          >
                            {dev === cluster.upstream_device ? `★ ${dev} (Upstream)` : dev}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Bottom Ticket List snippet */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-line/60 text-xs">
                      <span className="text-muted font-mono">
                        Tickets ({cluster.ticket_ids.length}): {cluster.ticket_ids.slice(0, 8).join(", ")}
                        {cluster.ticket_ids.length > 8 && ` +${cluster.ticket_ids.length - 8} more`}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setFilters((p) => ({ ...p, site: cluster.location || "", viewMode: "alerts" }));
                          setAppliedFilters((p) => ({ ...p, site: cluster.location || "", viewMode: "alerts" }));
                        }}
                        className="text-accent font-bold hover:underline"
                      >
                        Filter cards for this site →
                      </button>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <EmptyState
              title="No correlated clusters found"
              message={`No multi-device or multi-site incident clusters were found within the ${appliedFilters.windowSeconds}s window for the applied filters. Try stepping the time window higher (e.g. +15s or 90s) to discover broader cascading effects.`}
            />
          )}
        </div>
      )}

      {/* ALERT CARDS VIEW */}
      {appliedFilters.viewMode === "alerts" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <p className="font-medium text-heading">
              {summary.total > 0
                ? `Showing ${rangeStart}–${rangeEnd} of ${summary.total.toLocaleString("en-IN")} alert tickets (${summary.distinctTickets.toLocaleString("en-IN")} distinct tickets)`
                : loading
                ? "Loading alert records…"
                : "0 alert records found"}
            </p>

            <span className="text-xs text-muted">
              Page {page} of {totalPages} · {PAGE_SIZE} per page · Window {appliedFilters.windowSeconds}s
            </span>
          </div>

          {error && (
            <EmptyState
              title="Error loading alert records"
              message={error}
              action={
                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex min-h-[40px] items-center justify-center rounded-lg bg-panel px-4 py-2 text-sm font-semibold text-on-panel transition hover:bg-panel/90"
                >
                  Reset filters
                </button>
              }
            />
          )}

          {!error && (
            <div className="space-y-4">
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Card key={i} className="p-5 space-y-3 animate-pulse">
                      <div className="flex justify-between items-center">
                        <div className="h-4 w-32 rounded bg-chip" />
                        <div className="h-4 w-40 rounded bg-chip" />
                      </div>
                      <div className="h-5 w-48 rounded bg-chip" />
                      <div className="h-12 w-full rounded bg-chip" />
                    </Card>
                  ))}
                </div>
              ) : result?.items && result.items.length > 0 ? (
                <div className="space-y-3">
                  {result.items.map((item) => (
                    <Card
                      key={item.ticket_id}
                      className="p-5 hover:border-accent/60 transition group space-y-3"
                    >
                      {/* Top line: Ticket ID, timestamp, location, root cause tag, repeat tag, auto-closed */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line/60 pb-2.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-base font-bold text-heading group-hover:text-accent transition">
                            {item.ticket_id}
                          </span>
                          <span className="text-xs text-muted">·</span>
                          <span className="text-xs text-muted font-mono">
                            {formatTime(item.created_at)}
                          </span>
                          <span className="text-xs text-muted">·</span>

                          {item.location ? (
                            <Chip className="bg-chip font-bold text-xs">Site {item.location}</Chip>
                          ) : (
                            <Chip className="bg-chip/50 text-muted italic text-xs">Location: Unknown</Chip>
                          )}

                          {/* Upstream Root Cause Trigger Badge */}
                          {item.is_upstream_root ? (
                            <span className="rounded bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-xs">
                              Upstream Root Cause Trigger ({item.tier !== null ? `Tier ${item.tier}` : "Root"})
                            </span>
                          ) : item.correlation_stage === "stage1_same_location" ? (
                            <span className="rounded bg-sky-500/15 text-sky-400 border border-sky-500/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                              Dependent Device ({item.stage1_device_count} devices)
                            </span>
                          ) : item.correlation_stage === "stage2_cascading" ? (
                            <span className="rounded bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                              Cascading Anomaly ({item.stage2_site_count} sites)
                            </span>
                          ) : (
                            <span className="rounded bg-chip/60 text-muted border border-line px-2 py-0.5 text-[10px] font-semibold">
                              Single-Device Alert
                            </span>
                          )}

                          {item.is_repeat && (
                            <span className="rounded bg-chip px-2 py-0.5 text-[10px] font-semibold text-muted border border-line">
                              10m repeat ({item.repeat_count})
                            </span>
                          )}

                          {item.auto_closed && (
                            <span className="rounded bg-chip/40 px-1.5 py-0.5 text-[10px] text-muted border border-line/60">
                              Auto-closed
                            </span>
                          )}
                        </div>

                        {item.incident_id && (
                          <Link
                            href={`/incidents/${encodeURIComponent(item.incident_id)}`}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline ml-auto"
                          >
                            <span>Grouped in {item.incident_id}</span>
                            <span aria-hidden="true">→</span>
                          </Link>
                        )}
                      </div>

                      {/* Middle Section: Device Hostname and Interface Name clearly separated */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                        {/* Device Hostname block */}
                        <div className="flex items-center justify-between gap-2 rounded-lg border border-line bg-chip/30 px-3 py-2">
                          <span className="text-xs font-medium text-muted">Device Hostname:</span>
                          {item.device_hostname ? (
                            <span className="font-mono text-xs font-bold text-heading truncate" title={item.device_hostname}>
                              {item.device_hostname}
                            </span>
                          ) : (
                            <span className="font-mono text-xs text-muted italic">Unknown</span>
                          )}
                        </div>

                        {/* Interface Name block */}
                        <div className="flex items-center justify-between gap-2 rounded-lg border border-accent/20 bg-accent/5 px-3 py-2">
                          <span className="text-xs font-medium text-muted">Interface Name:</span>
                          {item.interface_name ? (
                            <span className="font-mono text-xs font-bold text-accent truncate" title={item.interface_name}>
                              {item.interface_name}
                            </span>
                          ) : (
                            <span className="text-xs text-muted">None</span>
                          )}
                        </div>

                        {/* Network Layer block */}
                        <div className="flex items-center justify-between gap-2 rounded-lg border border-line bg-chip/30 px-3 py-2">
                          <span className="text-xs font-medium text-muted">Network Layer:</span>
                          <span className="text-xs font-semibold text-heading truncate" title={formatLayer(item.device_type, item.tier)}>
                            {formatLayer(item.device_type, item.tier)}
                          </span>
                        </div>

                        {/* Likely Trigger block */}
                        <div className="flex items-center justify-between gap-2 rounded-lg border border-line bg-chip/30 px-3 py-2">
                          <span className="text-xs font-medium text-muted">Likely Trigger:</span>
                          <span className="text-xs font-semibold text-heading truncate" title={formatTrigger(item.symptom)}>
                            {formatTrigger(item.symptom)}
                          </span>
                        </div>

                        {/* Recommended Team block */}
                        <div className="flex items-center justify-between gap-2 rounded-lg border border-line bg-chip/30 px-3 py-2">
                          <span className="text-xs font-medium text-muted">Recommended Team:</span>
                          <span className="text-xs font-bold text-accent truncate" title={item.recommended_team}>
                            {item.recommended_team}
                          </span>
                        </div>

                        {/* Source Department block */}
                        <div className="flex items-center justify-between gap-2 rounded-lg border border-line bg-chip/30 px-3 py-2">
                          <span className="text-xs font-medium text-muted">Source Department:</span>
                          <span className="text-xs text-muted truncate" title={item.source_department || "Unknown"}>
                            {item.source_department || "Unknown"}
                          </span>
                        </div>
                      </div>

                      {/* Upstream Correlation Analysis Callout */}
                      {item.correlated_upstream_device && !item.is_upstream_root && (
                        <div className="flex items-center gap-2 rounded-md border border-sky-500/20 bg-sky-500/5 px-3 py-1.5 text-xs">
                          <span className="text-sky-400 font-bold">DEPENDENT DEVICE · Triggered by:</span>
                          <span className="font-mono text-heading font-semibold">
                            {item.correlated_upstream_device}
                          </span>
                          <span className="text-muted text-[11px] ml-auto">
                            Upstream trigger identified in {item.window_seconds}s trial window
                          </span>
                        </div>
                      )}

                      {/* Subject container */}
                      <div className="rounded-lg border border-line/60 bg-chip/20 p-3">
                        <p className="text-xs text-body leading-relaxed">
                          {item.subject || "No subject text recorded"}
                        </p>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="No matching alert records"
                  message="No alert records matched your filter criteria. Try adjusting or clearing filters."
                  action={
                    <button
                      type="button"
                      onClick={handleReset}
                      className="inline-flex min-h-[40px] items-center justify-center rounded-lg bg-panel px-4 py-2 text-sm font-semibold text-on-panel transition hover:bg-panel/90"
                    >
                      Clear all filters
                    </button>
                  }
                />
              )}

              {/* Pagination Controls */}
              {result?.items && result.items.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                  <span className="text-xs text-muted">
                    Showing {rangeStart} to {rangeEnd} of {summary.total.toLocaleString("en-IN")} alert tickets ({summary.distinctTickets.toLocaleString("en-IN")} distinct)
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={page <= 1 || loading}
                      onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                      className="min-h-[40px] rounded-lg border border-line bg-surface px-4 py-2 text-sm font-semibold text-body hover:bg-chip disabled:opacity-40 transition"
                    >
                      Previous
                    </button>
                    <span className="px-2 text-xs font-medium text-muted">
                      Page {page} of {totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={page >= totalPages || loading}
                      onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                      className="min-h-[40px] rounded-lg border border-line bg-surface px-4 py-2 text-sm font-semibold text-body hover:bg-chip disabled:opacity-40 transition"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tabular Disclosure for dense inspection */}
      {result?.items && result.items.length > 0 && (
        <Disclosure
          title="Complete alert table view"
          openLabel="Show complete table"
          closeLabel="Hide complete table"
          badge={<Chip>{result.items.length} records on page</Chip>}
        >
          <div className="overflow-x-auto p-2">
            <table className="w-full min-w-[1450px] text-left text-xs">
              <thead className="bg-chip text-[11px] uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-3 py-2.5">Ticket ID</th>
                  <th className="px-3 py-2.5">Timestamp (IST)</th>
                  <th className="px-3 py-2.5">Location</th>
                  <th className="px-3 py-2.5">Device hostname</th>
                  <th className="px-3 py-2.5">Interface</th>
                  <th className="px-3 py-2.5">Layer</th>
                  <th className="px-3 py-2.5">Correlation Stage</th>
                  <th className="px-3 py-2.5">Upstream Failure</th>
                  <th className="px-3 py-2.5">Recommended team</th>
                  <th className="px-3 py-2.5">Source dept</th>
                  <th className="px-3 py-2.5">Repeats</th>
                  <th className="px-3 py-2.5">Subject</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {result.items.map((item) => (
                  <tr key={item.ticket_id} className="hover:bg-chip/30">
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono font-bold text-accent">
                      {item.ticket_id}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono text-body">
                      {formatTime(item.created_at)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-medium text-heading">
                      {item.location || <span className="text-muted italic">Unknown</span>}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono text-heading">
                      {item.device_hostname || <span className="text-muted italic">Unknown</span>}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono text-accent">
                      {item.interface_name || <span className="text-muted">—</span>}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-body">
                      {formatLayer(item.device_type, item.tier)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      {item.correlation_stage === "stage1_same_location" ? (
                        <span className="font-semibold text-sky-400">Stage 1 (Same Site)</span>
                      ) : item.correlation_stage === "stage2_cascading" ? (
                        <span className="font-semibold text-indigo-400">Stage 2 (Cascade)</span>
                      ) : (
                        <span className="text-muted">Single Device</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono">
                      {item.is_upstream_root ? (
                        <span className="text-accent font-bold">★ ROOT CAUSE</span>
                      ) : item.correlated_upstream_device ? (
                        <span className="text-body font-mono text-sky-400">{item.correlated_upstream_device}</span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-semibold text-accent">
                      {item.recommended_team}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-muted">
                      {item.source_department || "Unknown"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-muted">
                      {item.is_repeat ? `Yes (${item.repeat_count})` : "No"}
                    </td>
                    <td className="max-w-md truncate px-3 py-2.5 text-body" title={item.subject || ""}>
                      {item.subject || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Disclosure>
      )}
    </main>
  );
}
