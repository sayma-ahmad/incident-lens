import Link from "next/link";
import {
  Card,
  Chip,
  ConfidenceBadge,
  IconCircle,
  PageHeader,
  SectionLabel,
} from "@/components/ui";
import { AiInsightCard, parseParagraphs } from "@/components/ai/ai-insight-card";
import { listAiCandidateIncidents } from "@/server/db/incidents-queries";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined) {
  const v = Array.isArray(value) ? value[0] : value;
  return v?.trim() || undefined;
}

const dateFormat = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  day: "2-digit",
  month: "short",
});

const timeFormat = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export default async function AiInsightsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const filter = first(params.filter);
  const onlyAi = filter === "ai";

  const candidates = await listAiCandidateIncidents();

  // Featured incident: genuinely saved AI explanation or NAGP1 demo incident or first candidate
  const featured =
    candidates.find((c) => c.hasAi) ??
    candidates.find((c) => c.id === "NAGP1-20261011-0954") ??
    candidates[0];

  const aiCount = candidates.filter((c) => c.hasAi).length;
  const displayedIncidents = onlyAi
    ? candidates.filter((c) => c.hasAi)
    : candidates;

  return (
    <main className="mx-auto max-w-7xl p-6 space-y-10">
      {/* PageHeader */}
      <PageHeader
        sectionLabel="STEP 5 · EXPLAIN"
        title="AI-explained incidents"
        description="For the biggest and most important incidents, AI turns the facts into a short explanation an engineer can read in 20 seconds, and recommends which team should look first."
        howToRead={[
          "AI explanations are generated for the largest and most critical incidents to accelerate engineer triage.",
          "Rules find the incident group, the probable root cause, and the team. AI only generates the narrative summary.",
          "Sensitive details such as IP addresses and email addresses are masked before prompts are sent.",
          "Shadow mode: every finding is probable until verified by an operations engineer.",
        ]}
      />

      {/* 1. Featured insight */}
      {featured && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <SectionLabel>FEATURED INCIDENT</SectionLabel>
              <h2 className="mt-1 text-xl sm:text-2xl font-bold tracking-tight text-heading">
                Incident {featured.id}
              </h2>
            </div>
            <Link
              href={`/incidents/${encodeURIComponent(featured.id)}`}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-panel px-4 py-2 text-xs sm:text-sm font-semibold text-on-panel transition hover:bg-panel/90 shadow-xs focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <span>Open full incident and timeline</span>
              <span aria-hidden="true">→</span>
            </Link>
          </div>

          <AiInsightCard
            incident={featured}
            rootAlertHref={`/incidents/${encodeURIComponent(
              featured.id
            )}#alert-${encodeURIComponent(featured.rootAlertId ?? "")}`}
            showHeader={false}
          />
        </section>
      )}

      {/* 2. How the AI works */}
      <section className="space-y-4">
        <div>
          <SectionLabel>SAFETY ARCHITECTURE</SectionLabel>
          <h2 className="mt-1 text-xl sm:text-2xl font-bold tracking-tight text-heading">
            How the AI works
          </h2>
          <p className="mt-1 text-xs text-muted">
            Strict boundaries ensure the AI assists engineers without ever hallucinating or modifying ServiceNow data.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="p-5 space-y-3">
            <IconCircle icon="layers" size="md" />
            <h3 className="text-sm font-bold text-heading">
              1. Correlation rules
            </h3>
            <p className="text-xs leading-relaxed text-body">
              Rules find the group, the probable cause and the team.{" "}
              <strong className="text-heading font-semibold">
                This grouping step does not use AI.
              </strong>
            </p>
          </Card>

          <Card className="p-5 space-y-3">
            <IconCircle icon="shield-person" size="md" />
            <h3 className="text-sm font-bold text-heading">
              2. Masked prompt
            </h3>
            <p className="text-xs leading-relaxed text-body">
              We send only those facts to the AI, with IP addresses and emails hidden before sending.
            </p>
          </Card>

          <Card className="p-5 space-y-3">
            <IconCircle icon="sparkle" size="md" />
            <h3 className="text-sm font-bold text-heading">
              3. AI explanation
            </h3>
            <p className="text-xs leading-relaxed text-body">
              The AI writes a short explanation and must cite the probable-cause alert.
            </p>
          </Card>

          <Card className="p-5 space-y-3">
            <IconCircle icon="check" size="md" />
            <h3 className="text-sm font-bold text-heading">
              4. Safety check
            </h3>
            <p className="text-xs leading-relaxed text-body">
              We check the answer: it must not claim a confirmed cause. Otherwise we show the rule-based summary.
            </p>
          </Card>
        </div>
      </section>

      {/* 3. All AI-explained incidents */}
      <section className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
          <div>
            <SectionLabel>CANDIDATE SELECTION</SectionLabel>
            <h2 className="mt-1 text-xl sm:text-2xl font-bold tracking-tight text-heading">
              All AI-explained incidents
            </h2>
            <p className="mt-1 text-xs text-muted">
              Showing candidate incidents prioritized by size and demo prominence ({candidates.length} candidate incidents).
            </p>
          </div>

          {/* Filter: Show only AI-generated */}
          <div className="flex items-center gap-2">
            <Link
              href="/ai-insights"
              className={`min-h-[38px] inline-flex items-center rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                !onlyAi
                  ? "bg-panel text-on-panel shadow-xs"
                  : "border border-line bg-surface text-body hover:bg-chip"
              }`}
            >
              All incidents ({candidates.length})
            </Link>
            <Link
              href="/ai-insights?filter=ai"
              className={`min-h-[38px] inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                onlyAi
                  ? "bg-panel text-on-panel shadow-xs"
                  : "border border-line bg-surface text-body hover:bg-chip"
              }`}
            >
              <span>Show only AI-generated</span>
              <span className="rounded-full bg-chip/20 px-1.5 py-0.2 text-[10px] font-bold">
                {aiCount}
              </span>
            </Link>
          </div>
        </div>

        {displayedIncidents.length === 0 ? (
          <Card className="p-8 text-center space-y-2">
            <p className="text-base font-bold text-heading">
              No incidents with AI explanations found
            </p>
            <p className="text-xs text-muted max-w-md mx-auto">
              No incidents currently have saved AI explanations. Candidate incidents use rule-based fallback summaries until an external run is generated.
            </p>
            <div className="pt-2">
              <Link
                href="/ai-insights"
                className="inline-flex min-h-[38px] items-center rounded-lg bg-panel px-4 py-2 text-xs font-semibold text-on-panel hover:bg-panel/90 transition"
              >
                View all candidate incidents
              </Link>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {displayedIncidents.map((item) => {
              const firstParagraph =
                parseParagraphs(
                  item.explanationAi ?? item.explanationTemplate
                )[0] ?? "No explanation summary available.";

              return (
                <Link
                  key={item.id}
                  href={`/incidents/${encodeURIComponent(item.id)}`}
                  className="flex flex-col justify-between rounded-xl border border-line bg-surface p-5 shadow-xs transition hover:border-accent hover:shadow-md group"
                >
                  <div className="space-y-3">
                    {/* Top Chips & Tag */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Chip className="font-bold">Site {item.site}</Chip>
                        <Chip>
                          {dateFormat.format(item.startedAt)},{" "}
                          {timeFormat.format(item.startedAt)} IST
                        </Chip>
                        <Chip>{item.memberCount} alerts</Chip>
                      </div>

                      {item.hasAi ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-chip px-2 py-0.5 text-[11px] font-bold text-heading border border-line">
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
                      ) : (
                        <span className="rounded-full bg-chip px-2 py-0.5 text-[11px] font-semibold text-heading border border-line">
                          Rule-based
                        </span>
                      )}
                    </div>

                    {/* Incident ID */}
                    <div className="font-mono text-xs font-semibold text-muted group-hover:text-accent transition">
                      {item.id}
                    </div>

                    {/* First paragraph of explanation */}
                    <p className="text-xs text-body line-clamp-3 leading-relaxed">
                      {firstParagraph}
                    </p>
                  </div>

                  {/* Footer */}
                  <div className="mt-4 pt-3 border-t border-line flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <ConfidenceBadge confidence={item.confidence} />
                      <strong className="text-accent font-bold">
                        {item.primaryTeam ?? "Needs triage"}
                      </strong>
                    </div>

                    <span className="text-accent font-semibold group-hover:translate-x-0.5 transition-transform">
                      View incident →
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* 4. Honesty box */}
      <section className="rounded-xl border border-line bg-chip/60 p-5 shadow-xs">
        <div className="flex items-start gap-3.5">
          <div className="mt-0.5 shrink-0 text-accent">
            <svg
              className="size-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <p className="text-xs sm:text-sm leading-relaxed text-heading font-medium">
            AI wording is generated by a free model. Facts, grouping and team choice come from rules, not AI. Every result is probable until an engineer confirms it.
          </p>
        </div>
      </section>
    </main>
  );
}
