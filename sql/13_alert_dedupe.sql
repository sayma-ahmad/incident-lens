ALTER TABLE alert_event ADD COLUMN IF NOT EXISTS auto_closed boolean NOT NULL DEFAULT false;
ALTER TABLE alert_event ADD COLUMN IF NOT EXISTS repeat_of integer;

UPDATE alert_event SET is_repeat = false, repeat_count = 0, repeat_of = NULL, auto_closed = false;

WITH ordered AS (
  SELECT id, host, symptom, created_at,
         CASE
           WHEN lag(created_at) OVER w IS NOT NULL
            AND created_at - lag(created_at) OVER w <= interval '10 minutes'
           THEN 0 ELSE 1
         END AS is_first
  FROM alert_event
  WHERE host IS NOT NULL
  WINDOW w AS (PARTITION BY host, symptom ORDER BY created_at, id)
),
chains AS (
  SELECT id, is_first,
         sum(is_first) OVER (PARTITION BY host, symptom ORDER BY created_at, id) AS chain_no,
         host, symptom
  FROM ordered
),
heads AS (
  SELECT host, symptom, chain_no, min(id) FILTER (WHERE is_first = 1) AS head_id, count(*) - 1 AS repeats
  FROM chains
  GROUP BY host, symptom, chain_no
)
UPDATE alert_event e
SET is_repeat = (c.is_first = 0),
    repeat_of = CASE WHEN c.is_first = 0 THEN h.head_id END,
    repeat_count = CASE WHEN c.is_first = 1 THEN h.repeats ELSE 0 END
FROM chains c
JOIN heads h ON h.host = c.host AND h.symptom = c.symptom AND h.chain_no = c.chain_no
WHERE e.id = c.id;

UPDATE alert_event SET auto_closed = true WHERE closed_by = 'System';

SELECT count(*) AS total_rows,
       count(*) FILTER (WHERE is_repeat) AS repeats,
       count(*) FILTER (WHERE NOT is_repeat) AS unique_alerts,
       count(*) FILTER (WHERE repeat_count > 0) AS alerts_with_repeats,
       count(*) FILTER (WHERE auto_closed) AS auto_closed
FROM alert_event;

SELECT CASE WHEN count(*) FILTER (WHERE is_repeat) = coalesce(sum(repeat_count), 0) THEN 'OK' ELSE 'FAIL' END AS repeat_total_check
FROM alert_event;

SELECT host, symptom, repeat_count, created_at AT TIME ZONE 'Asia/Kolkata' AS first_seen_ist
FROM alert_event
WHERE repeat_count > 0
ORDER BY repeat_count DESC
LIMIT 5;
