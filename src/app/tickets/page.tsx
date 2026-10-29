"use client";

import { useEffect, useState } from "react";
import { matchMethodLabel } from "@/lib/labels";

type Filters = {
  source: string;
  team: string;
  subject: string;
  from: string;
  to: string;
  hideLinkedCopies: boolean;
};

type TicketRecord = {
  source: string;
  ticket_id: string;
  created_on: string | null;
  subject: string | null;
  team: string | null;
  status: string | null;
  linked_ticket_id: string | null;
  match_method: string | null;
  is_cross_tool_copy: boolean;
  is_duplicate: boolean;
  linked_ticket_count: number;
  source_sheet: string | null;
  priority: string | null;
};

type TicketsResponse = {
  data: TicketRecord[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

const emptyFilters: Filters = {
  source: "",
  team: "",
  subject: "",
  from: "",
  to: "",
  hideLinkedCopies: false,
};

function formatDate(value: string | null) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(date);
}

export default function TicketsPage() {
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [appliedFilters, setAppliedFilters] =
    useState<Filters>(emptyFilters);
  const [page, setPage] = useState(1);

  const [data, setData] = useState<TicketRecord[]>([]);
  const [pagination, setPagination] =
    useState<TicketsResponse["pagination"] | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function fetchTickets() {
      setLoading(true);
      setError("");

      const params = new URLSearchParams({ page: String(page) });

      if (appliedFilters.source) {
        params.set("source", appliedFilters.source);
      }
      if (appliedFilters.team.trim()) {
        params.set("team", appliedFilters.team.trim());
      }
      if (appliedFilters.subject.trim()) {
        params.set("subject", appliedFilters.subject.trim());
      }
      if (appliedFilters.from) {
        params.set("from", appliedFilters.from);
      }
      if (appliedFilters.to) {
        params.set("to", appliedFilters.to);
      }
      if (appliedFilters.hideLinkedCopies) {
        params.set("hideLinkedCopies", "true");
      }

      try {
        const response = await fetch(`/api/tickets?${params.toString()}`);
        const result = (await response.json()) as
          | TicketsResponse
          | { error?: string };

        if (!response.ok) {
          throw new Error(
            "error" in result && result.error
              ? result.error
              : "Unable to load tickets.",
          );
        }

        if (!cancelled) {
          setData((result as TicketsResponse).data);
          setPagination((result as TicketsResponse).pagination);
        }
      } catch (err) {
        if (!cancelled) {
          setData([]);
          setPagination(null);
          setError(
            err instanceof Error ? err.message : "Unable to load tickets.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void fetchTickets();

    return () => {
      cancelled = true;
    };
  }, [page, appliedFilters]);

  function updateFilter<K extends keyof Filters>(
    key: K,
    value: Filters[K],
  ) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function applyFilters(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setAppliedFilters({ ...filters });
  }

  function clearFilters() {
    setFilters({ ...emptyFilters });
    setPage(1);
    setAppliedFilters({ ...emptyFilters });
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5">
          <div>
            <a href="/" className="text-sm font-semibold text-indigo-700">
              Incident Lens
            </a>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">
              Source Tickets
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Browse MSOLVE incidents, service requests and Alfa tickets.
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-7">
        <form
          onSubmit={applyFilters}
          className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Filters</h2>
            <p className="text-xs text-slate-500">
              Dates use the confirmed IST timezone.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-slate-700">
                Source
              </span>
              <select
                value={filters.source}
                onChange={(e) => updateFilter("source", e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-indigo-500"
              >
                <option value="">All sources</option>
                <option value="Alfa">Alfa</option>
                <option value="MSOLVE Incident">MSOLVE Incident</option>
                <option value="MSOLVE Service Request">
                  MSOLVE Service Request
                </option>
              </select>
            </label>

            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-slate-700">
                Team / Department
              </span>
              <input
                value={filters.team}
                onChange={(e) => updateFilter("team", e.target.value)}
                placeholder="e.g. RID-BOT"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-500"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-slate-700">
                Subject contains
              </span>
              <input
                value={filters.subject}
                onChange={(e) => updateFilter("subject", e.target.value)}
                placeholder="Search ticket subject"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-500"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-slate-700">
                Created from
              </span>
              <input
                type="date"
                value={filters.from}
                onChange={(e) => updateFilter("from", e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-500"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-slate-700">
                Created through
              </span>
              <input
                type="date"
                value={filters.to}
                onChange={(e) => updateFilter("to", e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-500"
              />
            </label>

            <label className="flex items-center gap-2 self-end pb-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={filters.hideLinkedCopies}
                onChange={(e) =>
                  updateFilter("hideLinkedCopies", e.target.checked)
                }
                className="size-4 accent-indigo-600"
              />
              Hide linked Alfa copies
            </label>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="submit"
              className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Apply filters
            </button>
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Clear filters
            </button>
          </div>
        </form>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="font-semibold">Ticket records</h2>
              <p className="mt-1 text-sm text-slate-500">
                {pagination
                  ? `${pagination.total.toLocaleString("en-IN")} matching records`
                  : "Waiting for results"}
              </p>
            </div>

            <span className="text-xs text-slate-500">
              {pagination
                ? `Page ${pagination.page} of ${Math.max(1, pagination.totalPages)} · ${pagination.pageSize} per page`
                : "50 records per page"}
            </span>
          </div>

          {error && (
            <div
              role="alert"
              className="m-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Ticket</th>
                  <th className="px-5 py-3 font-semibold">Source</th>
                  <th className="px-5 py-3 font-semibold">Created (IST)</th>
                  <th className="px-5 py-3 font-semibold">Subject</th>
                  <th className="px-5 py-3 font-semibold">Team</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Linked ticket</th>
                  <th className="px-5 py-3 font-semibold">Match method</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading && (
                  <tr>
                    <td colSpan={8} className="px-5 py-12 text-center text-slate-500">
                      Loading tickets…
                    </td>
                  </tr>
                )}

                {!loading && !error && data.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-5 py-12 text-center text-slate-500">
                      No tickets match these filters.
                    </td>
                  </tr>
                )}

                {!loading &&
                  data.map((ticket, index) => (
                    <tr
                      key={`${ticket.source}-${ticket.ticket_id}-${ticket.source_sheet ?? ""}-${index}`}
                      className="align-top hover:bg-slate-50"
                    >
                      <td className="whitespace-nowrap px-5 py-4">
                        <a
                          href={`/tickets/${encodeURIComponent(ticket.ticket_id)}?source=${encodeURIComponent(ticket.source)}`}
                          className="font-semibold text-indigo-700 hover:underline"
                        >
                          {ticket.ticket_id}
                        </a>
                        {ticket.is_cross_tool_copy && (
                          <span className="mt-1 block text-xs text-slate-500">
                            Linked copy
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                        {ticket.source}
                        {ticket.source_sheet && (
                          <span className="mt-1 block text-xs text-slate-400">
                            {ticket.source_sheet.replace(" Tickets_Oct 26", "")}
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                        {formatDate(ticket.created_on)}
                      </td>
                      <td className="max-w-md px-5 py-4">
                        <p className="line-clamp-3 text-slate-800">
                          {ticket.subject || "—"}
                        </p>
                        {ticket.priority && (
                          <span className="mt-1 block text-xs text-slate-500">
                            Priority: {ticket.priority}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {ticket.team || "—"}
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                          {ticket.status || "Unknown"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {ticket.linked_ticket_id || "—"}
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-500">
                        {matchMethodLabel(ticket.match_method)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-4">
            <p className="text-sm text-slate-500">
              {pagination && pagination.total > 0
                ? `Showing ${(pagination.page - 1) * pagination.pageSize + 1}–${Math.min(pagination.page * pagination.pageSize, pagination.total)} of ${pagination.total.toLocaleString("en-IN")}`
                : "No records to display"}
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={
                  loading ||
                  !pagination ||
                  page >= Math.max(1, pagination.totalPages)
                }
                onClick={() => setPage((current) => current + 1)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </section>

        <p className="mt-4 text-xs leading-5 text-slate-500">
          Source data is read-only. A subject-and-time mapping is a low-confidence
          candidate, not a confirmed duplicate. Service requests without a source
          creation timestamp display no creation date.
        </p>
      </div>
    </main>
  );
}