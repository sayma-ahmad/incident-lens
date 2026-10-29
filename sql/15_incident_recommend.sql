DROP TABLE IF EXISTS team_rule;

CREATE TABLE team_rule (
  device_type text PRIMARY KEY,
  team text NOT NULL
);

INSERT INTO team_rule (device_type, team) VALUES
  ('sdwan_firewall', 'RID-Network'),
  ('core_switch', 'RID-Network'),
  ('access_switch', 'RID-Network'),
  ('access_point', 'RID-Network'),
  ('windows_server', 'RID_Windows'),
  ('linux_server', 'RID_Linux'),
  ('storage', 'RID_Storage');

UPDATE incident_member SET is_root = false, reason = NULL;
UPDATE incident
SET root_alert_id = NULL, primary_team = NULL, supporting_teams = NULL,
    teams_today = NULL, confidence = NULL, confidence_reason = NULL;

WITH ranked AS (
  SELECT m.incident_id, m.alert_id,
         row_number() OVER (
           PARTITION BY m.incident_id
           ORDER BY e.tier, e.symptom_rank, e.created_at, e.id
         ) AS rn
  FROM incident_member m
  JOIN alert_event e ON e.alert_id = m.alert_id
  WHERE NOT e.is_repeat
)
UPDATE incident_member m
SET is_root = true
FROM ranked r
WHERE r.rn = 1 AND m.incident_id = r.incident_id AND m.alert_id = r.alert_id;

UPDATE incident i
SET root_alert_id = m.alert_id
FROM incident_member m
WHERE m.incident_id = i.id AND m.is_root;

UPDATE incident i
SET primary_team = t.team
FROM alert_event e
JOIN team_rule t ON t.device_type = e.device_type
WHERE e.alert_id = i.root_alert_id;

WITH dept_rank AS (
  SELECT m.incident_id, e.department,
         row_number() OVER (PARTITION BY m.incident_id ORDER BY count(*) DESC, e.department) AS rn
  FROM incident_member m
  JOIN alert_event e ON e.alert_id = m.alert_id
  WHERE e.department IS NOT NULL
    AND e.department NOT IN ('RID-BOT', 'Doc Support')
  GROUP BY m.incident_id, e.department
)
UPDATE incident i
SET primary_team = d.department
FROM dept_rank d
WHERE d.incident_id = i.id AND d.rn = 1 AND i.primary_team IS NULL;

UPDATE incident SET primary_team = 'Needs triage' WHERE primary_team IS NULL;

WITH member_teams AS (
  SELECT m.incident_id, t.team
  FROM incident_member m
  JOIN alert_event e ON e.alert_id = m.alert_id
  JOIN team_rule t ON t.device_type = e.device_type
  UNION
  SELECT m.incident_id, e.department
  FROM incident_member m
  JOIN alert_event e ON e.alert_id = m.alert_id
  WHERE e.department IS NOT NULL
),
supporting AS (
  SELECT mt.incident_id, string_agg(DISTINCT mt.team, ', ' ORDER BY mt.team) AS teams
  FROM member_teams mt
  JOIN incident i ON i.id = mt.incident_id
  WHERE mt.team NOT IN ('RID-BOT', 'Doc Support')
    AND mt.team <> i.primary_team
  GROUP BY mt.incident_id
)
UPDATE incident i
SET supporting_teams = s.teams
FROM supporting s
WHERE s.incident_id = i.id;

UPDATE incident i
SET teams_today = x.n
FROM (
  SELECT m.incident_id, count(DISTINCT e.department) FILTER (WHERE e.department <> 'RID-BOT') AS n
  FROM incident_member m
  JOIN alert_event e ON e.alert_id = m.alert_id
  GROUP BY m.incident_id
) x
WHERE x.incident_id = i.id;

UPDATE incident i
SET confidence = CASE
      WHEN i.member_count >= 5 AND i.site NOT LIKE 'NET-%' AND e.symptom IN ('link_down', 'unreachable') THEN 'high'
      WHEN i.site NOT LIKE 'NET-%' THEN 'medium'
      ELSE 'low'
    END,
    confidence_reason = CASE
      WHEN i.member_count >= 5 AND i.site NOT LIKE 'NET-%' AND e.symptom IN ('link_down', 'unreachable')
        THEN i.member_count || ' alerts at site ' || i.site || ' within the time window; root is ' || replace(e.symptom, '_', ' ') || ' on ' || replace(e.device_type, '_', ' ')
      WHEN i.site NOT LIKE 'NET-%'
        THEN i.member_count || ' alerts at site ' || i.site || ' within the time window'
      ELSE i.member_count || ' alerts in subnet ' || substring(i.site FROM 5) || ' only; site code unknown'
    END
FROM alert_event e
WHERE e.alert_id = i.root_alert_id;

UPDATE incident_member m
SET reason = concat_ws(', ',
      CASE WHEN i.site LIKE 'NET-%' THEN 'SAME_SUBNET' ELSE 'SAME_SITE' END,
      'TIME_WINDOW',
      CASE WHEN e.tier > r.tier THEN 'DOWNSTREAM_TIER' END,
      CASE WHEN e.is_repeat THEN 'REPEAT' END)
FROM incident i, alert_event e, alert_event r
WHERE i.id = m.incident_id
  AND e.alert_id = m.alert_id
  AND r.alert_id = i.root_alert_id;

SELECT count(*) AS incidents,
       count(root_alert_id) AS with_root,
       count(*) FILTER (WHERE primary_team = 'Needs triage') AS needs_triage,
       count(*) FILTER (WHERE confidence = 'high') AS high,
       count(*) FILTER (WHERE confidence = 'medium') AS medium,
       count(*) FILTER (WHERE confidence = 'low') AS low,
       CASE WHEN (SELECT count(*) FROM incident_member WHERE is_root) = count(*) THEN 'OK' ELSE 'FAIL' END AS one_root_check
FROM incident;

SELECT primary_team, count(*) AS incidents FROM incident GROUP BY primary_team ORDER BY incidents DESC;

SELECT i.id, i.member_count, e.alert_id AS root_alert, left(e.subject, 55) AS root_subject,
       i.primary_team, i.supporting_teams, i.teams_today, i.confidence
FROM incident i
JOIN alert_event e ON e.alert_id = i.root_alert_id
WHERE i.id IN ('NAGP1-20261011-0954', 'RDPPL-20261011-1805', 'IGTPL-20261010-0613', 'NET-10.151.103-20261004-0125')
ORDER BY i.id;
