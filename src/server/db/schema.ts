import {
  bigint,
  bigserial,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const sourceRowId = () =>
  bigint("source_row_id", { mode: "number" }).primaryKey();

const sourceRecord = () =>
  jsonb("source_record").$type<Record<string, unknown>>().notNull();

const sourceTimestamp = (name: string) =>
  timestamp(name, { withTimezone: true, mode: "date" });

export const msolveIncident = pgTable(
  "msolve_incident",
  {
    sourceRowId: sourceRowId(),
    sourceFile: text("source_file"),
    sourceRowNumber: integer("source_row_number"),
    ticketId: text("ticket_id").notNull(),
    correlationId: text("correlation_id"),
    createdOn: sourceTimestamp("created_on").notNull(),
    priority: text("priority"),
    callerId: text("caller_id"),
    callerCompany: text("caller_company"),
    callerLocation: text("caller_location"),
    contactType: text("contact_type"),
    subject: text("subject"),
    description: text("description"),
    businessImpact: text("business_impact"),
    impactedStakeholdersLocations: text("impacted_stakeholders_locations"),
    state: text("state"),
    category: text("category"),
    subcategory: text("subcategory"),
    assignmentGroup: text("assignment_group"),
    assignedTo: text("assigned_to"),
    assignmentCoe: text("assignment_coe"),
    assignmentVertical: text("assignment_vertical"),
    resolvedAt: sourceTimestamp("resolved_at"),
    closeCode: text("close_code"),
    closeNotes: text("close_notes"),
    closedAt: sourceTimestamp("closed_at"),
    sourceRecord: sourceRecord(),
  },
  (table) => [
    index("idx_msolve_incident_ticket_id").on(table.ticketId),
    index("idx_msolve_incident_correlation_id").on(table.correlationId),
    index("idx_msolve_incident_created_on").on(table.createdOn),
  ],
);

export const msolveSr = pgTable(
  "msolve_sr",
  {
    sourceRowId: sourceRowId(),
    sourceFile: text("source_file"),
    sourceRowNumber: integer("source_row_number"),
    ticketId: text("ticket_id").notNull(),
    correlationId: text("correlation_id"),
    catalogItem: text("catalog_item"),
    stage: text("stage"),
    request: text("request"),
    assignmentCluster: text("assignment_cluster"),
    requestedFor: text("requested_for"),
    requestedForUsername: text("requested_for_username"),
    requestOpenedBy: text("request_opened_by"),
    dueDate: sourceTimestamp("due_date"),
    quantity: text("quantity"),
    requestRequestedFor: text("request_requested_for"),
    requestedForLocation: text("requested_for_location"),
    openedBy: text("opened_by"),
    openedByLocation: text("opened_by_location"),
    assignedTo: text("assigned_to"),
    assignmentGroup: text("assignment_group"),
    sourceRecord: sourceRecord(),
  },
  (table) => [
    index("idx_msolve_sr_ticket_id").on(table.ticketId),
    index("idx_msolve_sr_correlation_id").on(table.correlationId),
  ],
);

export const alfaTicket = pgTable(
  "alfa_ticket",
  {
    sourceRowId: sourceRowId(),
    sourceFile: text("source_file"),
    sourceSheet: text("source_sheet").notNull(),
    sourceRowNumber: integer("source_row_number"),
    ticketId: text("ticket_id").notNull(),
    ticketPrefix: text("ticket_prefix"),
    ticketNumber: text("ticket_number"),
    subject: text("subject"),
    createdOn: sourceTimestamp("created_on").notNull(),
    closedOn: sourceTimestamp("closed_on"),
    executionStatus: text("execution_status"),
    priority: text("priority"),
    department: text("department"),
    ticketType: text("ticket_type"),
    ticketOwner: text("ticket_owner"),
    createdBy: text("created_by"),
    resolvedHours: text("resolved_hours"),
    slaTargetMinutes: text("sla_target_minutes"),
    slaMet: text("sla_met"),
    status: text("status"),
    closedBy: text("closed_by"),
    slaResolved: text("sla_resolved"),
    sourceRecord: sourceRecord(),
  },
  (table) => [
    index("idx_alfa_ticket_ticket_id").on(table.ticketId),
    index("idx_alfa_ticket_prefix_number").on(
      table.ticketPrefix,
      table.ticketNumber,
    ),
    index("idx_alfa_ticket_created_on").on(table.createdOn),
    index("idx_alfa_ticket_subject").on(table.subject),
  ],
);

export const ticketLink = pgTable(
  "ticket_link",
  {
    linkId: bigserial("link_id", { mode: "number" }).primaryKey(),
    msolveTicketId: text("msolve_ticket_id").notNull(),
    alfaTicketId: text("alfa_ticket_id").notNull(),
    matchMethod: text("match_method").notNull(),
    confidence: text("confidence").notNull(),
    timeDifferenceSeconds: numeric("time_difference_seconds"),
    evidence: jsonb("evidence")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    createdAt: sourceTimestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("uq_ticket_link_pair").on(
      table.msolveTicketId,
      table.alfaTicketId,
    ),
    index("idx_ticket_link_msolve_id").on(table.msolveTicketId),
    index("idx_ticket_link_alfa_id").on(table.alfaTicketId),
  ],
);