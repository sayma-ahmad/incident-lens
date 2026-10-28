import { Elysia, t } from "elysia";

import { addFeedback, getIncident, getScorecard, listIncidents } from "@/server/db/incidents-queries";
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
        limit: query.limit,
        offset: query.offset,
      }),
    {
      query: t.Object({
        site: t.Optional(t.String()),
        confidence: t.Optional(t.Union([t.Literal("high"), t.Literal("medium"), t.Literal("low")])),
        team: t.Optional(t.String()),
        date: t.Optional(t.String({ pattern: "^\\d{4}-\\d{2}-\\d{2}$" })),
        limit: t.Optional(t.Numeric({ minimum: 1, maximum: 500 })),
        offset: t.Optional(t.Numeric({ minimum: 0 })),
      }),
    },
  )
  .post("/incidents/explain", ({ query }) => explainIncidents(query.force === "true"), {
    query: t.Object({ force: t.Optional(t.String()) }),
  })
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
  .get("/scorecard", () => getScorecard());
