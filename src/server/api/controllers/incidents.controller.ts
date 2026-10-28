import { Elysia, t } from "elysia";

import { explainIncidents } from "@/server/services/explain.service";

export const incidentsController = new Elysia({ prefix: "/incidents" }).post(
  "/explain",
  ({ query }) => explainIncidents(query.force === "true"),
  { query: t.Object({ force: t.Optional(t.String()) }) },
);
