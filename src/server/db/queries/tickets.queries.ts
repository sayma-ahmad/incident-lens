import { sql, type SQL } from "drizzle-orm";
import { db } from "@/server/db";

export async function findTicketRecordsById(id: string, source?: string) {
  return db.execute(sql`
    SELECT
      source,
      source_row_id,
      ticket_id,
      created_on,
      subject,
      team,
      status,
      linked_ticket_id,
      match_method,
      is_cross_tool_copy,
      is_duplicate,
      linked_ticket_count,
      source_sheet,
      priority
    FROM ticket_view
    WHERE ticket_id = ${id}
    ${source ? sql`AND source = ${source}` : sql``}
    ORDER BY source, created_on DESC NULLS LAST, source_row_id
  `);
}

export async function findTicketLinksById(id: string) {
  return db.execute(sql`
    SELECT
      link_id,
      msolve_ticket_id,
      alfa_ticket_id,
      match_method,
      confidence,
      time_difference_seconds,
      evidence,
      created_at
    FROM ticket_link
    WHERE msolve_ticket_id = ${id}
       OR alfa_ticket_id = ${id}
    ORDER BY match_method, link_id
  `);
}

export async function findLinkedTicketRecords(linkedIds: string[]) {
  if (linkedIds.length === 0) {
    return [];
  }

  return db.execute(sql`
    SELECT
      source,
      source_row_id,
      ticket_id,
      created_on,
      subject,
      team,
      status,
      linked_ticket_id,
      match_method,
      is_cross_tool_copy,
      is_duplicate,
      linked_ticket_count,
      source_sheet,
      priority
    FROM ticket_view
    WHERE ticket_id IN (${sql.join(
      linkedIds.map((id) => sql`${id}`),
      sql`, `,
    )})
    ORDER BY source, ticket_id, source_row_id
  `);
}

export async function countTickets(whereClause: SQL) {
  return db.execute(sql`
    SELECT COUNT(*)::int AS total
    FROM ticket_view
    ${whereClause}
  `);
}

export async function findTickets(
  whereClause: SQL,
  limit: number,
  offset: number,
) {
  return db.execute(sql`
    SELECT
      source,
      ticket_id,
      created_on,
      subject,
      team,
      status,
      linked_ticket_id,
      match_method,
      is_cross_tool_copy,
      is_duplicate,
      linked_ticket_count,
      source_sheet,
      priority
    FROM ticket_view
    ${whereClause}
    ORDER BY created_on DESC NULLS LAST, ticket_id
    LIMIT ${limit}
    OFFSET ${offset}
  `);
}
