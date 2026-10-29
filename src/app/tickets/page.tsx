"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  PageHeader,
  Card,
  Chip,
  Disclosure,
  EmptyState,
} from "@/components/ui";
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
  const [appliedFilters, setAppliedFilters] = useState<Filters>(emptyFilters);
  const [page, setPage] = useState(1);

  const [data, setData] = useState<TicketRecord[]>([]);
  const [pagination, setPagination] = useState<TicketsResponse["pagination"] | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedSubjectId, setExpandedSubjectId] = useState<string | null>(null);

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
        const result = (await response.json()) as TicketsResponse | { error?: string };

        if (!response.ok) {
          throw new Error(
            "error" in result && result.error ? result.error : "Unable to load tickets.",
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
          setError(err instanceof Error ? err.message : "Unable to load tickets.");
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

  function updateFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
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

  function removeFilter(key: keyof Filters) {
    const updated = {
      ...appliedFilters,
      [key]: key === "hideLinkedCopies" ? false : "",
    };
    setFilters(updated);
    setAppliedFilters(updated);
    setPage(1);
  }

  const hasActiveFilters =
    Boolean(appliedFilters.source) ||
    Boolean(appliedFilters.team) ||
    Boolean(appliedFilters.subject) ||
    Boolean(appliedFilters.from) ||
    Boolean(appliedFilters.to) ||
    appliedFilters.hideLinkedCopies;

  return (
    <main className="mx-auto max-w-7xl p-6 space-y-6">
      <PageHeader
        sectionLabel="STEP 1 · READ"
        title="Every ticket, from both tools"
        description="All 59,927 MSOLVE incidents, MSOLVE service requests and AlfaNow tickets in one place. Tickets that exist in both tools are linked."
        howToRead={[
          "Each card represents one ticket.",
          "The source tag identifies the tool.",
          "“Linked” means the same issue exists in the other tool.",
          "“Exact link” comes from the correlation ID.",
          "“Candidate link” is a possible match based on subject and time that needs review.",
        ]}
      />

      {/* Filter panel */}
      <form
        onSubmit={applyFilters}
        className="rounded-xl border border-line bg-surface p-5 shadow-xs space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
          <h2 className="text-sm font-semibold text-heading">Filter tickets</h2>
          <p className="text-xs text-muted">Timestamps follow Indian Standard Time (IST).</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-body">Source</span>
            <select
              value={filters.source}
              onChange={(e) => updateFilter("source", e.target.value)}
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-heading outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            >
              <option value="">All sources</option>
              <option value="Alfa">AlfaNow</option>
              <option value="MSOLVE Incident">MSOLVE Incident</option>
              <option value="MSOLVE Service Request">MSOLVE Service Request</option>
            </select>
          </label>

          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-body">Team / Department</span>
            <input
              value={filters.team}
              onChange={(e) => updateFilter("team", e.target.value)}
              placeholder="e.g. RID-BOT"
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-heading outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-body">Subject contains</span>
            <input
              value={filters.subject}
              onChange={(e) => updateFilter("subject", e.target.value)}
              placeholder="Search ticket subject"
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-heading outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-body">Created from</span>
            <input
              type="date"
              value={filters.from}
              onChange={(e) => updateFilter("from", e.target.value)}
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-heading outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-body">Created through</span>
            <input
              type="date"
              value={filters.to}
              onChange={(e) => updateFilter("to", e.target.value)}
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-heading outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            />
          </label>

          <label className="flex items-center gap-2 self-end pb-2 text-sm text-body cursor-pointer">
            <input
              type="checkbox"
              checked={filters.hideLinkedCopies}
              onChange={(e) => updateFilter("hideLinkedCopies", e.target.checked)}
              className="size-4 rounded border-line accent-accent"
            />
            <span>Hide linked Alfa copies</span>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="submit"
            className="min-h-[40px] rounded-lg bg-panel px-5 py-2 text-sm font-semibold text-on-panel transition hover:bg-panel/90 focus:outline-none focus:ring-2 focus:ring-accent"
          >
            Apply filters
          </button>
          <button
            type="button"
            onClick={clearFilters}
            className="min-h-[40px] rounded-lg border border-line bg-surface px-4 py-2 text-sm font-semibold text-body hover:bg-chip transition"
          >
            Reset
          </button>
        </div>
      </form>

      {/* Active filter chips & results header */}
      <div className="space-y-3">
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-muted">Active filters:</span>
            {appliedFilters.source && (
              <span className="inline-flex items-center gap-1 rounded-full bg-chip px-2.5 py-1 text-heading">
                Source: {appliedFilters.source}
                <button
                  type="button"
                  onClick={() => removeFilter("source")}
                  className="hover:text-accent font-bold"
                  aria-label="Remove source filter"
                >
                  ×
                </button>
              </span>
            )}
            {appliedFilters.team && (
              <span className="inline-flex items-center gap-1 rounded-full bg-chip px-2.5 py-1 text-heading">
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
            {appliedFilters.subject && (
              <span className="inline-flex items-center gap-1 rounded-full bg-chip px-2.5 py-1 text-heading">
                Subject: &ldquo;{appliedFilters.subject}&rdquo;
                <button
                  type="button"
                  onClick={() => removeFilter("subject")}
                  className="hover:text-accent font-bold"
                  aria-label="Remove subject filter"
                >
                  ×
                </button>
              </span>
            )}
            {appliedFilters.from && (
              <span className="inline-flex items-center gap-1 rounded-full bg-chip px-2.5 py-1 text-heading">
                From: {appliedFilters.from}
                <button
                  type="button"
                  onClick={() => removeFilter("from")}
                  className="hover:text-accent font-bold"
                  aria-label="Remove from date filter"
                >
                  ×
                </button>
              </span>
            )}
            {appliedFilters.to && (
              <span className="inline-flex items-center gap-1 rounded-full bg-chip px-2.5 py-1 text-heading">
                To: {appliedFilters.to}
                <button
                  type="button"
                  onClick={() => removeFilter("to")}
                  className="hover:text-accent font-bold"
                  aria-label="Remove to date filter"
                >
                  ×
                </button>
              </span>
            )}
            {appliedFilters.hideLinkedCopies && (
              <span className="inline-flex items-center gap-1 rounded-full bg-chip px-2.5 py-1 text-heading">
                Linked copies hidden
                <button
                  type="button"
                  onClick={() => removeFilter("hideLinkedCopies")}
                  className="hover:text-accent font-bold"
                  aria-label="Disable hiding linked copies"
                >
                  ×
                </button>
              </span>
            )}
            <button
              type="button"
              onClick={clearFilters}
              className="font-bold text-accent hover:underline ml-1"
            >
              Clear all
            </button>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <p className="font-medium text-heading">
            {pagination && pagination.total > 0
              ? `Showing ${(pagination.page - 1) * pagination.pageSize + 1}–${Math.min(
                  pagination.page * pagination.pageSize,
                  pagination.total,
                )} of ${pagination.total.toLocaleString("en-IN")}`
              : loading
              ? "Loading tickets…"
              : "0 tickets found"}
          </p>

          <span className="text-xs text-muted">
            {pagination
              ? `Page ${pagination.page} of ${Math.max(1, pagination.totalPages)} · 50 per page`
              : "50 per page"}
          </span>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <EmptyState
          title="Error loading tickets"
          message={error}
          action={
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex min-h-[40px] items-center justify-center rounded-lg bg-panel px-4 py-2 text-sm font-semibold text-on-panel transition hover:bg-panel/90"
            >
              Reset filters
            </button>
          }
        />
      )}

      {/* Compact ticket cards view (Primary View) */}
      {!error && (
        <div className="space-y-4">
          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="p-5 space-y-3 animate-pulse">
                  <div className="h-4 w-24 rounded bg-chip" />
                  <div className="h-5 w-36 rounded bg-chip" />
                  <div className="h-4 w-full rounded bg-chip" />
                  <div className="h-3 w-1/2 rounded bg-chip" />
                </Card>
              ))}
            </div>
          ) : data.length === 0 ? (
            <EmptyState
              title="No matching tickets"
              message="No tickets matched your filter criteria. Try adjusting or clearing filters."
              action={
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex min-h-[40px] items-center justify-center rounded-lg bg-panel px-4 py-2 text-sm font-semibold text-on-panel transition hover:bg-panel/90"
                >
                  Clear all filters
                </button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.map((ticket, index) => {
                const isExact = ticket.match_method?.includes("correlation_id");
                const hasLink = Boolean(ticket.linked_ticket_id);
                const isExpanded = expandedSubjectId === `${ticket.ticket_id}-${index}`;

                return (
                  <Card
                    key={`${ticket.source}-${ticket.ticket_id}-${ticket.source_sheet ?? ""}-${index}`}
                    className="p-5 flex flex-col justify-between hover:border-accent transition group"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <Chip className="text-[11px] font-semibold">
                          {ticket.source}
                          {ticket.source_sheet
                            ? ` · ${ticket.source_sheet.replace(" Tickets_Oct 26", "")}`
                            : ""}
                        </Chip>
                        <span className="text-xs text-muted whitespace-nowrap">
                          {formatDate(ticket.created_on)}
                        </span>
                      </div>

                      <div>
                        <Link
                          href={`/tickets/${encodeURIComponent(
                            ticket.ticket_id,
                          )}?source=${encodeURIComponent(ticket.source)}`}
                          className="font-mono text-base font-bold text-heading group-hover:text-accent hover:underline inline-block"
                        >
                          {ticket.ticket_id}
                        </Link>
                        {ticket.is_cross_tool_copy && (
                          <span className="ml-2 inline-block rounded bg-chip px-1.5 py-0.5 text-[10px] font-medium text-muted">
                            Linked copy
                          </span>
                        )}
                      </div>

                      {/* One-line subject with toggleable complete subject */}
                      <div className="text-sm text-body">
                        <p
                          className={isExpanded ? "break-words" : "line-clamp-1"}
                          title={ticket.subject || "No subject recorded"}
                        >
                          {ticket.subject || "No subject recorded"}
                        </p>
                        {ticket.subject && ticket.subject.length > 60 && (
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedSubjectId(
                                isExpanded ? null : `${ticket.ticket_id}-${index}`,
                              )
                            }
                            className="mt-1 text-[11px] font-semibold text-accent hover:underline"
                          >
                            {isExpanded ? "Show less" : "Show full subject"}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-line space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="text-muted">
                          Team:{" "}
                          <strong className="text-heading font-medium">
                            {ticket.team || "—"}
                          </strong>
                        </span>
                        <span className="rounded-full bg-chip px-2 py-0.5 font-medium text-heading">
                          {ticket.status || "Unknown"}
                        </span>
                      </div>

                      {ticket.priority && (
                        <div className="text-[11px] text-muted">
                          Priority:{" "}
                          <span className="font-medium text-body">{ticket.priority}</span>
                        </div>
                      )}

                      {/* Linked ticket chip */}
                      {hasLink && (
                        <div className="pt-1">
                          <Link
                            href={`/tickets/${encodeURIComponent(
                              ticket.linked_ticket_id!,
                            )}`}
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold transition hover:opacity-80 ${
                              isExact
                                ? "bg-accent/10 text-accent border border-accent/20"
                                : "bg-chip text-body border border-line"
                            }`}
                          >
                            <span aria-hidden="true">🔗</span>
                            <span>Linked to {ticket.linked_ticket_id}</span>
                            <span className="opacity-75 font-normal">
                              · {isExact ? "Exact" : "Candidate"}
                            </span>
                          </Link>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Pagination controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface p-4 shadow-xs">
            <p className="text-sm text-muted">
              {pagination && pagination.total > 0
                ? `Showing ${(pagination.page - 1) * pagination.pageSize + 1}–${Math.min(
                    pagination.page * pagination.pageSize,
                    pagination.total,
                  )} of ${pagination.total.toLocaleString("en-IN")}`
                : "No records to display"}
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="rounded-lg border border-line bg-surface px-3 py-2 text-sm font-medium text-heading disabled:cursor-not-allowed disabled:opacity-40 hover:bg-chip transition"
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
                className="rounded-lg border border-line bg-surface px-3 py-2 text-sm font-medium text-heading disabled:cursor-not-allowed disabled:opacity-40 hover:bg-chip transition"
              >
                Next
              </button>
            </div>
          </div>

          {/* Complete table inside Disclosure */}
          <Disclosure
            title="Show as table"
            openLabel="Show as table"
            closeLabel="Hide table view"
            defaultOpen={false}
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] border-collapse text-left text-sm">
                <thead className="bg-chip text-xs uppercase tracking-wide text-muted">
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
                <tbody className="divide-y divide-line">
                  {loading && (
                    <tr>
                      <td colSpan={8} className="px-5 py-8 text-center text-muted">
                        Loading tickets…
                      </td>
                    </tr>
                  )}

                  {!loading && data.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-5 py-8 text-center text-muted">
                        No tickets match these filters.
                      </td>
                    </tr>
                  )}

                  {!loading &&
                    data.map((ticket, index) => (
                      <tr
                        key={`table-${ticket.source}-${ticket.ticket_id}-${ticket.source_sheet ?? ""}-${index}`}
                        className="align-top hover:bg-chip/40 transition"
                      >
                        <td className="whitespace-nowrap px-5 py-4">
                          <Link
                            href={`/tickets/${encodeURIComponent(
                              ticket.ticket_id,
                            )}?source=${encodeURIComponent(ticket.source)}`}
                            className="font-mono font-semibold text-accent hover:underline"
                          >
                            {ticket.ticket_id}
                          </Link>
                          {ticket.is_cross_tool_copy && (
                            <span className="mt-1 block text-xs text-muted">
                              Linked copy
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-body">
                          {ticket.source}
                          {ticket.source_sheet && (
                            <span className="mt-1 block text-xs text-muted">
                              {ticket.source_sheet.replace(" Tickets_Oct 26", "")}
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-body">
                          {formatDate(ticket.created_on)}
                        </td>
                        <td className="max-w-md px-5 py-4">
                          <p className="line-clamp-2 text-heading" title={ticket.subject || ""}>
                            {ticket.subject || "—"}
                          </p>
                          {ticket.priority && (
                            <span className="mt-1 block text-xs text-muted">
                              Priority: {ticket.priority}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-body">
                          {ticket.team || "—"}
                        </td>
                        <td className="px-5 py-4">
                          <span className="inline-flex rounded-full bg-chip px-2.5 py-1 text-xs font-medium text-heading">
                            {ticket.status || "Unknown"}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-body">
                          {ticket.linked_ticket_id ? (
                            <Link
                              href={`/tickets/${encodeURIComponent(ticket.linked_ticket_id)}`}
                              className="font-mono text-accent hover:underline"
                            >
                              {ticket.linked_ticket_id}
                            </Link>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-5 py-4 text-xs text-muted">
                          {matchMethodLabel(ticket.match_method)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </Disclosure>
        </div>
      )}

      <p className="text-xs leading-5 text-muted">
        Source data is read-only. A subject-and-time mapping is a low-confidence
        candidate, not a confirmed duplicate. Service requests without a source
        creation timestamp display no creation date.
      </p>
    </main>
  );
}
