BEGIN;

WITH unmatched_incidents AS (
    SELECT
        i.ticket_id,
        i.created_on,
        LEFT(
            REGEXP_REPLACE(
                LOWER(BTRIM(COALESCE(i.subject, ''))),
                '[[:space:]]+', ' ', 'g'
            ),
            40
        ) AS normalized_subject_40
    FROM msolve_incident i
    WHERE NOT EXISTS (
        SELECT 1
        FROM ticket_link l
        WHERE l.msolve_ticket_id = i.ticket_id
    )
),
candidate_pairs AS (
    SELECT
        i.ticket_id AS msolve_ticket_id,
        a.ticket_id AS alfa_ticket_id,
        i.normalized_subject_40,
        MIN(
            ABS(EXTRACT(EPOCH FROM (i.created_on - a.created_on)))
        ) AS time_difference_seconds
    FROM unmatched_incidents i
    JOIN alfa_ticket a
      ON i.normalized_subject_40 <> ''
     AND i.normalized_subject_40 =
         LEFT(
             REGEXP_REPLACE(
                 LOWER(BTRIM(COALESCE(a.subject, ''))),
                 '[[:space:]]+', ' ', 'g'
             ),
             40
         )
     AND ABS(EXTRACT(EPOCH FROM (i.created_on - a.created_on))) <= 600
    WHERE NULLIF(BTRIM(a.ticket_id), '') IS NOT NULL
    GROUP BY i.ticket_id, a.ticket_id, i.normalized_subject_40
),
ranked_candidates AS (
    SELECT
        *,
        RANK() OVER (
            PARTITION BY msolve_ticket_id
            ORDER BY time_difference_seconds
        ) AS nearest_rank,
        COUNT(*) OVER (
            PARTITION BY msolve_ticket_id, time_difference_seconds
        ) AS candidates_at_same_distance
    FROM candidate_pairs
),
unique_nearest AS (
    SELECT *
    FROM ranked_candidates
    WHERE nearest_rank = 1
      AND candidates_at_same_distance = 1
)
INSERT INTO ticket_link (
    msolve_ticket_id,
    alfa_ticket_id,
    match_method,
    confidence,
    time_difference_seconds,
    evidence
)
SELECT
    msolve_ticket_id,
    alfa_ticket_id,
    'exact_subject_time_within_10m',
    'low',
    time_difference_seconds,
    jsonb_build_object(
        'rule', 'Normalized first 40 subject characters and nearest creation timestamp within 10 minutes',
        'normalized_subject_first_40', normalized_subject_40,
        'time_difference_seconds', time_difference_seconds,
        'selection', 'Unique nearest candidate'
    )
FROM unique_nearest
ON CONFLICT (msolve_ticket_id, alfa_ticket_id) DO NOTHING;

SELECT
    match_method,
    confidence,
    COUNT(*) AS link_count,
    COUNT(DISTINCT msolve_ticket_id) AS unique_msolve_tickets,
    COUNT(DISTINCT alfa_ticket_id) AS unique_alfa_tickets
FROM ticket_link
GROUP BY match_method, confidence
ORDER BY match_method, confidence;

COMMIT;