import { Elysia } from "elysia";
import { healthController } from "@/server/api/controllers/health.controller";
import { reportsController } from "@/server/api/controllers/reports.controller";
import { ticketsController } from "@/server/api/controllers/tickets.controller";

export const elysiaApp = new Elysia({ prefix: "/api" })
  .use(healthController)
  .use(ticketsController)
  .use(reportsController);

export type ElysiaApp = typeof elysiaApp;
