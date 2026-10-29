import { Elysia, t } from "elysia";
import { ticketsService } from "@/server/services/tickets.service";

export const ticketsController = new Elysia()
  .get(
    "/tickets/:id",
    async ({ params, query, set }) => {
      try {
        const result = await ticketsService.getTicketDetails(
          params.id,
          query.source,
        );

        if (!result) {
          set.status = 404;
          return { error: "Ticket not found." };
        }

        return result;
      } catch (error) {
        console.error("GET /api/tickets/:id failed:", error);
        set.status = 500;
        return { error: "Unable to retrieve ticket details." };
      }
    },
    {
      query: t.Object({
        source: t.Optional(t.String()),
      }),
    },
  )
  .get(
    "/tickets",
    async ({ query, set }) => {
      for (const [name, value] of [
        ["from", query.from],
        ["to", query.to],
      ] as const) {
        if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
          set.status = 400;
          return { error: `${name} must use YYYY-MM-DD format.` };
        }

        if (value && Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
          set.status = 400;
          return { error: `${name} is not a valid date.` };
        }
      }

      if (query.from && query.to && query.from > query.to) {
        set.status = 400;
        return { error: "'from' must not be later than 'to'." };
      }

      try {
        return await ticketsService.listTickets(query);
      } catch (error) {
        console.error("GET /api/tickets failed:", error);
        set.status = 500;
        return {
          error:
            "Unable to retrieve tickets. Check the database connection and ticket_view.",
        };
      }
    },
    {
      query: t.Object({
        page: t.Optional(t.String()),
        source: t.Optional(t.String()),
        team: t.Optional(t.String()),
        subject: t.Optional(t.String()),
        from: t.Optional(t.String()),
        to: t.Optional(t.String()),
        hideLinkedCopies: t.Optional(t.String()),
      }),
    },
  );
