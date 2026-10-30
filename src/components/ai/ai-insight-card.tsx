import { ConfidenceBadge, SectionLabel } from "@/components/ui";

export type AiInsightCardIncident = {
  id: string;
  site: string;
  startedAt: Date;
  endedAt: Date;
  memberCount: number;
  repeatTotal?: number | null;
  rootAlertId?: string | null;
  primaryTeam?: string | null;
  supportingTeams?: string | null;
  confidence?: string | null;
  confidenceReason?: string | null;
  explanationTemplate?: string | null;
  explanationAi?: string | null;
  aiModel?: string | null;
};

export interface AiInsightCardProps {
  incident: AiInsightCardIncident;
  rootAlertHref?: string;
  showHeader?: boolean;
}

export function parseParagraphs(text?: string | null): string[] {
  if (!text || !text.trim()) return [];
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  return paragraphs.length > 0 ? paragraphs : [text.trim()];
}

export function splitTemplate(text?: string | null): string[] {
  if (!text || !text.trim()) return [];
  const sentences = text
    .trim()
    .split(/(?<=\.)\s+(?=[A-Z])/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (sentences.length < 3) return [text.trim()];
  return [sentences[0]!, sentences[1]!, sentences.slice(2).join(" ")];
}

export function AiInsightCard({
  incident,
  rootAlertHref,
  showHeader = true,
}: AiInsightCardProps) {
  const hasAi = Boolean(incident.explanationAi);
  const paragraphs = hasAi
    ? parseParagraphs(incident.explanationAi)
    : splitTemplate(incident.explanationTemplate);

  const defaultRootHref = `/incidents/${encodeURIComponent(
    incident.id
  )}#alert-${encodeURIComponent(incident.rootAlertId ?? "")}`;
  const targetRootHref = rootAlertHref ?? defaultRootHref;

  return (
    <div className="space-y-4">
      {showHeader && (
        <div>
          <SectionLabel>INCIDENT SUMMARY</SectionLabel>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-heading">
            What happened and who should look first
          </h2>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="flex flex-col justify-between rounded-xl border border-line bg-surface p-6 shadow-xs lg:col-span-2 space-y-5">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
              <div className="flex items-center gap-2.5">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
                  <svg
                    className="size-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                  </svg>
                </span>
                <h3 className="font-bold text-heading text-sm sm:text-base">
                  Potential correlated incident detected
                </h3>
              </div>

              {hasAi ? (
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-full bg-chip px-2.5 py-0.5 text-xs font-bold text-heading border border-line">
                    <svg
                      className="size-3 text-accent"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3z" />
                    </svg>
                    <span>AI-generated</span>
                  </span>
                  {incident.aiModel && (
                    <span className="text-[11px] text-muted">
                      · {incident.aiModel}
                    </span>
                  )}
                </div>
              ) : null}
            </div>

            <div className="space-y-3 pt-1">
              {paragraphs.length > 0 ? (
                paragraphs.map((p, idx) => (
                  <p key={idx} className="text-sm leading-relaxed text-body">
                    {p}
                  </p>
                ))
              ) : (
                <p className="text-sm italic text-muted">
                  No explanation summary available.
                </p>
              )}
            </div>

            {incident.rootAlertId && (
              <div className="pt-1">
                <a
                  href={targetRootHref}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline"
                >
                  <span>Based on alert</span>
                  <span className="font-mono">{incident.rootAlertId}</span>
                  <span>(probable cause) →</span>
                </a>
              </div>
            )}
          </div>

          <div className="border-t border-line pt-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Recommended primary team
                </dt>
                <dd className="mt-1 text-xl font-bold text-accent">
                  {incident.primaryTeam ?? "Needs triage"}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Potential supporting teams
                </dt>
                <dd className="mt-1 text-sm font-semibold text-heading">
                  {incident.supportingTeams || "None"}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Confidence
                </dt>
                <dd className="mt-1 flex flex-wrap items-center gap-2">
                  <ConfidenceBadge confidence={incident.confidence} />
                  {incident.confidenceReason && (
                    <span className="text-xs text-muted">
                      {incident.confidenceReason}
                    </span>
                  )}
                </dd>
              </div>
            </div>
          </div>
        </section>

        <aside className="flex flex-col justify-between rounded-xl bg-panel p-6 text-on-panel border border-panel shadow-xs lg:col-span-1">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-white">
                <svg
                  className="size-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <circle cx="12" cy="9" r="2.5" />
                  <path d="M8.5 15.5a3.5 3.5 0 0 1 7 0" />
                </svg>
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-accent">
                IMPORTANT
              </span>
            </div>

            <h4 className="mt-4 text-base font-bold text-on-panel leading-snug">
              The AI provides{" "}
              <span className="text-accent">
                evidence-based recommendations
              </span>
              , not blind automation.
            </h4>

            <p className="mt-2 text-xs text-on-panel-muted leading-relaxed">
              Resolver teams remain in control of every decision.
            </p>

          </div>

          <div className="mt-6 border-t border-line/20 pt-3">
            <span className="inline-flex items-center gap-1.5 text-[11px] text-on-panel-muted">
              <span className="size-1.5 rounded-full bg-accent" />
              <span>Human review required</span>
            </span>
          </div>
        </aside>
      </div>
    </div>
  );
}
