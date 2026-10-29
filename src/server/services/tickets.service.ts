import { and, sql, type SQL } from "drizzle-orm";
import {
  countTickets,
  findLinkedTicketRecords,
  findTicketLinksById,
  findTicketRecordsById,
  findTickets,
} from "@/server/db/queries/tickets.queries";

export interface ListTicketsQuery {
  page?: string;
  source?: string;
  team?: string;
  subject?: string;
  from?: string;
  to?: string;
  hideLinkedCopies?: string;
}

export class TicketsService {
  async getTicketDetails(id: string, source?: string) {
    const records = await findTicketRecordsById(id, source);

    if (records.length === 0) {
      return null;
    }

    const links = await findTicketLinksById(id);

    const linkedIds = [
      ...new Set(
        Array.from(links).map((link) =>
          String(link.msolve_ticket_id) === id
            ? String(link.alfa_ticket_id)
            : String(link.msolve_ticket_id),
        ),
      ),
    ];

    const linkedRecords = await findLinkedTicketRecords(linkedIds);

    return {
      ticketId: id,
      records,
      links,
      linkedRecords,
    };
  }

  async listTickets(query: ListTicketsQuery) {
    const page = Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1);
    const pageSize = 50;
    const offset = (page - 1) * pageSize;

    const filters: SQL[] = [];

    if (query.source) {
      filters.push(sql`source = ${query.source}`);
    }
    if (query.team) {
      filters.push(sql`team ILIKE ${`%${query.team}%`}`);
    }
    if (query.subject) {
      filters.push(sql`subject ILIKE ${`%${query.subject}%`}`);
    }
    if (query.from) {
      filters.push(
        sql`created_on >= (${query.from}::date::timestamp AT TIME ZONE 'Asia/Kolkata')`,
      );
    }
    if (query.to) {
      filters.push(
        sql`created_on < ((${query.to}::date + 1)::timestamp AT TIME ZONE 'Asia/Kolkata')`,
      );
    }
    if (query.hideLinkedCopies === "true") {
      filters.push(sql`is_cross_tool_copy = false`);
    }

    const where = filters.length
      ? sql`WHERE ${and(...filters)}`
      : sql``;

    const [countResult, rows] = await Promise.all([
      countTickets(where),
      findTickets(where, pageSize, offset),
    ]);

    const total = Number(countResult[0]?.total ?? 0);

    return {
      data: rows,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }
}

export const ticketsService = new TicketsService();
