DROP TABLE IF EXISTS stage_msolve_incident, stage_msolve_sr, stage_alfa_open, stage_alfa_resolved, stage_alfa_closed;

CREATE TEMP TABLE stage_msolve_incident (
  stage_row serial,
  "number" text, "correlation_id" text, "sys_created_on" text, "priority" text, "caller_id" text,
  "caller_id.company" text, "caller_id.location" text, "contact_type" text, "short_description" text,
  "description" text, "business_impact" text, "u_impacted_stake_holders_and_locations" text, "state" text,
  "category" text, "subcategory" text, "assignment_group" text, "assigned_to" text,
  "assignment_group.u_coe" text, "assignment_group.u_vertical" text, "resolved_at" text,
  "close_code" text, "close_notes" text, "closed_at" text
);

CREATE TEMP TABLE stage_msolve_sr (
  stage_row serial,
  "number" text, "correlation_id" text, "cat_item" text, "stage" text, "request" text,
  "assignment_group.u_cluster" text, "requested_for" text, "requested_for.user_name" text,
  "request.opened_by" text, "due_date" text, "quantity" text, "request.requested_for" text,
  "requested_for.location" text, "opened_by" text, "opened_by.u_location1" text, "assigned_to" text,
  "assignment_group" text
);

CREATE TEMP TABLE stage_alfa_open (
  stage_row serial,
  "Ticket ID" text, "Subject" text, "Created On" text, "Execution Status" text, "Priority" text,
  "Department" text, "Ticket Type" text, "Ticket Owner" text, "Created By" text,
  "ResolvedHours(HH:MM)" text, "SLA Target(minutes)" text, "SLA Met" text, "Status" text
);

CREATE TEMP TABLE stage_alfa_resolved (
  stage_row serial,
  "Ticket ID" text, "Subject" text, "Created On" text, "Execution Status" text, "Priority" text,
  "Department" text, "Ticket Type" text, "Ticket Owner" text, "Created By" text,
  "ResolvedHours(HH:MM)" text, "SLA Target(minutes)" text, "SLA Met" text, "Status" text
);

CREATE TEMP TABLE stage_alfa_closed (
  stage_row serial,
  "Ticket ID" text, "Subject" text, "Created On" text, "Priority" text, "Ticket Type" text,
  "Closed On" text, "Closed By" text, "Department" text, "Ticket Owner" text, "SLA Resolved" text
);

\copy stage_msolve_incident ("number", "correlation_id", "sys_created_on", "priority", "caller_id", "caller_id.company", "caller_id.location", "contact_type", "short_description", "description", "business_impact", "u_impacted_stake_holders_and_locations", "state", "category", "subcategory", "assignment_group", "assigned_to", "assignment_group.u_coe", "assignment_group.u_vertical", "resolved_at", "close_code", "close_notes", "closed_at") FROM '../data-csv/msolve_incident.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8')
\copy stage_msolve_sr ("number", "correlation_id", "cat_item", "stage", "request", "assignment_group.u_cluster", "requested_for", "requested_for.user_name", "request.opened_by", "due_date", "quantity", "request.requested_for", "requested_for.location", "opened_by", "opened_by.u_location1", "assigned_to", "assignment_group") FROM '../data-csv/msolve_sr.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8')
\copy stage_alfa_open ("Ticket ID", "Subject", "Created On", "Execution Status", "Priority", "Department", "Ticket Type", "Ticket Owner", "Created By", "ResolvedHours(HH:MM)", "SLA Target(minutes)", "SLA Met", "Status") FROM '../data-csv/alert_open.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8')
\copy stage_alfa_resolved ("Ticket ID", "Subject", "Created On", "Execution Status", "Priority", "Department", "Ticket Type", "Ticket Owner", "Created By", "ResolvedHours(HH:MM)", "SLA Target(minutes)", "SLA Met", "Status") FROM '../data-csv/alert_resolved.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8')
\copy stage_alfa_closed ("Ticket ID", "Subject", "Created On", "Priority", "Ticket Type", "Closed On", "Closed By", "Department", "Ticket Owner", "SLA Resolved") FROM '../data-csv/alert_closed.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8')

TRUNCATE raw_msolve_incidents, raw_msolve_service_requests, raw_alfa_tickets RESTART IDENTITY;

INSERT INTO raw_msolve_incidents (source_file, source_sheet, source_row_number, record_json)
SELECT 'msolve_incident.csv', '', stage_row + 1, to_jsonb(s) - 'stage_row'
FROM stage_msolve_incident s
ORDER BY stage_row;

INSERT INTO raw_msolve_service_requests (source_file, source_sheet, source_row_number, record_json)
SELECT 'msolve_sr.csv', '', stage_row + 1, to_jsonb(s) - 'stage_row'
FROM stage_msolve_sr s
ORDER BY stage_row;

INSERT INTO raw_alfa_tickets (source_file, source_sheet, source_row_number, record_json)
SELECT 'alert_open.csv', 'Open Tickets_Oct 26', stage_row + 1, to_jsonb(s) - 'stage_row'
FROM stage_alfa_open s
ORDER BY stage_row;

INSERT INTO raw_alfa_tickets (source_file, source_sheet, source_row_number, record_json)
SELECT 'alert_resolved.csv', 'Resolved Tickets_Oct 26', stage_row + 1, to_jsonb(s) - 'stage_row'
FROM stage_alfa_resolved s
ORDER BY stage_row;

INSERT INTO raw_alfa_tickets (source_file, source_sheet, source_row_number, record_json)
SELECT 'alert_closed.csv', 'Closed Tickets_Oct 26', stage_row + 1, to_jsonb(s) - 'stage_row'
FROM stage_alfa_closed s
ORDER BY stage_row;

SELECT 'raw_msolve_incidents' AS table_name, count(*) AS row_count,
       CASE WHEN count(*) = 2573 THEN 'OK' ELSE 'FAIL' END AS check
FROM raw_msolve_incidents
UNION ALL
SELECT 'raw_msolve_service_requests', count(*), CASE WHEN count(*) = 641 THEN 'OK' ELSE 'FAIL' END
FROM raw_msolve_service_requests
UNION ALL
SELECT 'raw_alfa_tickets', count(*), CASE WHEN count(*) = 56713 THEN 'OK' ELSE 'FAIL' END
FROM raw_alfa_tickets;
