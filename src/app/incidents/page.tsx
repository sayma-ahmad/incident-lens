import Link from "next/link";

import { IncidentCard } from "@/components/incidents/incident-card";
import { listIncidents, listTeams } from "@/server/db/incidents-queries";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 60;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined) {
  const v = Array.isArray(value) ? value[0] : value;
  return v?.trim() || undefined;
}

export default async function IncidentsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const date = first(params.date);
  const site = first(params.site);
  const team = first(params.team);
  const confidenceParam = first(params.confidence);
  const confidence = confidenceParam && ["high", "medium", "low"].includes(confidenceParam) ? confidenceParam : undefined;
  const sort = first(params.sort) === "size" ? "size" : "confidence";
  const page = Math.max(Number(first(params.page)) || 1, 1);
  const validDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined;

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
    if (validDate) q.set("date", validDate);
    if (site) q.set("site", site);
    if (team) q.set("team", team);
    if (confidence) q.set("confidence", confidence);
    if (sort !== "confidence") q.set("sort", sort);
    q.set("page", String(n));
    return `/incidents?${q.toString()}`;
  };

  return (
    <main className="mx-auto max-w-7xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Correlation Workspace</h1>
        <p className="mt-1 text-lg text-gray-700">
          <span className="font-semibold">{result.alerts.toLocaleString("en-IN")}</span> alerts →{" "}
          <span className="font-semibold">{result.total.toLocaleString("en-IN")}</span> incidents
          <span className="text-gray-500">{validDate ? ` on ${validDate}` : " (all dates)"}</span>
        </p>
        <p className="text-sm text-gray-500">Shadow mode: groupings are probable, not confirmed. Nothing is written back to ServiceNow.</p>
      </div>

      <form method="get" className="mb-6 flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
        <label className="flex flex-col text-sm text-gray-700">
          Date
          <input type="date" name="date" defaultValue={validDate} className="mt-1 rounded border border-gray-300 bg-white px-2 py-1" />
        </label>
        <label className="flex flex-col text-sm text-gray-700">
          Site
          <input type="search" name="site" defaultValue={site} placeholder="e.g. NAGP1" className="mt-1 rounded border border-gray-300 bg-white px-2 py-1" />
        </label>
        <label className="flex flex-col text-sm text-gray-700">
          Confidence
          <select name="confidence" defaultValue={confidence ?? ""} className="mt-1 rounded border border-gray-300 bg-white px-2 py-1">
            <option value="">All</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </label>
        <label className="flex flex-col text-sm text-gray-700">
          Primary team
          <select name="team" defaultValue={team ?? ""} className="mt-1 rounded border border-gray-300 bg-white px-2 py-1">
            <option value="">All</option>
            {teams.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col text-sm text-gray-700">
          Sort
          <select name="sort" defaultValue={sort} className="mt-1 rounded border border-gray-300 bg-white px-2 py-1">
            <option value="confidence">Confidence, then size</option>
            <option value="size">Size</option>
          </select>
        </label>
        <button type="submit" className="rounded bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700">
          Apply
        </button>
        <Link href="/incidents" className="px-2 py-1.5 text-sm text-gray-600 hover:underline">
          Reset
        </Link>
      </form>

      {result.items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-500">No incidents match these filters.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {result.items.map((item) => (
            <IncidentCard key={item.id} item={item} />
          ))}
        </div>
      )}

      {pages > 1 && (
        <nav className="mt-6 flex items-center justify-center gap-4 text-sm">
          {page > 1 ? (
            <Link href={pageHref(page - 1)} className="text-blue-600 hover:underline">
              ← Previous
            </Link>
          ) : (
            <span className="text-gray-400">← Previous</span>
          )}
          <span className="text-gray-600">
            Page {page} of {pages}
          </span>
          {page < pages ? (
            <Link href={pageHref(page + 1)} className="text-blue-600 hover:underline">
              Next →
            </Link>
          ) : (
            <span className="text-gray-400">Next →</span>
          )}
        </nav>
      )}
    </main>
  );
}
