DROP TABLE IF EXISTS alert_open_raw;
DROP TABLE IF EXISTS alert_resolved_raw;
DROP TABLE IF EXISTS alert_closed_raw;

CREATE TABLE alert_open_raw (
  ticket_id text,
  subject text,
  created_on text,
  execution_status text,
  priority text,
  department text,
  ticket_type text,
  ticket_owner text,
  created_by text,
  resolved_hours text,
  sla_target text,
  sla_met text,
  status text
);

CREATE TABLE alert_resolved_raw (LIKE alert_open_raw);

CREATE TABLE alert_closed_raw (
  ticket_id text,
  subject text,
  created_on text,
  priority text,
  ticket_type text,
  closed_on text,
  closed_by text,
  department text,
  ticket_owner text,
  sla_resolved text
);
