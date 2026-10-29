DROP TABLE IF EXISTS incident_member;
DROP TABLE IF EXISTS incident;
DROP TABLE IF EXISTS alert_event;

CREATE TABLE alert_event (
  id serial PRIMARY KEY,
  alert_id text NOT NULL UNIQUE,
  prefix text,
  subject text,
  department text,
  ticket_type text,
  closed_by text,
  source_sheet text NOT NULL,
  created_at timestamptz NOT NULL,
  site text,
  host text,
  ip text,
  subnet text,
  device_type text,
  tier integer,
  symptom text,
  symptom_rank integer,
  is_repeat boolean NOT NULL DEFAULT false,
  repeat_count integer NOT NULL DEFAULT 0
);

INSERT INTO alert_event (alert_id, prefix, subject, department, ticket_type, closed_by, source_sheet, created_at)
SELECT DISTINCT ON (alert_id)
  alert_id,
  substring(alert_id FROM '^[A-Z]+'),
  subject,
  department,
  ticket_type,
  closed_by,
  source_sheet,
  created_at
FROM (
  SELECT trim(ticket_id) AS alert_id, trim(subject) AS subject, trim(department) AS department,
         trim(ticket_type) AS ticket_type, NULL::text AS closed_by, 'open' AS source_sheet, 1 AS sheet_rank,
         created_on::timestamp AT TIME ZONE 'Asia/Kolkata' AS created_at
  FROM alert_open_raw
  UNION ALL
  SELECT trim(ticket_id), trim(subject), trim(department), trim(ticket_type), NULL, 'resolved', 2,
         created_on::timestamp AT TIME ZONE 'Asia/Kolkata'
  FROM alert_resolved_raw
  UNION ALL
  SELECT trim(ticket_id), trim(subject), trim(department), trim(ticket_type), trim(closed_by), 'closed', 3,
         created_on::timestamptz
  FROM alert_closed_raw
) u
WHERE created_at >= timestamptz '2026-10-01 00:00:00+05:30'
  AND alert_id !~ '^SR'
ORDER BY alert_id, sheet_rank DESC, created_at DESC;

CREATE INDEX alert_event_created_at_idx ON alert_event (created_at);

SELECT count(*) AS alert_events,
       min(created_at AT TIME ZONE 'Asia/Kolkata') AS first_ist,
       max(created_at AT TIME ZONE 'Asia/Kolkata') AS last_ist,
       count(*) FILTER (WHERE alert_id ~ '^SR') AS service_requests_left,
       CASE WHEN count(*) = count(DISTINCT alert_id) THEN 'OK' ELSE 'FAIL' END AS unique_check
FROM alert_event;

SELECT prefix, count(*) AS row_count FROM alert_event GROUP BY prefix ORDER BY row_count DESC;

SELECT source_sheet, count(*) AS row_count FROM alert_event GROUP BY source_sheet ORDER BY source_sheet;
