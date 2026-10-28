import { and, asc, count, desc, eq, ilike, isNotNull, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "@/server/db";
import { alertEvent, incident, incidentFeedback, incidentMember } from "@/server/db/incidents-schema";

export type IncidentFilters = {
  site?: string;
  confidence?: string;
  team?: string;
  date?: string;
  sort?: "size" | "confidence";
  limit?: number;
  offset?: number;
};

export type Verdict = "correct" | "wrong" | "split";

export async function listIncidents(filters: IncidentFilters = {}) {
  const where: SQL[] = [];
  if (filters.site) where.push(ilike(incident.site, `%${filters.site}%`));
  if (filters.confidence) where.push(eq(incident.confidence, filters.confidence));
  if (filters.team) where.push(eq(incident.primaryTeam, filters.team));
  if (filters.date) where.push(sql`(${incident.startedAt} AT TIME ZONE 'Asia/Kolkata')::date = ${filters.date}::date`);
  const condition = where.length ? and(...where) : undefined;

  const limit = Math.min(Math.max(filters.limit ?? 50, 1), 500);
  const offset = Math.max(filters.offset ?? 0, 0);

  const [counted] = await db
    .select({ total: count(), alerts: sql<number>`coalesce(sum(${incident.memberCount} + ${incident.repeatTotal}), 0)::int` })
    .from(incident)
    .where(condition);
  const total = counted?.total ?? 0;
  const alerts = counted?.alerts ?? 0;

  const confidenceOrder = sql`CASE ${incident.confidence} WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END`;
  const order =
    filters.sort === "confidence"
      ? [confidenceOrder, desc(incident.memberCount), asc(incident.startedAt), asc(incident.id)]
      : [desc(incident.memberCount), asc(incident.startedAt), asc(incident.id)];
  const items = await db
    .select({
      id: incident.id,
      site: incident.site,
      startedAt: incident.startedAt,
      endedAt: incident.endedAt,
      memberCount: incident.memberCount,
      repeatTotal: incident.repeatTotal,
      rootAlertId: incident.rootAlertId,
      rootSubject: alertEvent.subject,
      primaryTeam: incident.primaryTeam,
      supportingTeams: incident.supportingTeams,
      teamsToday: incident.teamsToday,
      confidence: incident.confidence,
      explanationTemplate: incident.explanationTemplate,
      hasAi: sql<boolean>`${incident.explanationAi} IS NOT NULL`,
    })
    .from(incident)
    .leftJoin(alertEvent, eq(alertEvent.alertId, incident.rootAlertId))
    .where(condition)
    .orderBy(...order)
    .limit(limit)
    .offset(offset);

  return { total, alerts, limit, offset, items };
}

export async function listTeams() {
  const rows = await db
    .selectDistinct({ team: incident.primaryTeam })
    .from(incident)
    .where(isNotNull(incident.primaryTeam))
    .orderBy(asc(incident.primaryTeam));
  return rows.map((r) => r.team as string);
}

export async function getIncident(id: string) {
  const [row] = await db.select().from(incident).where(eq(incident.id, id));
  if (!row) return null;

  const head = alias(alertEvent, "head");
  const members = await db
    .select({
      alertId: alertEvent.alertId,
      createdAt: alertEvent.createdAt,
      subject: alertEvent.subject,
      host: alertEvent.host,
      site: alertEvent.site,
      deviceType: alertEvent.deviceType,
      tier: alertEvent.tier,
      symptom: alertEvent.symptom,
      department: alertEvent.department,
      closedBy: alertEvent.closedBy,
      autoClosed: alertEvent.autoClosed,
      isRepeat: alertEvent.isRepeat,
      repeatOf: head.alertId,
      isRoot: incidentMember.isRoot,
      reason: incidentMember.reason,
    })
    .from(incidentMember)
    .innerJoin(alertEvent, eq(alertEvent.alertId, incidentMember.alertId))
    .leftJoin(head, eq(head.id, alertEvent.repeatOf))
    .where(eq(incidentMember.incidentId, id))
    .orderBy(asc(alertEvent.createdAt), asc(alertEvent.id));

  const feedback = await db
    .select()
    .from(incidentFeedback)
    .where(eq(incidentFeedback.incidentId, id))
    .orderBy(desc(incidentFeedback.createdAt));

  return { ...row, members, feedback };
}

export async function addFeedback(incidentId: string, verdict: Verdict, note?: string) {
  const [exists] = await db.select({ id: incident.id }).from(incident).where(eq(incident.id, incidentId));
  if (!exists) return null;
  const [saved] = await db
    .insert(incidentFeedback)
    .values({ incidentId, verdict, note: note?.trim() || null })
    .returning();
  return saved;
}

export async function getScorecard() {
  const [compression] = await db.execute<{
    total_alerts: number;
    incidents: number;
    single_alerts: number;
    compression_ratio: number;
    storm_incidents: number;
    storm_alerts: number;
    storm_ratio: number;
    repeats: number;
    repeat_share: number;
  }>(sql`
    SELECT
      (SELECT count(*) FROM alert_event)::int AS total_alerts,
      (SELECT count(*) FROM incident)::int AS incidents,
      (SELECT count(*) FROM alert_event e WHERE NOT e.is_repeat
         AND NOT EXISTS (SELECT 1 FROM incident_member m WHERE m.alert_id = e.alert_id))::int AS single_alerts,
      round((SELECT count(*) FROM alert_event)::numeric / nullif(
        (SELECT count(*) FROM incident) + (SELECT count(*) FROM alert_event e WHERE NOT e.is_repeat
          AND NOT EXISTS (SELECT 1 FROM incident_member m WHERE m.alert_id = e.alert_id)), 0), 2)::float AS compression_ratio,
      (SELECT count(*) FROM incident WHERE member_count >= 5)::int AS storm_incidents,
      (SELECT coalesce(sum(member_count + repeat_total), 0) FROM incident WHERE member_count >= 5)::int AS storm_alerts,
      round((SELECT sum(member_count + repeat_total)::numeric / nullif(count(*), 0) FROM incident WHERE member_count >= 5), 2)::float AS storm_ratio,
      (SELECT count(*) FROM alert_event WHERE is_repeat)::int AS repeats,
      round(100.0 * (SELECT count(*) FROM alert_event WHERE is_repeat) / nullif((SELECT count(*) FROM alert_event), 0), 1)::float AS repeat_share
  `);

  const [teams] = await db.execute<{ teams_touched: number; teams_recommended: number; teams_avoided: number; avoided_pct: number }>(sql`
    SELECT coalesce(sum(teams_today), 0)::int AS teams_touched,
           count(*) FILTER (WHERE teams_today > 0)::int AS teams_recommended,
           coalesce(sum(greatest(teams_today - 1, 0)), 0)::int AS teams_avoided,
           round(100.0 * sum(greatest(teams_today - 1, 0)) / nullif(sum(teams_today), 0), 1)::float AS avoided_pct
    FROM incident
  `);

  const [agreement] = await db.execute<{ compared: number; agreed: number; agreement_pct: number }>(sql`
    SELECT count(*)::int AS compared,
           count(*) FILTER (WHERE i.primary_team = e.department)::int AS agreed,
           round(100.0 * count(*) FILTER (WHERE i.primary_team = e.department) / nullif(count(*), 0), 1)::float AS agreement_pct
    FROM incident i
    JOIN alert_event e ON e.alert_id = i.root_alert_id
    WHERE e.department IS NOT NULL AND e.department NOT IN ('RID-BOT', 'Doc Support')
  `);

  const disagreements = await db.execute<{
    id: string;
    site: string;
    member_count: number;
    primary_team: string;
    root_department: string;
    confidence: string;
  }>(sql`
    SELECT i.id, i.site, i.member_count, i.primary_team, e.department AS root_department, i.confidence
    FROM incident i
    JOIN alert_event e ON e.alert_id = i.root_alert_id
    WHERE e.department IS NOT NULL AND e.department NOT IN ('RID-BOT', 'Doc Support')
      AND i.primary_team IS DISTINCT FROM e.department
    ORDER BY i.member_count DESC, i.id
    LIMIT 100
  `);

  const confidence = await db
    .select({ confidence: incident.confidence, incidents: count() })
    .from(incident)
    .groupBy(incident.confidence)
    .orderBy(asc(incident.confidence));

  const feedback = await db
    .select({ verdict: incidentFeedback.verdict, count: count() })
    .from(incidentFeedback)
    .groupBy(incidentFeedback.verdict)
    .orderBy(asc(incidentFeedback.verdict));

  return {
    compression,
    teams,
    agreement: { ...agreement, disagreements: [...disagreements] },
    confidence,
    feedback,
    note: "Precision and recall need engineer review of sampled incidents (solution.md section 11).",
  };
}
