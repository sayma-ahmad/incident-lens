import { sql } from "drizzle-orm";
import { db } from "@/server/db";

export interface CorrelationEventFilters {
  from?: string;
  to?: string;
  site?: string;
  device?: string;
  team?: string;
  deviceType?: string;
  windowSeconds?: number;
  stage?: "all" | "stage1" | "stage2" | "upstream_root";
  view?: "alerts" | "clusters";
  limit?: number;
  offset?: number;
}

export interface CorrelationSummary {
  total: number;
  distinctTickets: number;
  withDevice: number;
  withLocation: number;
  withInterface: number;
  repeats: number;
  autoClosed: number;
  inIncidents: number;
  stage1Correlated: number;
  stage2Cascading: number;
  upstreamRoots: number;
}

export interface CorrelationEventItem {
  ticket_id: string;
  created_at: string;
  location: string | null;
  device_hostname: string | null;
  interface_name: string | null;
  device_type: string | null;
  tier: number | null;
  symptom: string | null;
  symptom_rank: number | null;
  source_department: string | null;
  recommended_team: string;
  is_root_trigger: boolean;
  incident_id: string | null;
  subject: string | null;
  is_repeat: boolean;
  repeat_count: number;
  auto_closed: boolean;

  // Multi-stage & Upstream correlation attributes
  correlation_stage: "stage1_same_location" | "stage2_cascading" | "single_device";
  is_upstream_root: boolean;
  correlated_upstream_device: string | null;
  stage1_device_count: number;
  stage2_site_count: number;
  window_seconds: number;
}

export interface CorrelatedClusterItem {
  cluster_id: string;
  stage: "stage1_same_location" | "stage2_cascading";
  location: string | null;
  total_alerts: number;
  distinct_devices: number;
  distinct_locations: number;
  started_at: string;
  ended_at: string;
  root_ticket_id: string;
  upstream_device: string | null;
  upstream_device_type: string | null;
  upstream_tier: number | null;
  upstream_symptom: string | null;
  affected_devices: string[];
  affected_locations: string[];
  ticket_ids: string[];
}

export interface CorrelationEventsResult {
  summary: CorrelationSummary;
  limit: number;
  offset: number;
  windowSeconds: number;
  stage: string;
  items: CorrelationEventItem[];
  clusters?: CorrelatedClusterItem[];
}

export function sanitizeWindowSeconds(value?: number): number {
  if (!value || typeof value !== "number" || isNaN(value)) return 45;
  return Math.min(Math.max(Math.round(value), 15), 600);
}

export async function getCorrelationClusters(
  filters: CorrelationEventFilters = {},
): Promise<CorrelatedClusterItem[]> {
  const windowSec = sanitizeWindowSeconds(filters.windowSeconds);
  const stage = filters.stage || "all";
  const from = filters.from || null;
  const to = filters.to || null;
  const site = filters.site?.trim() || null;
  const device = filters.device?.trim() || null;
  const team = filters.team?.trim() || null;
  const deviceType = filters.deviceType?.trim() || null;
  const limit = Math.min(Math.max(filters.limit ?? 30, 1), 100);

  const clusters: CorrelatedClusterItem[] = [];

  // Stage 1 Clusters: Distinct devices at the same physical location within the time window
  if (stage === "all" || stage === "stage1") {
    const stage1Rows = await db.execute<{
      location: string;
      cluster_id: string | number;
      total_alerts: number;
      distinct_devices: number;
      started_at: Date | string;
      ended_at: Date | string;
      root_ticket_id: string;
      upstream_device: string | null;
      upstream_device_type: string | null;
      upstream_tier: number | null;
      upstream_symptom: string | null;
      affected_devices: string[] | null;
      ticket_ids: string[] | null;
    }>(sql`
      WITH base AS (
        SELECT
          e.alert_id AS ticket_id,
          e.created_at,
          e.site AS location,
          e.host AS device_hostname,
          e.device_type,
          e.tier,
          e.symptom,
          e.symptom_rank,
          e.department AS source_department,
          COALESCE(
            tr.team,
            CASE
              WHEN e.department NOT IN ('RID-BOT', 'Doc Support') THEN e.department
              ELSE 'Needs triage'
            END
          ) AS recommended_team
        FROM alert_event e
        LEFT JOIN team_rule tr ON tr.device_type = e.device_type
        WHERE e.site IS NOT NULL
          AND (${from}::timestamptz IS NULL OR e.created_at >= ${from}::timestamptz)
          AND (${to}::timestamptz IS NULL OR e.created_at < ${to}::timestamptz)
      ),
      filtered AS (
        SELECT * FROM base
        WHERE (${site}::text IS NULL OR location ILIKE '%' || ${site} || '%')
          AND (${device}::text IS NULL OR device_hostname ILIKE '%' || ${device} || '%')
          AND (${team}::text IS NULL OR recommended_team = ${team} OR source_department = ${team})
          AND (${deviceType}::text IS NULL OR device_type = ${deviceType})
      ),
      partitioned AS (
        SELECT 
          f.*,
          CASE 
            WHEN lag(created_at) OVER (PARTITION BY location ORDER BY created_at, ticket_id) IS NULL
              OR created_at - lag(created_at) OVER (PARTITION BY location ORDER BY created_at, ticket_id) > (${windowSec} || ' seconds')::interval
            THEN 1 ELSE 0 
          END AS is_start
        FROM filtered f
      ),
      clustered AS (
        SELECT 
          *,
          sum(is_start) OVER (PARTITION BY location ORDER BY created_at, ticket_id) AS cluster_id
        FROM partitioned
      )
      SELECT 
        location,
        cluster_id,
        count(*)::int AS total_alerts,
        count(DISTINCT device_hostname)::int AS distinct_devices,
        min(created_at) AS started_at,
        max(created_at) AS ended_at,
        (ARRAY_AGG(ticket_id ORDER BY CASE WHEN device_hostname IS NOT NULL THEN 0 ELSE 1 END, COALESCE(tier, 99) ASC, COALESCE(symptom_rank, 99) ASC, created_at ASC, ticket_id))[1] AS root_ticket_id,
        (ARRAY_AGG(device_hostname ORDER BY CASE WHEN device_hostname IS NOT NULL THEN 0 ELSE 1 END, COALESCE(tier, 99) ASC, COALESCE(symptom_rank, 99) ASC, created_at ASC, ticket_id) FILTER (WHERE device_hostname IS NOT NULL))[1] AS upstream_device,
        (ARRAY_AGG(device_type ORDER BY CASE WHEN device_hostname IS NOT NULL THEN 0 ELSE 1 END, COALESCE(tier, 99) ASC, COALESCE(symptom_rank, 99) ASC, created_at ASC, ticket_id) FILTER (WHERE device_type IS NOT NULL))[1] AS upstream_device_type,
        (ARRAY_AGG(tier ORDER BY CASE WHEN device_hostname IS NOT NULL THEN 0 ELSE 1 END, COALESCE(tier, 99) ASC, COALESCE(symptom_rank, 99) ASC, created_at ASC, ticket_id) FILTER (WHERE tier IS NOT NULL))[1] AS upstream_tier,
        (ARRAY_AGG(symptom ORDER BY CASE WHEN device_hostname IS NOT NULL THEN 0 ELSE 1 END, COALESCE(tier, 99) ASC, COALESCE(symptom_rank, 99) ASC, created_at ASC, ticket_id) FILTER (WHERE symptom IS NOT NULL))[1] AS upstream_symptom,
        ARRAY_AGG(DISTINCT device_hostname) FILTER (WHERE device_hostname IS NOT NULL) AS affected_devices,
        (ARRAY_AGG(ticket_id ORDER BY created_at ASC))[1:50] AS ticket_ids
      FROM clustered
      GROUP BY location, cluster_id
      HAVING count(DISTINCT device_hostname) > 1
      ORDER BY total_alerts DESC, distinct_devices DESC
      LIMIT ${limit};
    `);

    for (const r of stage1Rows) {
      clusters.push({
        cluster_id: `S1-${r.location}-${r.cluster_id}`,
        stage: "stage1_same_location",
        location: r.location,
        total_alerts: Number(r.total_alerts),
        distinct_devices: Number(r.distinct_devices),
        distinct_locations: 1,
        started_at: r.started_at instanceof Date ? r.started_at.toISOString() : String(r.started_at),
        ended_at: r.ended_at instanceof Date ? r.ended_at.toISOString() : String(r.ended_at),
        root_ticket_id: r.root_ticket_id,
        upstream_device: r.upstream_device || "unknown",
        upstream_device_type: r.upstream_device_type || null,
        upstream_tier: r.upstream_tier !== null ? Number(r.upstream_tier) : null,
        upstream_symptom: r.upstream_symptom || null,
        affected_devices: r.affected_devices || [],
        affected_locations: [r.location],
        ticket_ids: r.ticket_ids || [],
      });
    }
  }

  // Stage 2 Clusters: Cascading anomalies across distinct locations with matching timestamps
  if (stage === "all" || stage === "stage2") {
    const stage2Rows = await db.execute<{
      cluster_id: string | number;
      total_alerts: number;
      distinct_locations: number;
      distinct_devices: number;
      started_at: Date | string;
      ended_at: Date | string;
      root_ticket_id: string;
      upstream_device: string | null;
      upstream_location: string | null;
      upstream_device_type: string | null;
      upstream_tier: number | null;
      upstream_symptom: string | null;
      affected_locations: string[] | null;
      affected_devices: string[] | null;
      ticket_ids: string[] | null;
    }>(sql`
      WITH base AS (
        SELECT
          e.alert_id AS ticket_id,
          e.created_at,
          e.site AS location,
          e.host AS device_hostname,
          e.device_type,
          e.tier,
          e.symptom,
          e.symptom_rank,
          e.department AS source_department,
          COALESCE(
            tr.team,
            CASE
              WHEN e.department NOT IN ('RID-BOT', 'Doc Support') THEN e.department
              ELSE 'Needs triage'
            END
          ) AS recommended_team
        FROM alert_event e
        LEFT JOIN team_rule tr ON tr.device_type = e.device_type
        WHERE e.site IS NOT NULL
          AND (${from}::timestamptz IS NULL OR e.created_at >= ${from}::timestamptz)
          AND (${to}::timestamptz IS NULL OR e.created_at < ${to}::timestamptz)
      ),
      filtered AS (
        SELECT * FROM base
        WHERE (${site}::text IS NULL OR location ILIKE '%' || ${site} || '%')
          AND (${device}::text IS NULL OR device_hostname ILIKE '%' || ${device} || '%')
          AND (${team}::text IS NULL OR recommended_team = ${team} OR source_department = ${team})
          AND (${deviceType}::text IS NULL OR device_type = ${deviceType})
      ),
      partitioned AS (
        SELECT 
          f.*,
          CASE 
            WHEN lag(created_at) OVER (ORDER BY created_at, ticket_id) IS NULL
              OR created_at - lag(created_at) OVER (ORDER BY created_at, ticket_id) > (${windowSec} || ' seconds')::interval
            THEN 1 ELSE 0 
          END AS is_start
        FROM filtered f
      ),
      clustered AS (
        SELECT 
          *,
          sum(is_start) OVER (ORDER BY created_at, ticket_id) AS cluster_id
        FROM partitioned
      )
      SELECT 
        cluster_id,
        count(*)::int AS total_alerts,
        count(DISTINCT location)::int AS distinct_locations,
        count(DISTINCT device_hostname)::int AS distinct_devices,
        min(created_at) AS started_at,
        max(created_at) AS ended_at,
        (ARRAY_AGG(ticket_id ORDER BY CASE WHEN device_hostname IS NOT NULL THEN 0 ELSE 1 END, COALESCE(tier, 99) ASC, COALESCE(symptom_rank, 99) ASC, created_at ASC, ticket_id))[1] AS root_ticket_id,
        (ARRAY_AGG(device_hostname ORDER BY CASE WHEN device_hostname IS NOT NULL THEN 0 ELSE 1 END, COALESCE(tier, 99) ASC, COALESCE(symptom_rank, 99) ASC, created_at ASC, ticket_id) FILTER (WHERE device_hostname IS NOT NULL))[1] AS upstream_device,
        (ARRAY_AGG(location ORDER BY CASE WHEN device_hostname IS NOT NULL THEN 0 ELSE 1 END, COALESCE(tier, 99) ASC, COALESCE(symptom_rank, 99) ASC, created_at ASC, ticket_id) FILTER (WHERE location IS NOT NULL))[1] AS upstream_location,
        (ARRAY_AGG(device_type ORDER BY CASE WHEN device_hostname IS NOT NULL THEN 0 ELSE 1 END, COALESCE(tier, 99) ASC, COALESCE(symptom_rank, 99) ASC, created_at ASC, ticket_id) FILTER (WHERE device_type IS NOT NULL))[1] AS upstream_device_type,
        (ARRAY_AGG(tier ORDER BY CASE WHEN device_hostname IS NOT NULL THEN 0 ELSE 1 END, COALESCE(tier, 99) ASC, COALESCE(symptom_rank, 99) ASC, created_at ASC, ticket_id) FILTER (WHERE tier IS NOT NULL))[1] AS upstream_tier,
        (ARRAY_AGG(symptom ORDER BY CASE WHEN device_hostname IS NOT NULL THEN 0 ELSE 1 END, COALESCE(tier, 99) ASC, COALESCE(symptom_rank, 99) ASC, created_at ASC, ticket_id) FILTER (WHERE symptom IS NOT NULL))[1] AS upstream_symptom,
        ARRAY_AGG(DISTINCT location) FILTER (WHERE location IS NOT NULL) AS affected_locations,
        ARRAY_AGG(DISTINCT device_hostname) FILTER (WHERE device_hostname IS NOT NULL) AS affected_devices,
        (ARRAY_AGG(ticket_id ORDER BY created_at ASC))[1:50] AS ticket_ids
      FROM clustered
      GROUP BY cluster_id
      HAVING count(DISTINCT location) > 1
      ORDER BY distinct_locations DESC, total_alerts DESC
      LIMIT ${limit};
    `);

    for (const r of stage2Rows) {
      clusters.push({
        cluster_id: `S2-CASCADE-${r.cluster_id}`,
        stage: "stage2_cascading",
        location: r.upstream_location || null,
        total_alerts: Number(r.total_alerts),
        distinct_devices: Number(r.distinct_devices),
        distinct_locations: Number(r.distinct_locations),
        started_at: r.started_at instanceof Date ? r.started_at.toISOString() : String(r.started_at),
        ended_at: r.ended_at instanceof Date ? r.ended_at.toISOString() : String(r.ended_at),
        root_ticket_id: r.root_ticket_id,
        upstream_device: r.upstream_device || "unknown",
        upstream_device_type: r.upstream_device_type || null,
        upstream_tier: r.upstream_tier !== null ? Number(r.upstream_tier) : null,
        upstream_symptom: r.upstream_symptom || null,
        affected_devices: r.affected_devices || [],
        affected_locations: r.affected_locations || [],
        ticket_ids: r.ticket_ids || [],
      });
    }
  }

  return clusters;
}

export async function getCorrelationEvents(
  filters: CorrelationEventFilters = {},
): Promise<CorrelationEventsResult> {
  const limit = Math.min(Math.max(filters.limit ?? 50, 1), 500);
  const offset = Math.max(filters.offset ?? 0, 0);
  const windowSec = sanitizeWindowSeconds(filters.windowSeconds);
  const stage = filters.stage || "all";

  const from = filters.from || null;
  const to = filters.to || null;
  const site = filters.site?.trim() || null;
  const device = filters.device?.trim() || null;
  const team = filters.team?.trim() || null;
  const deviceType = filters.deviceType?.trim() || null;

  let clusters: CorrelatedClusterItem[] | undefined;
  if (filters.view === "clusters") {
    clusters = await getCorrelationClusters(filters);
  }

  const rows = await db.execute<{
    ticket_id: string | null;
    created_at: Date | string | null;
    location: string | null;
    device_hostname: string | null;
    device_type: string | null;
    tier: number | null;
    interface_name: string | null;
    subject: string | null;
    symptom: string | null;
    symptom_rank: number | null;
    source_department: string | null;
    recommended_team: string | null;
    is_repeat: boolean | null;
    repeat_count: number | null;
    auto_closed: boolean | null;
    incident_id: string | null;
    is_root_trigger: boolean | null;

    // Enriched correlation fields
    correlation_stage: "stage1_same_location" | "stage2_cascading" | "single_device";
    is_upstream_root: boolean | null;
    correlated_upstream_device: string | null;
    stage1_device_count: number | null;
    stage2_site_count: number | null;

    // Summary metrics
    total: number;
    distinct_tickets: number;
    total_with_device: number;
    total_with_location: number;
    total_with_interface: number;
    total_repeats: number;
    total_auto_closed: number;
    total_in_incidents: number;
    total_stage1_correlated: number;
    total_stage2_cascading: number;
    total_upstream_roots: number;
  }>(sql`
    WITH base AS (
      SELECT
        e.alert_id AS ticket_id,
        e.created_at,
        e.site AS location,
        e.host AS device_hostname,
        e.device_type,
        e.tier,
        substring(e.subject FROM 'Interface ([^(: ]+)') AS interface_name,
        e.subject,
        e.symptom,
        e.symptom_rank,
        e.department AS source_department,
        COALESCE(
          tr.team,
          CASE
            WHEN e.department NOT IN ('RID-BOT', 'Doc Support') THEN e.department
            ELSE 'Needs triage'
          END
        ) AS recommended_team,
        e.is_repeat,
        e.repeat_count,
        e.auto_closed,
        m.incident_id,
        COALESCE(m.is_root, false) AS is_root_trigger
      FROM alert_event e
      LEFT JOIN team_rule tr ON tr.device_type = e.device_type
      LEFT JOIN incident_member m ON m.alert_id = e.alert_id
      WHERE
        (${from}::timestamptz IS NULL OR e.created_at >= ${from}::timestamptz)
        AND (${to}::timestamptz IS NULL OR e.created_at < ${to}::timestamptz)
    ),
    filtered AS (
      SELECT *
      FROM base
      WHERE (${site}::text IS NULL OR location ILIKE '%' || ${site} || '%')
        AND (${device}::text IS NULL OR device_hostname ILIKE '%' || ${device} || '%')
        AND (${team}::text IS NULL OR recommended_team = ${team} OR source_department = ${team})
        AND (${deviceType}::text IS NULL OR device_type = ${deviceType})
    ),
    -- Stage 1: Group alerts at the same site where delta <= windowSec
    stage1_partitioned AS (
      SELECT 
        f.*,
        CASE 
          WHEN location IS NULL THEN 1
          WHEN lag(created_at) OVER (PARTITION BY location ORDER BY created_at, ticket_id) IS NULL
            OR created_at - lag(created_at) OVER (PARTITION BY location ORDER BY created_at, ticket_id) > (${windowSec} || ' seconds')::interval
          THEN 1 ELSE 0 
        END AS is_stage1_start
      FROM filtered f
    ),
    stage1_grouped AS (
      SELECT 
        *,
        CASE 
          WHEN location IS NULL THEN NULL 
          ELSE sum(is_stage1_start) OVER (PARTITION BY location ORDER BY created_at, ticket_id) 
        END AS stage1_group_num
      FROM stage1_partitioned
    ),
    stage1_stats AS (
      SELECT 
        location,
        stage1_group_num,
        count(*)::int AS stage1_total,
        count(DISTINCT device_hostname)::int AS stage1_device_count,
        (ARRAY_AGG(ticket_id ORDER BY CASE WHEN device_hostname IS NOT NULL THEN 0 ELSE 1 END, COALESCE(tier, 99) ASC, COALESCE(symptom_rank, 99) ASC, created_at ASC, ticket_id))[1] AS stage1_root_id,
        (ARRAY_AGG(device_hostname ORDER BY CASE WHEN device_hostname IS NOT NULL THEN 0 ELSE 1 END, COALESCE(tier, 99) ASC, COALESCE(symptom_rank, 99) ASC, created_at ASC, ticket_id) FILTER (WHERE device_hostname IS NOT NULL))[1] AS stage1_upstream_host
      FROM stage1_grouped
      WHERE location IS NOT NULL AND stage1_group_num IS NOT NULL
      GROUP BY location, stage1_group_num
    ),
    -- Stage 2: Time clusters across any location where delta <= windowSec
    stage2_partitioned AS (
      SELECT 
        f.ticket_id,
        f.created_at,
        CASE 
          WHEN lag(f.created_at) OVER (ORDER BY f.created_at, f.ticket_id) IS NULL
            OR f.created_at - lag(f.created_at) OVER (ORDER BY f.created_at, f.ticket_id) > (${windowSec} || ' seconds')::interval
          THEN 1 ELSE 0 
        END AS is_stage2_start
      FROM filtered f
    ),
    stage2_grouped AS (
      SELECT 
        ticket_id,
        sum(is_stage2_start) OVER (ORDER BY created_at, ticket_id) AS stage2_group_num
      FROM stage2_partitioned
    ),
    stage2_stats AS (
      SELECT 
        s2g.stage2_group_num,
        count(*)::int AS stage2_total,
        count(DISTINCT f.location)::int AS stage2_site_count,
        count(DISTINCT f.device_hostname)::int AS stage2_device_count,
        (ARRAY_AGG(f.ticket_id ORDER BY CASE WHEN f.device_hostname IS NOT NULL THEN 0 ELSE 1 END, COALESCE(f.tier, 99) ASC, COALESCE(f.symptom_rank, 99) ASC, f.created_at ASC, f.ticket_id))[1] AS stage2_root_id,
        (ARRAY_AGG(f.device_hostname ORDER BY CASE WHEN f.device_hostname IS NOT NULL THEN 0 ELSE 1 END, COALESCE(f.tier, 99) ASC, COALESCE(f.symptom_rank, 99) ASC, f.created_at ASC, f.ticket_id) FILTER (WHERE f.device_hostname IS NOT NULL))[1] AS stage2_upstream_host
      FROM stage2_grouped s2g
      JOIN filtered f ON f.ticket_id = s2g.ticket_id
      GROUP BY s2g.stage2_group_num
    ),
    enriched AS (
      SELECT 
        g.*,
        COALESCE(s1.stage1_total, 1) AS stage1_total,
        COALESCE(s1.stage1_device_count, 1) AS stage1_device_count,
        s1.stage1_root_id,
        s1.stage1_upstream_host,
        COALESCE(s2s.stage2_total, 1) AS stage2_total,
        COALESCE(s2s.stage2_site_count, 1) AS stage2_site_count,
        COALESCE(s2s.stage2_device_count, 1) AS stage2_device_count,
        s2s.stage2_root_id,
        s2s.stage2_upstream_host,
        -- Correlation classification
        CASE 
          WHEN COALESCE(s2s.stage2_site_count, 1) > 1 THEN 'stage2_cascading'
          WHEN COALESCE(s1.stage1_device_count, 1) > 1 THEN 'stage1_same_location'
          ELSE 'single_device'
        END AS correlation_stage,
        -- Root cause / upstream flag
        CASE 
          WHEN COALESCE(s2s.stage2_site_count, 1) > 1 AND s2s.stage2_root_id = g.ticket_id THEN true
          WHEN COALESCE(s1.stage1_device_count, 1) > 1 AND s1.stage1_root_id = g.ticket_id THEN true
          ELSE false
        END AS is_upstream_root,
        -- Upstream device
        CASE 
          WHEN COALESCE(s2s.stage2_site_count, 1) > 1 THEN s2s.stage2_upstream_host
          WHEN COALESCE(s1.stage1_device_count, 1) > 1 THEN s1.stage1_upstream_host
          ELSE NULL
        END AS correlated_upstream_device
      FROM stage1_grouped g
      LEFT JOIN stage1_stats s1 ON s1.location = g.location AND s1.stage1_group_num = g.stage1_group_num
      LEFT JOIN stage2_grouped s2 ON s2.ticket_id = g.ticket_id
      LEFT JOIN stage2_stats s2s ON s2s.stage2_group_num = s2.stage2_group_num
    ),
    stage_filtered AS (
      SELECT *
      FROM enriched
      WHERE 
        (${stage}::text = 'all')
        OR (${stage}::text = 'stage1' AND (correlation_stage = 'stage1_same_location' OR is_upstream_root))
        OR (${stage}::text = 'stage2' AND correlation_stage = 'stage2_cascading')
        OR (${stage}::text = 'upstream_root' AND is_upstream_root)
    ),
    summary AS (
      SELECT
        count(*)::int AS total,
        count(DISTINCT ticket_id)::int AS distinct_tickets,
        count(device_hostname)::int AS total_with_device,
        count(location)::int AS total_with_location,
        count(interface_name)::int AS total_with_interface,
        count(*) FILTER (WHERE is_repeat)::int AS total_repeats,
        count(*) FILTER (WHERE auto_closed)::int AS total_auto_closed,
        count(*) FILTER (WHERE incident_id IS NOT NULL)::int AS total_in_incidents,
        count(*) FILTER (WHERE correlation_stage = 'stage1_same_location')::int AS total_stage1_correlated,
        count(*) FILTER (WHERE correlation_stage = 'stage2_cascading')::int AS total_stage2_cascading,
        count(*) FILTER (WHERE is_upstream_root)::int AS total_upstream_roots
      FROM stage_filtered
    ),
    paginated AS (
      SELECT *
      FROM stage_filtered
      ORDER BY created_at DESC, location NULLS LAST, device_hostname NULLS LAST, ticket_id
      LIMIT ${limit}
      OFFSET ${offset}
    )
    SELECT
      p.*,
      s.total,
      s.distinct_tickets,
      s.total_with_device,
      s.total_with_location,
      s.total_with_interface,
      s.total_repeats,
      s.total_auto_closed,
      s.total_in_incidents,
      s.total_stage1_correlated,
      s.total_stage2_cascading,
      s.total_upstream_roots
    FROM summary s
    LEFT JOIN paginated p ON true;
  `);

  if (!rows || rows.length === 0 || !rows[0] || Number(rows[0].total ?? 0) === 0) {
    return {
      summary: {
        total: 0,
        distinctTickets: 0,
        withDevice: 0,
        withLocation: 0,
        withInterface: 0,
        repeats: 0,
        autoClosed: 0,
        inIncidents: 0,
        stage1Correlated: 0,
        stage2Cascading: 0,
        upstreamRoots: 0,
      },
      limit,
      offset,
      windowSeconds: windowSec,
      stage,
      items: [],
      clusters,
    };
  }

  const first = rows[0];
  const summary: CorrelationSummary = {
    total: Number(first.total ?? 0),
    distinctTickets: Number(first.distinct_tickets ?? 0),
    withDevice: Number(first.total_with_device ?? 0),
    withLocation: Number(first.total_with_location ?? 0),
    withInterface: Number(first.total_with_interface ?? 0),
    repeats: Number(first.total_repeats ?? 0),
    autoClosed: Number(first.total_auto_closed ?? 0),
    inIncidents: Number(first.total_in_incidents ?? 0),
    stage1Correlated: Number(first.total_stage1_correlated ?? 0),
    stage2Cascading: Number(first.total_stage2_cascading ?? 0),
    upstreamRoots: Number(first.total_upstream_roots ?? 0),
  };

  const items: CorrelationEventItem[] = rows
    .filter((row): row is typeof row & { ticket_id: string } => Boolean(row.ticket_id))
    .map((row) => ({
      ticket_id: row.ticket_id,
      created_at: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at ?? ""),
      location: row.location ?? null,
      device_hostname: row.device_hostname ?? null,
      interface_name: row.interface_name ?? null,
      device_type: row.device_type ?? null,
      tier: row.tier !== null ? Number(row.tier) : null,
      symptom: row.symptom ?? null,
      symptom_rank: row.symptom_rank !== null ? Number(row.symptom_rank) : null,
      source_department: row.source_department ?? null,
      recommended_team: row.recommended_team ?? "Needs triage",
      is_root_trigger: Boolean(row.is_root_trigger),
      incident_id: row.incident_id ?? null,
      subject: row.subject ?? null,
      is_repeat: Boolean(row.is_repeat),
      repeat_count: Number(row.repeat_count ?? 0),
      auto_closed: Boolean(row.auto_closed),

      // Multi-stage & Upstream correlation outputs
      correlation_stage: row.correlation_stage || "single_device",
      is_upstream_root: Boolean(row.is_upstream_root),
      correlated_upstream_device: row.correlated_upstream_device ?? null,
      stage1_device_count: Number(row.stage1_device_count ?? 1),
      stage2_site_count: Number(row.stage2_site_count ?? 1),
      window_seconds: windowSec,
    }));

  return {
    summary,
    limit,
    offset,
    windowSeconds: windowSec,
    stage,
    items,
    clusters,
  };
}
