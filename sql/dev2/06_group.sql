DROP TABLE IF EXISTS incident_member;
DROP TABLE IF EXISTS incident;

CREATE TABLE incident (
  id text PRIMARY KEY,
  site text NOT NULL,
  started_at timestamptz NOT NULL,
  ended_at timestamptz NOT NULL,
  member_count integer NOT NULL,
  repeat_total integer NOT NULL DEFAULT 0,
  root_alert_id text,
  primary_team text,
  supporting_teams text,
  teams_today integer,
  confidence text,
  confidence_reason text,
  explanation_template text,
  explanation_ai text,
  ai_model text
);

CREATE TABLE incident_member (
  incident_id text NOT NULL REFERENCES incident (id) ON DELETE CASCADE,
  alert_id text NOT NULL REFERENCES alert_event (alert_id),
  reason text,
  is_root boolean NOT NULL DEFAULT false,
  PRIMARY KEY (incident_id, alert_id)
);

CREATE TEMP TABLE alert_group AS
WITH ordered AS (
  SELECT id, alert_id, site, created_at, is_repeat,
         CASE
           WHEN lag(created_at) OVER w IS NULL
             OR created_at - lag(created_at) OVER w > interval '15 minutes'
           THEN 1 ELSE 0
         END AS is_new_group
  FROM alert_event
  WHERE site IS NOT NULL
  WINDOW w AS (PARTITION BY site ORDER BY created_at, id)
)
SELECT id, alert_id, site, created_at, is_repeat,
       sum(is_new_group) OVER (PARTITION BY site ORDER BY created_at, id) AS group_no
FROM ordered;

CREATE TEMP TABLE group_summary AS
SELECT site, group_no,
       min(created_at) AS started_at,
       max(created_at) AS ended_at,
       count(*) FILTER (WHERE NOT is_repeat) AS member_count,
       count(*) FILTER (WHERE is_repeat) AS repeat_total,
       site || '-' || to_char(min(created_at) AT TIME ZONE 'Asia/Kolkata', 'YYYYMMDD-HH24MI') AS incident_id
FROM alert_group
GROUP BY site, group_no
HAVING count(*) FILTER (WHERE NOT is_repeat) >= 2;

INSERT INTO incident (id, site, started_at, ended_at, member_count, repeat_total)
SELECT incident_id, site, started_at, ended_at, member_count, repeat_total
FROM group_summary;

INSERT INTO incident_member (incident_id, alert_id)
SELECT s.incident_id, g.alert_id
FROM alert_group g
JOIN group_summary s ON s.site = g.site AND s.group_no = g.group_no;

CREATE INDEX incident_member_alert_idx ON incident_member (alert_id);
CREATE INDEX incident_started_idx ON incident (started_at);

SELECT (SELECT count(*) FROM incident) AS incidents,
       (SELECT sum(member_count) FROM incident) AS unique_members,
       (SELECT sum(repeat_total) FROM incident) AS repeats_inside,
       (SELECT count(*) FROM alert_group WHERE NOT is_repeat) - (SELECT sum(member_count) FROM incident) AS single_alerts,
       (SELECT count(*) FROM alert_event WHERE site IS NULL) AS no_site_alerts,
       CASE WHEN (SELECT count(*) FROM incident_member) = (SELECT sum(member_count + repeat_total) FROM incident) THEN 'OK' ELSE 'FAIL' END AS member_check;

SELECT id, member_count, repeat_total,
       to_char(started_at AT TIME ZONE 'Asia/Kolkata', 'DD-Mon HH24:MI') AS start_ist,
       to_char(ended_at AT TIME ZONE 'Asia/Kolkata', 'DD-Mon HH24:MI') AS end_ist
FROM incident
ORDER BY member_count DESC
LIMIT 10;

SELECT id, member_count, repeat_total,
       to_char(started_at AT TIME ZONE 'Asia/Kolkata', 'DD-Mon HH24:MI') AS start_ist,
       to_char(ended_at AT TIME ZONE 'Asia/Kolkata', 'DD-Mon HH24:MI') AS end_ist
FROM incident
WHERE (site = 'NAGP1' AND started_at::date BETWEEN '2026-10-11' AND '2026-10-11' AND started_at AT TIME ZONE 'Asia/Kolkata' BETWEEN '2026-10-11 09:45' AND '2026-10-11 10:30')
   OR (site = 'RDPPL' AND started_at AT TIME ZONE 'Asia/Kolkata' BETWEEN '2026-10-11 17:30' AND '2026-10-11 18:15')
   OR (site = 'IGTPL' AND started_at AT TIME ZONE 'Asia/Kolkata' BETWEEN '2026-10-10 06:00' AND '2026-10-10 06:45')
   OR (site = 'NET-10.151.103' AND started_at AT TIME ZONE 'Asia/Kolkata' BETWEEN '2026-10-04 01:00' AND '2026-10-04 01:45')
ORDER BY started_at;
