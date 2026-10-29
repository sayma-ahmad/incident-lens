import Link from "next/link";
import { IncidentCard } from "@/components/incidents/incident-card";
import { PageHeader, Card, Chip, ProbableNotice } from "@/components/ui";
import { listIncidents, listTeams } from "@/server/db/incidents-queries";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 60;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined) {
  const v = Array.isArray(value) ? value[0] : value;
  return v?.trim() || undefined;
}

export default async function IncidentsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const rawDate = first(params.date);

  // Default to 11 October 2026 for the demo unless explicitly "all" or another date
  const isAllDates = rawDate === "all";
  const selectedDate = isAllDates ? undefined : rawDate || "2026-10-11";
  const validDate =
    selectedDate && /^\d{4}-\d{2}-\d{2}$/.test(selectedDate)
      ? selectedDate
      : undefined;

  const site = first(params.site);
  const team = first(params.team);
  const confidenceParam = first(params.confidence);
  const confidence =
    confidenceParam && ["high", "medium", "low"].includes(confidenceParam)
      ? confidenceParam
      : undefined;
  const sort = first(params.sort) === "size" ? "size" : "confidence";
  const page = Math.max(Number(first(params.page)) || 1, 1);

  const [result, teams] = await Promise.all([
    listIncidents({
      date: validDate,
      site,
      team,
      confidence,
      sort,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
    listTeams(),
  ]);

  const pages = Math.max(Math.ceil(result.total / PAGE_SIZE), 1);

  const pageHref = (n: number) => {
    const q = new URLSearchParams();
    if (isAllDates) q.set("date", "all");
    else if (validDate) q.set("date", validDate);
    if (site) q.set("site", site);
    if (team) q.set("team", team);
    if (confidence) q.set("confidence", confidence);
    if (sort !== "confidence") q.set("sort", sort);
    q.set("page", String(n));
    return `/incidents?${q.toString()}`;
  };

  const hasActiveFilters =
    Boolean(site) ||
    Boolean(team) ||
    Boolean(confidence) ||
    sort !== "confidence" ||
    isAllDates ||
    (validDate && validDate !== "2026-10-11");

  return (
    <main className="mx-auto max-w-7xl p-6 space-y-8">
      {/* PageHeader with compact visual explanation */}
      <PageHeader
        sectionLabel="STEP 4 · GROUP"
        title="Related alerts, grouped into probable incidents"
        description="When many alerts come from the same site within minutes of each other, they are usually one problem. We group them, pick the alert most likely to be the cause, and recommend one team."
        howToRead={[
          "Alerts from the same site less than 15 minutes apart are grouped together into one probable incident.",
          "The probable cause (root alert) is selected using device layer (upstream first), symptom severity, and time.",
          "High, Medium, and Low confidence follow established correlation rules.",
          "Shadow mode: suggestions are read-only and nothing is written back to ServiceNow.",
        ]}
      />

      {/* Compact visual explanation diagram: Grey dots -> Red incident card -> Recommended team chip */}
      <Card className="p-5 bg-chip/30">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="font-bold text-muted uppercase tracking-wider">
              How grouping works:
            </span>

            {/* 3 Grey alert dots */}
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-surface border border-line">
              <span className="size-2 rounded-full bg-muted" />
              <span className="size-2 rounded-full bg-muted" />
              <span className="size-2 rounded-full bg-muted" />
              <span className="text-body font-medium ml-1">Incoming alerts</span>
            </div>

            <span className="text-muted" aria-hidden="true">
              →
            </span>

            {/* 1 Red incident card */}
            <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-surface border border-accent text-accent font-bold">
              <span className="size-2.5 rounded-full bg-accent" />
              <span>1 Probable Incident</span>
            </div>

            <span className="text-muted" aria-hidden="true">
              →
            </span>

            {/* Recommended team chip */}
            <div className="flex items-center gap-1.5">
              <Chip className="font-semibold text-accent border-accent/20 bg-accent/5">
                Recommended Team
              </Chip>
            </div>
          </div>

          <ProbableNotice />
        </div>
      </Card>

      {/* Summary before-and-after banner for selected date */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line bg-surface p-6 shadow-xs">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-muted">
            Alert Compression for {validDate ?? "All dates"}
          </div>
          <div className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-heading">
            <span className="text-muted">{result.alerts.toLocaleString("en-IN")} alerts</span>
            <span className="text-accent mx-2">→</span>
            <span className="text-accent">{result.total.toLocaleString("en-IN")} incidents</span>
          </div>
          <p className="mt-1 text-xs text-muted">
            {validDate === "2026-10-11"
              ? "Peak demo day: 11 October 2026 (2,336 alerts condensed into 471 incidents)"
              : validDate
              ? `Filtered to ${validDate}`
              : "Showing all historical October alert groupings"}
          </p>
        </div>

        {/* Date quick switcher */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/incidents?date=2026-10-11"
            className={`min-h-[38px] inline-flex items-center rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
              validDate === "2026-10-11"
                ? "bg-accent text-white shadow-xs"
                : "border border-line bg-surface text-body hover:bg-chip"
            }`}
          >
            11 Oct 2026 (Demo)
          </Link>
          <Link
            href="/incidents?date=all"
            className={`min-h-[38px] inline-flex items-center rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
              isAllDates
                ? "bg-accent text-white shadow-xs"
                : "border border-line bg-surface text-body hover:bg-chip"
            }`}
          >
            All dates
          </Link>
        </div>
      </div>

      {/* Filters form */}
      <form
        method="get"
        className="rounded-xl border border-line bg-surface p-5 shadow-xs space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
          <h2 className="text-sm font-semibold text-heading">Filter incidents</h2>
          <p className="text-xs text-muted">Sliding 15-minute time window in IST.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {/* Date Picker (Most prominent) */}
          <label className="block text-sm">
            <span className="mb-1.5 block font-bold text-heading">Date (IST)</span>
            <input
              type="date"
              name="date"
              defaultValue={validDate || ""}
              className="w-full rounded-lg border-2 border-accent/40 bg-surface px-3 py-2 text-heading outline-none focus:border-accent focus:ring-1 focus:ring-accent font-medium"
            />
          </label>

          {/* Site filter */}
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-body">Site</span>
            <input
              type="search"
              name="site"
              defaultValue={site || ""}
              placeholder="e.g. NAGP1"
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-heading outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            />
          </label>

          {/* Confidence filter */}
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-body">Confidence</span>
            <select
              name="confidence"
              defaultValue={confidence ?? ""}
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-heading outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            >
              <option value="">All confidence</option>
              <option value="high">High confidence</option>
              <option value="medium">Medium confidence</option>
              <option value="low">Low confidence</option>
            </select>
          </label>

          {/* Primary team */}
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-body">Primary team</span>
            <select
              name="team"
              defaultValue={team ?? ""}
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-heading outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            >
              <option value="">All teams</option>
              {teams.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>

          {/* Sort */}
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-body">Sort</span>
            <select
              name="sort"
              defaultValue={sort}
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-heading outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            >
              <option value="confidence">Confidence, then size</option>
              <option value="size">Size (alert count)</option>
            </select>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="submit"
            className="min-h-[38px] rounded-lg bg-panel px-5 py-2 text-sm font-semibold text-on-panel transition hover:bg-panel/90 focus:outline-none focus:ring-2 focus:ring-accent"
          >
            Apply filters
          </button>
          <Link
            href="/incidents?date=2026-10-11"
            className="min-h-[38px] inline-flex items-center rounded-lg border border-line bg-surface px-4 py-2 text-sm font-semibold text-body hover:bg-chip transition"
          >
            Reset to demo date
          </Link>
        </div>
      </form>

      {/* Active filter chips */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold text-muted">Active filters:</span>
          {isAllDates && (
            <span className="inline-flex items-center gap-1 rounded-full bg-chip px-2.5 py-1 text-heading">
              Date: All dates
            </span>
          )}
          {validDate && validDate !== "2026-10-11" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-chip px-2.5 py-1 text-heading">
              Date: {validDate}
            </span>
          )}
          {site && (
            <span className="inline-flex items-center gap-1 rounded-full bg-chip px-2.5 py-1 text-heading">
              Site: {site}
            </span>
          )}
          {confidence && (
            <span className="inline-flex items-center gap-1 rounded-full bg-chip px-2.5 py-1 text-heading capitalize">
              Confidence: {confidence}
            </span>
          )}
          {team && (
            <span className="inline-flex items-center gap-1 rounded-full bg-chip px-2.5 py-1 text-heading">
              Team: {team}
            </span>
          )}
          {sort === "size" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-chip px-2.5 py-1 text-heading">
              Sort: Size
            </span>
          )}
          <Link
            href="/incidents?date=2026-10-11"
            className="font-bold text-accent hover:underline ml-1"
          >
            Clear all
          </Link>
        </div>
      )}

      {/* Incidents grid */}
      {result.items.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-lg font-bold text-heading">No incidents match these filters</p>
          <p className="mt-1 text-sm text-muted">
            Try adjusting your date range, site search, or team filters.
          </p>
          <div className="mt-4">
            <Link
              href="/incidents?date=2026-10-11"
              className="inline-flex min-h-[38px] items-center rounded-lg bg-panel px-4 py-2 text-xs font-semibold text-on-panel hover:bg-panel/90 transition"
            >
              Reset to 11 October 2026
            </Link>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {result.items.map((item) => (
            <IncidentCard key={item.id} item={item} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <nav className="flex items-center justify-center gap-4 text-sm font-medium pt-4">
          {page > 1 ? (
            <Link href={pageHref(page - 1)} className="text-accent font-semibold hover:underline">
              ← Previous
            </Link>
          ) : (
            <span className="text-muted cursor-not-allowed">← Previous</span>
          )}
          <span className="text-body font-medium">
            Page {page} of {pages}
          </span>
          {page < pages ? (
            <Link href={pageHref(page + 1)} className="text-accent font-semibold hover:underline">
              Next →
            </Link>
          ) : (
            <span className="text-muted cursor-not-allowed">Next →</span>
          )}
        </nav>
      )}
    </main>
  );
}
