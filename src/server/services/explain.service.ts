import { sql } from "drizzle-orm";

import { env } from "@/env";
import { db } from "@/server/db";

export const DEMO_IDS = [
  "NAGP1-20261011-0954",
  "RDPPL-20261011-1805",
  "IGTPL-20261010-0613",
  "NET-10.151.103-20261004-0125",
];

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

type IncidentFacts = {
  id: string;
  site: string;
  started: string;
  ended: string;
  member_count: number;
  repeat_total: number;
  root_alert_id: string;
  root_subject: string;
  primary_team: string;
  supporting_teams: string | null;
  confidence: string;
  confidence_reason: string;
};

type ExplainResult = {
  model: string;
  selected: number;
  saved: string[];
  skipped: { id: string; reason: string }[];
};

function mask(text: string): string {
  return text
    .replace(/\b\d{1,3}(?:\.\d{1,3}){3}\b/g, "[IP]")
    .replace(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, "[EMAIL]");
}

async function pickIncidents(force: boolean): Promise<string[]> {
  const rows = await db.execute<{ id: string }>(sql`
    SELECT id FROM (
      (SELECT id FROM incident ORDER BY member_count DESC, id LIMIT 20)
      UNION
      SELECT id FROM incident WHERE id IN (${sql.join(DEMO_IDS.map((id) => sql`${id}`), sql`, `)})
    ) x
    WHERE ${force} OR id IN (SELECT id FROM incident WHERE explanation_ai IS NULL)
    ORDER BY id
  `);
  return rows.map((r) => r.id);
}

async function loadFacts(id: string) {
  const [facts] = await db.execute<IncidentFacts>(sql`
    SELECT i.id, i.site,
           to_char(i.started_at AT TIME ZONE 'Asia/Kolkata', 'DD Mon YYYY HH24:MI') AS started,
           to_char(i.ended_at AT TIME ZONE 'Asia/Kolkata', 'HH24:MI') AS ended,
           i.member_count, i.repeat_total, i.root_alert_id, r.subject AS root_subject,
           i.primary_team, i.supporting_teams, i.confidence, i.confidence_reason
    FROM incident i
    JOIN alert_event r ON r.alert_id = i.root_alert_id
    WHERE i.id = ${id}
  `);
  const members = await db.execute<{ subject: string }>(sql`
    SELECT e.subject
    FROM incident_member m
    JOIN alert_event e ON e.alert_id = m.alert_id
    WHERE m.incident_id = ${id} AND NOT e.is_repeat AND NOT m.is_root
    ORDER BY e.tier, e.symptom_rank, e.created_at, e.id
    LIMIT 15
  `);
  const reasons = await db.execute<{ code: string }>(sql`
    SELECT DISTINCT trim(code) AS code
    FROM incident_member m, unnest(string_to_array(m.reason, ',')) AS code
    WHERE m.incident_id = ${id}
    ORDER BY 1
  `);
  return { facts, members: members.map((m) => m.subject), reasons: reasons.map((r) => r.code) };
}

function buildPrompt(f: IncidentFacts, members: string[], reasons: string[]): string {
  return mask(
    [
      `Incident: ${f.id}`,
      `Site code: ${f.site}`,
      `Window: ${f.started} to ${f.ended} IST`,
      `Distinct alerts: ${f.member_count}; repeats: ${f.repeat_total}`,
      `Root alert: ${f.root_alert_id} - ${f.root_subject}`,
      `Primary team: ${f.primary_team}`,
      `Supporting teams: ${f.supporting_teams ?? "none"}`,
      `Confidence: ${f.confidence} (${f.confidence_reason})`,
      `Reason codes: ${reasons.join(", ")}`,
      `Other member alerts:`,
      ...members.map((s) => `- ${s}`),
    ].join("\n"),
  );
}

const SYSTEM_PROMPT = [
  "You explain correlated IT alert incidents to a service desk engineer.",
  "Use only the facts given. Do not invent devices, causes or numbers.",
  "Say 'probable' and 'recommended'. Never say the cause is confirmed.",
  "Cite the root alert ID exactly as given.",
  "Write exactly three short paragraphs separated by a blank line:",
  "1. What happened: alert count, site, and time window.",
  "2. Order of events: which device layer reported the problem first and what followed.",
  "3. Cautious conclusion identifying the layer that may be the primary point of investigation.",
  "Keep total response under 120 words.",
].join(" ");

async function callModel(model: string, prompt: string): Promise<string> {
  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "X-Title": "incident-lens",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: 300,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("empty response");
  return text;
}

function checkOutput(text: string, rootAlertId: string): string | null {
  if (!text.includes(rootAlertId)) return "root alert ID missing";
  if (/(?<!not )\bconfirmed\b/i.test(text)) return "says confirmed";
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (paragraphs.length < 2 || paragraphs.length > 4) {
    return `paragraph count must be 2 to 4, got ${paragraphs.length}`;
  }
  return null;
}

export async function explainIncidents(force = false): Promise<ExplainResult> {
  const model = env.OPENROUTER_MODEL;
  const apiKey = env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is required");
  const ids = await pickIncidents(force);
  const result: ExplainResult = { model, selected: ids.length, saved: [], skipped: [] };

  for (const id of ids) {
    const { facts, members, reasons } = await loadFacts(id);
    if (!facts) {
      result.skipped.push({ id, reason: "facts not found" });
      continue;
    }
    try {
      const text = await callModel(model, buildPrompt(facts, members, reasons));
      const problem = checkOutput(text, facts.root_alert_id);
      if (problem) {
        result.skipped.push({ id, reason: problem });
        continue;
      }
      await db.execute(sql`
        UPDATE incident SET explanation_ai = ${text}, ai_model = ${model} WHERE id = ${id}
      `);
      result.saved.push(id);
    } catch (e) {
      result.skipped.push({ id, reason: e instanceof Error ? e.message : "unknown error" });
    }
  }

  return result;
}
