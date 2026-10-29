"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { confidenceLabel, matchMethodLabel } from "@/lib/labels";

type TicketRecord = {
  source: string;
  source_row_id: number;
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

type TicketLink = {
  link_id: number;
  msolve_ticket_id: string;
  alfa_ticket_id: string;
  match_method: string;
  confidence: string;
  time_difference_seconds: number | string | null;
  evidence: Record<string, unknown>;
  created_at: string;
};

type DetailResponse = {
  ticketId: string;
  records: TicketRecord[];
  links: TicketLink[];
  linkedRecords: TicketRecord[];
  error?: string;
};

function formatDate(value: string | null) {
  if (!value) return "Not available";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "medium",
    timeZone: "Asia/Kolkata",
  }).format(date);
}

function TicketCard({
  ticket,
}: {
  ticket: TicketRecord;
}) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {ticket.source}
        {ticket.source_sheet ? ` · ${ticket.source_sheet}` : ""}
      </p>

      <h2 className="mt-2 break-words text-xl font-bold text-indigo-700">
        {ticket.ticket_id}
      </h2>

      <dl className="mt-5 space-y-4 text-sm">
        <div>
          <dt className="text-slate-500">Subject</dt>
          <dd className="mt-1 break-words font-medium text-slate-900">
            {ticket.subject || "Not available"}
          </dd>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <dt className="text-slate-500">Created (IST)</dt>
            <dd className="mt-1 text-slate-800">
              {formatDate(ticket.created_on)}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Status</dt>
            <dd className="mt-1 text-slate-800">
              {ticket.status || "Not available"}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Team / Department</dt>
            <dd className="mt-1 break-words text-slate-800">
              {ticket.team || "Not available"}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Priority</dt>
            <dd className="mt-1 text-slate-800">
              {ticket.priority || "Not available"}
            </dd>
          </div>
        </div>
      </dl>
    </article>
  );
}

export default function TicketDetailPage() {
  const params = useParams<{ id: string }>();
  const ticketId = params.id;

  const [result, setResult] = useState<DetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadDetails() {
      setLoading(true);
      setError("");

      try {
        const source = new URLSearchParams(window.location.search).get("source");
        const query = source
          ? `?source=${encodeURIComponent(source)}`
          : "";

        const response = await fetch(
          `/api/tickets/${encodeURIComponent(ticketId)}${query}`,
        );

        const body = (await response.json()) as DetailResponse;

        if (!response.ok) {
          throw new Error(
            body.error || `Unable to load ticket (${response.status}).`,
          );
        }

        if (!cancelled) setResult(body);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Unable to load ticket details.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadDetails();

    return () => {
      cancelled = true;
    };
  }, [ticketId]);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
          <div>
            <a href="/" className="text-sm font-semibold text-indigo-700">
              Incident Lens
            </a>
            <h1 className="mt-1 text-2xl font-bold">Ticket Details</h1>
            <p className="mt-1 text-sm text-slate-500">
              Inspect the source ticket and its cross-tool mapping evidence.
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-7">
        <a
          href="/tickets"
          className="inline-flex rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
        >
          ← Back to tickets
        </a>

        <div className="mt-5">
          <p className="text-sm text-slate-500">Ticket ID</p>
          <h2 className="mt-1 break-all text-2xl font-bold">{ticketId}</h2>
        </div>

        {loading && (
          <p className="mt-8 rounded-xl border border-slate-200 bg-white p-6 text-slate-500">
            Loading ticket details…
          </p>
        )}

        {error && (
          <div
            role="alert"
            className="mt-6 rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700"
          >
            {error}
            <p className="mt-2">
              Check the ticket ID or return to the ticket list.
            </p>
          </div>
        )}

        {!loading && !error && result && (
          <>
            <section className="mt-7">
              <h2 className="mb-4 text-lg font-semibold">
                Ticket comparison
              </h2>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {[...result.records, ...result.linkedRecords].map((ticket) => (
                  <TicketCard
                    key={`${ticket.source}-${ticket.source_row_id}`}
                    ticket={ticket}
                  />
                ))}
              </div>

              {result.linkedRecords.length === 0 && (
                <p className="mt-3 text-sm text-slate-500">
                  No linked ticket records were found for this ticket.
                </p>
              )}
            </section>

            <section className="mt-8">
              <h2 className="mb-4 text-lg font-semibold">
                Matching evidence
              </h2>

              {result.links.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
                  No mapping evidence is available for this ticket.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                  <table className="w-full min-w-[700px] text-left text-sm">
                    <thead className="bg-slate-100 text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-4 py-3">MSOLVE ticket</th>
                        <th className="px-4 py-3">Alfa ticket</th>
                        <th className="px-4 py-3">Method</th>
                        <th className="px-4 py-3">Confidence</th>
                        <th className="px-4 py-3">Time difference</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {result.links.map((link) => {
                        const seconds =
                          link.time_difference_seconds == null
                            ? null
                            : Number(link.time_difference_seconds);

                        return (
                          <tr key={link.link_id}>
                            <td className="px-4 py-3 font-medium">
                              {link.msolve_ticket_id}
                            </td>
                            <td className="px-4 py-3 font-medium">
                              {link.alfa_ticket_id}
                            </td>
                            <td className="px-4 py-3">
                              {matchMethodLabel(link.match_method)}
                            </td>
                            <td className="px-4 py-3">
                              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs">
                                {confidenceLabel(link.confidence)}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {seconds == null
                                ? "Not calculated"
                                : `${seconds.toLocaleString("en-IN")} seconds`}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="mt-3 text-xs leading-5 text-slate-500">
                Subject-and-time matches are low-confidence candidates, not
                confirmed duplicates. Exact-ID matches do not currently have a
                stored time difference.
              </p>
            </section>
          </>
        )}
      </div>
    </main>
  );
}