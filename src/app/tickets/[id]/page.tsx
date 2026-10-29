"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Card,
  Chip,
  ConfidenceBadge,
  Disclosure,
  EmptyState,
} from "@/components/ui";
import { matchMethodLabel } from "@/lib/labels";

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
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(date);
}

function getPlainMatchingLabel(link: TicketLink): string {
  const method = link.match_method || "";
  const diffSec =
    link.time_difference_seconds != null
      ? Number(link.time_difference_seconds)
      : null;

  if (
    method === "numeric_correlation_id" ||
    method === "prefixed_correlation_id" ||
    method.includes("correlation")
  ) {
    return "Same correlation ID";
  }

  if (method === "exact_subject_time_within_10m") {
    if (diffSec != null && !isNaN(diffSec)) {
      const mins = Math.max(0, Math.round(diffSec / 60));
      return `Similar subject, created ${mins} min apart · candidate`;
    }
    return "Similar subject, created within 10 min · candidate";
  }

  if (method === "incident_number_in_alfa_subject") {
    return "Incident number found in Alfa subject · candidate";
  }

  return matchMethodLabel(method);
}

function RecordFieldList({ ticket }: { ticket: TicketRecord }) {
  const fields: { label: string; value: string | number | boolean | null }[] = [
    { label: "Ticket ID", value: ticket.ticket_id },
    { label: "Source Tool", value: ticket.source },
    { label: "Source Sheet", value: ticket.source_sheet || "Not specified" },
    { label: "Source Row ID", value: ticket.source_row_id },
    { label: "Created (IST)", value: formatDate(ticket.created_on) },
    { label: "Status", value: ticket.status || "Not recorded" },
    { label: "Team / Dept", value: ticket.team || "Not recorded" },
    { label: "Priority", value: ticket.priority || "Not recorded" },
    { label: "Cross-Tool Copy", value: ticket.is_cross_tool_copy ? "Yes" : "No" },
    { label: "Duplicate Flag", value: ticket.is_duplicate ? "Yes" : "No" },
    { label: "Linked Ticket ID", value: ticket.linked_ticket_id || "None" },
    { label: "Match Method", value: ticket.match_method ? matchMethodLabel(ticket.match_method) : "None" },
  ];

  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-xs">
      {fields.map((f, i) => (
        <div key={i} className="border-b border-line/60 pb-2">
          <dt className="text-muted font-medium">{f.label}</dt>
          <dd className="font-semibold text-heading break-words mt-0.5">
            {String(f.value)}
          </dd>
        </div>
      ))}
      <div className="sm:col-span-2 pt-1">
        <dt className="text-muted font-medium">Subject</dt>
        <dd className="font-medium text-body break-words mt-0.5">
          {ticket.subject || "No subject recorded"}
        </dd>
      </div>
    </dl>
  );
}

function SideBySideCard({
  title,
  ticket,
  isPrimary,
}: {
  title: string;
  ticket?: TicketRecord | null;
  isPrimary?: boolean;
}) {
  if (!ticket) {
    return (
      <Card className="p-6 flex flex-col justify-between">
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-muted">
              {title}
            </span>
            <Chip>Unlinked</Chip>
          </div>
          <EmptyState
            title={`No ${title} record`}
            message="No matching cross-tool record was linked for this ticket."
          />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 flex flex-col justify-between space-y-6">
      <div className="space-y-4">
        {/* Card header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted">
              {title}
            </span>
            {isPrimary && (
              <span className="rounded bg-accent/10 px-2 py-0.5 text-[10px] font-bold text-accent">
                Current ticket
              </span>
            )}
          </div>
          <Chip className="text-xs font-semibold">
            {ticket.source}
            {ticket.source_sheet ? ` · ${ticket.source_sheet.replace(" Tickets_Oct 26", "")}` : ""}
          </Chip>
        </div>

        {/* Ticket ID & Subject */}
        <div>
          <h3 className="font-mono text-xl font-bold text-heading">
            {ticket.ticket_id}
          </h3>
          <p className="mt-2 text-sm text-body leading-relaxed">
            {ticket.subject || "No subject recorded"}
          </p>
        </div>

        {/* Fact chips */}
        <div className="flex flex-wrap gap-2 pt-2">
          <Chip>📅 {formatDate(ticket.created_on)}</Chip>
          <Chip>👥 {ticket.team || "No team"}</Chip>
          <Chip>⚡ {ticket.status || "Unknown"}</Chip>
          {ticket.priority && <Chip>🎯 Priority: {ticket.priority}</Chip>}
        </div>
      </div>

      {/* Collapsed Original Record Disclosure */}
      <div className="pt-4 border-t border-line">
        <Disclosure
          title="Original record"
          openLabel="View full original record"
          closeLabel="Hide original record"
          defaultOpen={false}
        >
          <div className="p-4 bg-chip/30 rounded-lg mt-2">
            <RecordFieldList ticket={ticket} />
          </div>
        </Disclosure>
      </div>
    </Card>
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
        const query = source ? `?source=${encodeURIComponent(source)}` : "";

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

  const primaryTicket = result?.records?.[0] ?? null;
  const isMsolvePrimary = primaryTicket?.source.startsWith("MSOLVE") ?? false;

  const linkedMsolveTicket = isMsolvePrimary
    ? primaryTicket
    : result?.linkedRecords?.find((r) => r.source.startsWith("MSOLVE")) ?? null;

  const linkedAlfaTicket = !isMsolvePrimary
    ? primaryTicket
    : result?.linkedRecords?.find((r) => !r.source.startsWith("MSOLVE")) ?? null;

  const primaryLink = result?.links?.[0] ?? null;

  return (
    <main className="mx-auto max-w-7xl p-6 space-y-8">
      {/* Back button & page header */}
      <div className="space-y-4">
        <Link
          href="/tickets"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-accent uppercase tracking-wider hover:underline"
        >
          <span aria-hidden="true">←</span>
          <span>Back to tickets</span>
        </Link>

        {primaryTicket && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-3xl font-bold tracking-tight text-heading">
                {primaryTicket.ticket_id}
              </span>
              <Chip className="font-semibold">{primaryTicket.source}</Chip>
              {primaryLink && (
                <ConfidenceBadge confidence={primaryLink.confidence} />
              )}
            </div>

            <p className="text-base sm:text-lg text-body max-w-4xl">
              {primaryTicket.subject || "No subject recorded"}
            </p>

            {/* Fact chips */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Chip>📅 {formatDate(primaryTicket.created_on)}</Chip>
              <Chip>👥 {primaryTicket.team || "No team"}</Chip>
              <Chip>⚡ Status: {primaryTicket.status || "Unknown"}</Chip>
              {primaryTicket.priority && (
                <Chip>🎯 Priority: {primaryTicket.priority}</Chip>
              )}
            </div>
          </div>
        )}
      </div>

      {loading && (
        <Card className="p-8 text-center text-muted">
          Loading ticket details…
        </Card>
      )}

      {error && (
        <EmptyState
          title="Could not load ticket"
          message={error}
          action={
            <Link
              href="/tickets"
              className="inline-flex min-h-[40px] items-center justify-center rounded-lg bg-panel px-4 py-2 text-sm font-semibold text-on-panel transition hover:bg-panel/90"
            >
              Back to ticket directory
            </Link>
          }
        />
      )}

      {!loading && !error && result && (
        <>
          {/* Side-by-side comparison: MSOLVE on Left, AlfaNow on Right */}
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xl font-bold text-heading">
                Cross-tool comparison
              </h2>
              {primaryLink && (
                <span className="text-xs font-semibold rounded-full bg-chip px-3 py-1 text-heading">
                  {getPlainMatchingLabel(primaryLink)}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* MSOLVE on the left */}
              <SideBySideCard
                title="MSOLVE Ticket"
                ticket={linkedMsolveTicket}
                isPrimary={isMsolvePrimary}
              />

              {/* AlfaNow on the right */}
              <SideBySideCard
                title="AlfaNow Ticket"
                ticket={linkedAlfaTicket}
                isPrimary={!isMsolvePrimary}
              />
            </div>
          </section>

          {/* Why we linked these / Matching evidence */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-heading">
              Why we linked these
            </h2>

            {result.links.length === 0 ? (
              <Card className="p-6">
                <EmptyState
                  title="No cross-tool link found"
                  message="This ticket does not have an exact correlation ID link or candidate subject match with a ticket in the other tool."
                />
              </Card>
            ) : (
              <div className="space-y-4">
                {result.links.map((link) => {
                  const plainLabel = getPlainMatchingLabel(link);
                  const seconds =
                    link.time_difference_seconds != null
                      ? Number(link.time_difference_seconds)
                      : null;

                  const correlationId =
                    (link.evidence?.correlation_id as string | undefined) ||
                    (link.evidence?.msolve_correlation_id as string | undefined) ||
                    null;

                  return (
                    <Card key={link.link_id} className="p-6 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
                        <div className="space-y-1">
                          <div className="text-xs font-bold uppercase tracking-wider text-muted">
                            Matching Rule
                          </div>
                          <div className="text-lg font-bold text-heading">
                            {plainLabel}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted">Confidence:</span>
                          <ConfidenceBadge confidence={link.confidence} />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                        <div className="rounded-lg bg-chip/40 p-3">
                          <span className="text-xs text-muted block">Correlation ID</span>
                          <span className="font-mono font-bold text-heading mt-0.5 block">
                            {correlationId || "None recorded"}
                          </span>
                        </div>

                        <div className="rounded-lg bg-chip/40 p-3">
                          <span className="text-xs text-muted block">Rule Definition</span>
                          <span className="font-semibold text-heading mt-0.5 block">
                            {matchMethodLabel(link.match_method)}
                          </span>
                        </div>

                        <div className="rounded-lg bg-chip/40 p-3">
                          <span className="text-xs text-muted block">Time Difference</span>
                          <span className="font-semibold text-heading mt-0.5 block">
                            {seconds == null
                              ? "Not recorded"
                              : `${seconds.toLocaleString("en-IN")} seconds (${Math.round(seconds / 60)} min)`}
                          </span>
                        </div>
                      </div>

                      {/* Evidence details */}
                      {link.evidence && Object.keys(link.evidence).length > 0 && (
                        <div className="mt-2 pt-3 border-t border-line text-xs">
                          <span className="font-bold text-muted uppercase tracking-wider block mb-2">
                            Evidence fields
                          </span>
                          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            {Object.entries(link.evidence).map(([key, val]) => (
                              <div key={key} className="flex items-start gap-2">
                                <dt className="text-muted font-medium shrink-0">
                                  {key}:
                                </dt>
                                <dd className="font-mono text-heading break-all">
                                  {typeof val === "object"
                                    ? JSON.stringify(val)
                                    : String(val)}
                                </dd>
                              </div>
                            ))}
                          </dl>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}

            <p className="text-xs leading-5 text-muted">
              Evidence is read-only. Subject-and-time matches are low-confidence
              candidates requiring human review. Exact-ID matches link records that
              share a ServiceNow correlation identifier.
            </p>
          </section>
        </>
      )}
    </main>
  );
}
