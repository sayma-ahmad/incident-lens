import { Elysia } from "elysia";

import { incidentsRoutes } from "@/server/api/controllers/incidents.controller";

export const elysiaApp = new Elysia({ prefix: "/api" }).use(incidentsRoutes);

export type ElysiaApp = typeof elysiaApp;
