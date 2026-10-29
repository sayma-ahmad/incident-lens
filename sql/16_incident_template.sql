UPDATE incident SET explanation_template = NULL;

WITH top_pattern AS (
  SELECT m.incident_id, e.symptom, e.device_type,
         row_number() OVER (PARTITION BY m.incident_id ORDER BY count(*) DESC, min(e.symptom_rank), e.device_type) AS rn
  FROM incident_member m
  JOIN alert_event e ON e.alert_id = m.alert_id
  WHERE NOT e.is_repeat
  GROUP BY m.incident_id, e.symptom, e.device_type
)
UPDATE incident i
SET explanation_template =
      i.member_count || ' alerts from ' || i.site || ' arrived between '
      || to_char(i.started_at AT TIME ZONE 'Asia/Kolkata', 'DD Mon YYYY HH24:MI') || ' and '
      || to_char(i.ended_at AT TIME ZONE 'Asia/Kolkata', 'HH24:MI') || ' IST, mostly '''
      || replace(t.symptom, '_', ' ') || ''' on '
      || CASE WHEN t.device_type LIKE '%switch' THEN replace(t.device_type, '_', ' ') || 'es' ELSE replace(t.device_type, '_', ' ') || 's' END || '. '
      || 'The earliest, most upstream alert was ' || i.root_alert_id
      || ' (' || replace(r.symptom, '_', ' ') || ' on ' || coalesce(r.host, replace(r.device_type, '_', ' ')) || '). '
      || 'This pattern suggests a shared upstream cause. '
      || i.primary_team || ' is recommended to investigate first. '
      || 'This is a probable cause, not a confirmed root cause.'
FROM top_pattern t, alert_event r
WHERE t.incident_id = i.id
  AND t.rn = 1
  AND r.alert_id = i.root_alert_id;

SELECT count(*) AS incidents,
       count(explanation_template) AS with_template,
       CASE WHEN count(explanation_template) = count(*) THEN 'OK' ELSE 'FAIL' END AS template_check
FROM incident;

SELECT id, explanation_template
FROM incident
WHERE id IN ('NAGP1-20261011-0954', 'RDPPL-20261011-1805', 'IGTPL-20261010-0613', 'NET-10.151.103-20261004-0125')
ORDER BY id;
