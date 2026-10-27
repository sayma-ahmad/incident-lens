import { and, sql } from "drizzle-orm";
import { Elysia, t } from "elysia";
import { db } from "@/server/db";

export const elysiaApp = new Elysia({ prefix: "/api" })
  .get("/health", () => ({ ok: true }))
  .get(
    "/tickets/:id",
    async ({ params, query, set }) => {
      try {
        const records = await db.execute(sql`
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
          WHERE ticket_id = ${params.id}
          ${query.source ? sql`AND source = ${query.source}` : sql``}
          ORDER BY source, created_on DESC NULLS LAST, source_row_id
        `);

        if (records.length === 0) {
          set.status = 404;
          return { error: "Ticket not found." };
        }

        const links = await db.execute(sql`
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
          WHERE msolve_ticket_id = ${params.id}
             OR alfa_ticket_id = ${params.id}
          ORDER BY match_method, link_id
        `);

        const linkedIds = [
          ...new Set(
            Array.from(links).map((link) =>
              String(link.msolve_ticket_id) === params.id
                ? String(link.alfa_ticket_id)
                : String(link.msolve_ticket_id),
            ),
          ),
        ];

        const linkedRecords =
          linkedIds.length > 0
            ? await db.execute(sql`
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
              `)
            : [];

        return {
          ticketId: params.id,
          records,
          links,
          linkedRecords,
        };
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
      const page = Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1);
      const pageSize = 50;
      const offset = (page - 1) * pageSize;

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

      const filters = [];

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

      try {
        const [countResult, rows] = await Promise.all([
          db.execute(sql`
            SELECT COUNT(*)::int AS total
            FROM ticket_view
            ${where}
          `),
          db.execute(sql`
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
            ${where}
            ORDER BY created_on DESC NULLS LAST, ticket_id
            LIMIT ${pageSize}
            OFFSET ${offset}
          `),
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
      } catch (error) {
        console.error("GET /api/tickets failed:", error);
        set.status = 500;
        return {
          error: "Unable to retrieve tickets. Check the database connection and ticket_view.",
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

elysiaApp.get("/reports/data", async ({ set }) => {
  try {
    const [
      sourceCounts,
      prefixCounts,
      correlationSummary,
      matchMethods,
      mappingSummary,
      coverage,
      unmatchedSample,
      departmentComparison,
      timeDifferenceStats,
    ] = await Promise.all([
      db.execute(sql`
        SELECT 'MSOLVE incidents' AS source, COUNT(*)::int AS row_count
        FROM raw_msolve_incidents
        UNION ALL
        SELECT 'MSOLVE service requests', COUNT(*)::int
        FROM raw_msolve_service_requests
        UNION ALL
        SELECT 'Alfa Open', COUNT(*)::int
        FROM raw_alfa_tickets
        WHERE source_sheet = 'Open Tickets_Oct 26'
        UNION ALL
        SELECT 'Alfa Resolved', COUNT(*)::int
        FROM raw_alfa_tickets
        WHERE source_sheet = 'Resolved Tickets_Oct 26'
        UNION ALL
        SELECT 'Alfa Closed', COUNT(*)::int
        FROM raw_alfa_tickets
        WHERE source_sheet = 'Closed Tickets_Oct 26'
      `),

      db.execute(sql`
        SELECT
          COALESCE(ticket_prefix, '(blank)') AS prefix,
          COUNT(DISTINCT ticket_id)::int AS unique_ticket_ids,
          COUNT(*)::int AS source_rows
        FROM alfa_ticket
        GROUP BY ticket_prefix
        ORDER BY source_rows DESC, prefix
      `),

      db.execute(sql`
        SELECT
          COUNT(*)::int AS total_incidents,
          COUNT(*) FILTER (
            WHERE NULLIF(BTRIM(correlation_id), '') IS NOT NULL
          )::int AS with_correlation_id,
          COUNT(*) FILTER (
            WHERE BTRIM(COALESCE(correlation_id, '')) ~ '^[0-9]+$'
          )::int AS numeric_correlation_ids,
          COUNT(*) FILTER (
            WHERE BTRIM(COALESCE(correlation_id, '')) ~* '^[A-Za-z]+[0-9]+$'
          )::int AS prefixed_correlation_ids
        FROM msolve_incident
      `),

      db.execute(sql`
        SELECT
          match_method,
          confidence,
          COUNT(*)::int AS links,
          COUNT(DISTINCT msolve_ticket_id)::int AS unique_msolve_tickets,
          COUNT(DISTINCT alfa_ticket_id)::int AS unique_alfa_tickets
        FROM ticket_link
        GROUP BY match_method, confidence
        ORDER BY match_method, confidence
      `),

      db.execute(sql`
        SELECT
          COUNT(*)::int AS total_incidents,
          COUNT(*) FILTER (
            WHERE EXISTS (
              SELECT 1 FROM ticket_link l
              WHERE l.msolve_ticket_id = i.ticket_id
            )
          )::int AS matched_incidents,
          COUNT(*) FILTER (
            WHERE NOT EXISTS (
              SELECT 1 FROM ticket_link l
              WHERE l.msolve_ticket_id = i.ticket_id
            )
          )::int AS unmatched_incidents,
          COUNT(*) FILTER (
            WHERE NULLIF(BTRIM(i.correlation_id), '') IS NOT NULL
              AND EXISTS (
                SELECT 1 FROM ticket_link l
                WHERE l.msolve_ticket_id = i.ticket_id AND l.match_method IN ('numeric_correlation_id', 'prefixed_correlation_id')
              )
          )::int AS matched_with_correlation_id,
          COUNT(*) FILTER (
            WHERE NULLIF(BTRIM(i.correlation_id), '') IS NOT NULL
              AND NOT EXISTS (
                SELECT 1 FROM ticket_link l
                WHERE l.msolve_ticket_id = i.ticket_id AND l.match_method IN ('numeric_correlation_id', 'prefixed_correlation_id')
              )
          )::int AS unmatched_with_correlation_id
        FROM msolve_incident i
      `),

      db.execute(sql`
        SELECT
          COALESCE(NULLIF(BTRIM(i.contact_type), ''), '(blank)') AS contact_type,
          (
            NULLIF(BTRIM(i.correlation_id), '') IS NOT NULL
          ) AS has_correlation_id,
          COUNT(*)::int AS incident_count,
          COUNT(*) FILTER (
            WHERE EXISTS (
              SELECT 1 FROM ticket_link l
              WHERE l.msolve_ticket_id = i.ticket_id
            )
          )::int AS matched_incidents,
          COUNT(*) FILTER (
            WHERE NOT EXISTS (
              SELECT 1 FROM ticket_link l
              WHERE l.msolve_ticket_id = i.ticket_id
            )
          )::int AS unmatched_incidents
        FROM msolve_incident i
        GROUP BY 1, 2
        ORDER BY 1, 2 DESC
      `),

      db.execute(sql`
        SELECT
          i.ticket_id,
          i.subject,
          i.contact_type,
          i.correlation_id,
          i.created_on
        FROM msolve_incident i
        WHERE NOT EXISTS (
          SELECT 1 FROM ticket_link l
          WHERE l.msolve_ticket_id = i.ticket_id
        )
        ORDER BY i.created_on DESC, i.ticket_id
        LIMIT 50
      `),

      db.execute(sql`
        WITH distinct_pairs AS (
          SELECT DISTINCT
            l.msolve_ticket_id,
            l.alfa_ticket_id,
            l.match_method,
            COALESCE(
              NULLIF(BTRIM(i.assignment_group), ''),
              '(blank)'
            ) AS assignment_group,
            COALESCE(
              NULLIF(BTRIM(a.department), ''),
              '(blank)'
            ) AS department
          FROM ticket_link l
          JOIN msolve_incident i
            ON i.ticket_id = l.msolve_ticket_id
          JOIN alfa_ticket a
            ON a.ticket_id = l.alfa_ticket_id
        )
        SELECT
          assignment_group,
          department,
          match_method,
          COUNT(*)::int AS matched_pairs
        FROM distinct_pairs
        GROUP BY assignment_group, department, match_method
        ORDER BY matched_pairs DESC, assignment_group, department
        LIMIT 100
      `),

      db.execute(sql`
        SELECT
          COUNT(*)::int AS links_with_time_difference,
          ROUND(
            PERCENTILE_CONT(0.5) WITHIN GROUP (
              ORDER BY time_difference_seconds
            )::numeric, 2
          ) AS median_seconds,
          ROUND(
            PERCENTILE_CONT(0.9) WITHIN GROUP (
              ORDER BY time_difference_seconds
            )::numeric, 2
          ) AS p90_seconds,
          COUNT(*) FILTER (
            WHERE ABS(time_difference_seconds) <= 600
          )::int AS matches_within_10_minutes
        FROM ticket_link
        WHERE time_difference_seconds IS NOT NULL
      `),
    ]);

    return {
      sourceCounts,
      alfaTicketPrefixCounts: prefixCounts,
      correlationSummary: correlationSummary[0],
      matchesByMethod: matchMethods,
      mappingSummary: mappingSummary[0],
      mappingCoverageByContactType: coverage,
      unmatchedSample,
      assignmentGroupDepartmentComparison: departmentComparison,
      timeDifferenceStats: timeDifferenceStats[0],
      timestampAssumption:
        "Per PM confirmation, timezone-naive timestamps are interpreted as IST (Asia/Kolkata). Alfa Closed Created On values with an explicit Z suffix are UTC. Missing timestamps remain NULL.",
      timeDifferenceScope:
        "Time-difference statistics include only links where time_difference_seconds was recorded. Exact correlation-ID links currently have no stored time difference.",
    };
  } catch (error) {
    console.error("GET /api/reports/data failed:", error);
    set.status = 500;
    return { error: "Unable to generate the data and mapping report." };
  }
});
elysiaApp.get("/reports/baseline", async ({ set }) => {
  try {
    const [
      dailyVolumes,
      closureStats,
      busiestPeriods,
      repeatedSubjects,
      departmentVolumes,
    ] = await Promise.all([
      db.execute(sql`
        WITH days AS (
          SELECT generate_series(
            DATE '2026-10-01',
            DATE '2026-10-15',
            INTERVAL '1 day'
          )::date AS report_date
        ),
        alfa_daily AS (
          SELECT
            (created_on AT TIME ZONE 'Asia/Kolkata')::date AS report_date,
            COUNT(*)::int AS alfa_records
          FROM alfa_ticket
          WHERE created_on >= (
            TIMESTAMP '2026-10-01 00:00:00' AT TIME ZONE 'Asia/Kolkata'
          )
            AND created_on < (
              TIMESTAMP '2026-10-16 00:00:00' AT TIME ZONE 'Asia/Kolkata'
            )
          GROUP BY 1
        ),
        msolve_daily AS (
          SELECT
            (created_on AT TIME ZONE 'Asia/Kolkata')::date AS report_date,
            COUNT(*)::int AS msolve_incidents
          FROM msolve_incident
          WHERE created_on >= (
            TIMESTAMP '2026-10-01 00:00:00' AT TIME ZONE 'Asia/Kolkata'
          )
            AND created_on < (
              TIMESTAMP '2026-10-16 00:00:00' AT TIME ZONE 'Asia/Kolkata'
            )
          GROUP BY 1
        )
        SELECT
          d.report_date,
          COALESCE(a.alfa_records, 0)::int AS alfa_records,
          COALESCE(m.msolve_incidents, 0)::int AS msolve_incidents
        FROM days d
        LEFT JOIN alfa_daily a USING (report_date)
        LEFT JOIN msolve_daily m USING (report_date)
        ORDER BY d.report_date
      `),

      db.execute(sql`
        SELECT
          COUNT(*)::int AS closed_alfa_records,
          COUNT(*) FILTER (
            WHERE LOWER(BTRIM(COALESCE(closed_by, ''))) = 'system'
          )::int AS closed_by_system,
          ROUND(
            100.0 * COUNT(*) FILTER (
              WHERE LOWER(BTRIM(COALESCE(closed_by, ''))) = 'system'
            ) / NULLIF(COUNT(*), 0),
            2
          ) AS system_closed_percentage
        FROM alfa_ticket
        WHERE source_sheet = 'Closed Tickets_Oct 26'
      `),

      db.execute(sql`
        WITH events AS (
          SELECT
            created_on AT TIME ZONE 'Asia/Kolkata' AS local_time,
            COALESCE(NULLIF(BTRIM(department), ''), '(blank)') AS department,
            'Alfa'::text AS source
          FROM alfa_ticket
          WHERE created_on >= (
            TIMESTAMP '2026-10-01 00:00:00' AT TIME ZONE 'Asia/Kolkata'
          )
            AND created_on < (
              TIMESTAMP '2026-10-16 00:00:00' AT TIME ZONE 'Asia/Kolkata'
            )

          UNION ALL

          SELECT
            created_on AT TIME ZONE 'Asia/Kolkata',
            COALESCE(NULLIF(BTRIM(assignment_group), ''), '(blank)'),
            'MSOLVE Incident'::text
          FROM msolve_incident
          WHERE created_on >= (
            TIMESTAMP '2026-10-01 00:00:00' AT TIME ZONE 'Asia/Kolkata'
          )
            AND created_on < (
              TIMESTAMP '2026-10-16 00:00:00' AT TIME ZONE 'Asia/Kolkata'
            )
        ),
        bucketed AS (
          SELECT
            date_trunc('hour', local_time)
              + FLOOR(EXTRACT(MINUTE FROM local_time) / 15)
                * INTERVAL '15 minutes' AS period_start,
            department,
            source
          FROM events
        )
        SELECT
          period_start,
          period_start + INTERVAL '15 minutes' AS period_end,
          COUNT(*)::int AS total_records,
          COUNT(*) FILTER (WHERE source = 'Alfa')::int AS alfa_records,
          COUNT(*) FILTER (
            WHERE source = 'MSOLVE Incident'
          )::int AS msolve_incidents,
          COUNT(DISTINCT department)::int AS distinct_departments
        FROM bucketed
        GROUP BY period_start
        ORDER BY total_records DESC, period_start
        LIMIT 20
      `),

      db.execute(sql`
        WITH subjects AS (
          SELECT
            LOWER(
              REGEXP_REPLACE(
                BTRIM(subject),
                '[[:space:]]+',
                ' ',
                'g'
              )
            ) AS normalized_subject,
            MIN(BTRIM(subject)) AS subject_example,
            COUNT(*)::int AS record_count,
            COUNT(DISTINCT ticket_id)::int AS unique_ticket_ids
          FROM alfa_ticket
          WHERE NULLIF(BTRIM(subject), '') IS NOT NULL
            AND created_on >= (
              TIMESTAMP '2026-10-01 00:00:00' AT TIME ZONE 'Asia/Kolkata'
            )
            AND created_on < (
              TIMESTAMP '2026-10-16 00:00:00' AT TIME ZONE 'Asia/Kolkata'
            )
          GROUP BY 1
        )
        SELECT
          subject_example AS subject,
          record_count,
          unique_ticket_ids
        FROM subjects
        WHERE record_count > 1
        ORDER BY record_count DESC, subject_example
        LIMIT 20
      `),

      db.execute(sql`
        SELECT
          COALESCE(NULLIF(BTRIM(department), ''), '(blank)') AS department,
          COUNT(*)::int AS ticket_records,
          COUNT(DISTINCT ticket_id)::int AS unique_ticket_ids,
          COUNT(*) FILTER (
            WHERE source_sheet = 'Closed Tickets_Oct 26'
              AND LOWER(BTRIM(COALESCE(closed_by, ''))) = 'system'
          )::int AS closed_by_system_records
        FROM alfa_ticket
        WHERE created_on >= (
          TIMESTAMP '2026-10-01 00:00:00' AT TIME ZONE 'Asia/Kolkata'
        )
          AND created_on < (
            TIMESTAMP '2026-10-16 00:00:00' AT TIME ZONE 'Asia/Kolkata'
          )
        GROUP BY 1
        ORDER BY ticket_records DESC, department
      `),
    ]);

    return {
      period: {
        from: "2026-10-01",
        through: "2026-10-15",
        timezone: "Asia/Kolkata",
      },
      dailyVolumes,
      closureStats: closureStats[0],
      busiestPeriods,
      repeatedSubjects,
      departmentVolumes,
      notes: [
        "Daily volumes count source records, including duplicate source rows.",
        "Busy periods combine Alfa records and MSOLVE incidents; service requests are excluded.",
        "Department volumes are based on Alfa records.",
        "Dates use IST calendar boundaries. Alfa Closed Created On values with explicit Z suffix are interpreted as UTC.",
      ],
    };
  } catch (error) {
    console.error("GET /api/reports/baseline failed:", error);
    set.status = 500;
    return { error: "Unable to generate the baseline report." };
  }
});
export type ElysiaApp = typeof elysiaApp;