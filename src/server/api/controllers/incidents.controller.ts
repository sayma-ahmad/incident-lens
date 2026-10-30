import { Elysia, t } from "elysia";

import { addFeedback, getIncident, getScorecard, listAiCandidateIncidents, listIncidents } from "@/server/db/incidents-queries";
import { explainIncidents } from "@/server/services/explain.service";

export const incidentsRoutes = new Elysia()
  .get(
    "/incidents",
    ({ query }) =>
      listIncidents({
        site: query.site,
        confidence: query.confidence,
        team: query.team,
        date: query.date,
        sort: query.sort,
        limit: query.limit,
        offset: query.offset,
      }),
    {
      query: t.Object({
        site: t.Optional(t.String()),
        confidence: t.Optional(t.Union([t.Literal("high"), t.Literal("medium"), t.Literal("low")])),
        team: t.Optional(t.String()),
        date: t.Optional(t.String({ pattern: "^\\d{4}-\\d{2}-\\d{2}$" })),
        sort: t.Optional(t.Union([t.Literal("size"), t.Literal("confidence")])),
        limit: t.Optional(t.Numeric({ minimum: 1, maximum: 500 })),
        offset: t.Optional(t.Numeric({ minimum: 0 })),
      }),
    },
  )
  .post(
    "/incidents/explain",
    async ({ query, status }) => {
      try {
        return await explainIncidents(query.force === "true");
      } catch (e) {
        return status(400, { error: e instanceof Error ? e.message : "explain failed" });
      }
    },
    { query: t.Object({ force: t.Optional(t.String()) }) },
  )
  .get("/incidents/:id", async ({ params, status }) => {
    const found = await getIncident(params.id);
    return found ?? status(404, { error: "Incident not found" });
  })
  .post(
    "/incidents/:id/feedback",
    async ({ params, body, status }) => {
      const saved = await addFeedback(params.id, body.verdict, body.note);
      return saved ? status(201, saved) : status(404, { error: "Incident not found" });
    },
    {
      body: t.Object({
        verdict: t.Union([t.Literal("correct"), t.Literal("wrong"), t.Literal("split")]),
        note: t.Optional(t.String({ maxLength: 1000 })),
      }),
    },
  )
  .get("/ai-insights", () => listAiCandidateIncidents())
  .get("/scorecard", () => getScorecard());
