import { boolean, integer, pgTable, primaryKey, serial, text, timestamp } from "drizzle-orm/pg-core";

export const alertEvent = pgTable("alert_event", {
  id: serial("id").primaryKey(),
  alertId: text("alert_id").notNull().unique(),
  prefix: text("prefix"),
  subject: text("subject"),
  department: text("department"),
  ticketType: text("ticket_type"),
  closedBy: text("closed_by"),
  sourceSheet: text("source_sheet").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  site: text("site"),
  host: text("host"),
  ip: text("ip"),
  subnet: text("subnet"),
  deviceType: text("device_type"),
  tier: integer("tier"),
  symptom: text("symptom"),
  symptomRank: integer("symptom_rank"),
  isRepeat: boolean("is_repeat").notNull(),
  repeatCount: integer("repeat_count").notNull(),
  autoClosed: boolean("auto_closed").notNull(),
  repeatOf: integer("repeat_of"),
});

export const incident = pgTable("incident", {
  id: text("id").primaryKey(),
  site: text("site").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  endedAt: timestamp("ended_at", { withTimezone: true }).notNull(),
  memberCount: integer("member_count").notNull(),
  repeatTotal: integer("repeat_total").notNull(),
  rootAlertId: text("root_alert_id"),
  primaryTeam: text("primary_team"),
  supportingTeams: text("supporting_teams"),
  teamsToday: integer("teams_today"),
  confidence: text("confidence"),
  confidenceReason: text("confidence_reason"),
  explanationTemplate: text("explanation_template"),
  explanationAi: text("explanation_ai"),
  aiModel: text("ai_model"),
});

export const incidentMember = pgTable(
  "incident_member",
  {
    incidentId: text("incident_id").notNull(),
    alertId: text("alert_id").notNull(),
    reason: text("reason"),
    isRoot: boolean("is_root").notNull(),
  },
  (t) => [primaryKey({ columns: [t.incidentId, t.alertId] })],
);

export const incidentFeedback = pgTable("incident_feedback", {
  id: serial("id").primaryKey(),
  incidentId: text("incident_id").notNull(),
  verdict: text("verdict", { enum: ["correct", "wrong", "split"] }).notNull(),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
