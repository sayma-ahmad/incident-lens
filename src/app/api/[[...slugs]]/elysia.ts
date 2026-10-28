import { Elysia } from "elysia";

import { incidentsController } from "@/server/api/controllers/incidents.controller";

export const elysiaApp = new Elysia({ prefix: "/api" }).use(incidentsController);

export type ElysiaApp = typeof elysiaApp;
