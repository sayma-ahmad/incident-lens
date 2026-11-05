import { Elysia, t } from "elysia";
import { alertCorrelationService } from "@/server/services/alert-correlation.service";

export const alertCorrelationController = new Elysia()
  .get(
    "/alert-correlation",
    async ({ query, set }) => {
      const fromTime = query.from ? Date.parse(query.from) : null;
      const toTime = query.to ? Date.parse(query.to) : null;

      if (query.from && Number.isNaN(fromTime)) {
        set.status = 400;
        return { error: "Invalid from timestamp." };
      }

      if (query.to && Number.isNaN(toTime)) {
        set.status = 400;
        return { error: "Invalid to timestamp." };
      }

      if (fromTime !== null && toTime !== null && fromTime >= toTime) {
        set.status = 400;
        return { error: "The from timestamp must be earlier than the to timestamp." };
      }

      try {
        return await alertCorrelationService.list({
          from: query.from,
          to: query.to,
          site: query.site,
          device: query.device,
          team: query.team,
          deviceType: query.deviceType,
          windowSeconds: query.windowSeconds,
          stage: query.stage as "all" | "stage1" | "stage2" | "upstream_root" | undefined,
          view: query.view as "alerts" | "clusters" | undefined,
          limit: query.limit,
          offset: query.offset,
        });
      } catch (error) {
        console.error("GET /api/alert-correlation failed:", error);
        set.status = 500;
        return { error: "Unable to retrieve alert correlation events." };
      }
    },
    {
      query: t.Object({
        from: t.Optional(t.String()),
        to: t.Optional(t.String()),
        site: t.Optional(t.String()),
        device: t.Optional(t.String()),
        team: t.Optional(t.String()),
        deviceType: t.Optional(t.String()),
        windowSeconds: t.Optional(t.Numeric({ minimum: 15, maximum: 600 })),
        stage: t.Optional(t.String()),
        view: t.Optional(t.String()),
        limit: t.Optional(t.Numeric({ minimum: 1, maximum: 500 })),
        offset: t.Optional(t.Numeric({ minimum: 0 })),
      }),
    },
  )
  .get(
    "/alert-correlation/clusters",
    async ({ query, set }) => {
      try {
        return await alertCorrelationService.clusters({
          from: query.from,
          to: query.to,
          site: query.site,
          device: query.device,
          team: query.team,
          deviceType: query.deviceType,
          windowSeconds: query.windowSeconds,
          stage: query.stage as "all" | "stage1" | "stage2" | undefined,
          limit: query.limit,
        });
      } catch (error) {
        console.error("GET /api/alert-correlation/clusters failed:", error);
        set.status = 500;
        return { error: "Unable to retrieve correlated incident clusters." };
      }
    },
    {
      query: t.Object({
        from: t.Optional(t.String()),
        to: t.Optional(t.String()),
        site: t.Optional(t.String()),
        device: t.Optional(t.String()),
        team: t.Optional(t.String()),
        deviceType: t.Optional(t.String()),
        windowSeconds: t.Optional(t.Numeric({ minimum: 15, maximum: 600 })),
        stage: t.Optional(t.String()),
        limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
      }),
    },
  );
