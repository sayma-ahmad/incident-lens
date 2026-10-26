import { Elysia } from "elysia";

export const elysiaApp = new Elysia({ prefix: "/api" });

export type ElysiaApp = typeof elysiaApp;
