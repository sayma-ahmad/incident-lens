BEGIN;

-- Rule 3:
-- Find MSOLVE incident numbers without a direct correlation-ID match
-- in Alfa Incident/Alert ticket subjects.
-- All results remain low-confidence candidates requiring review.

WITH incidents_without_direct_match AS (
    SELECT
        i.ticket_id,
        i.created_on
    FROM msolve_incident i
        WHERE BTRIM(i.ticket_id) ~* '^INC[0-9]+$'
      AND NOT EXISTS (
          SELECT 1
          FROM ticket_link l
          WHERE l.msolve_ticket_id = i.ticket_id
            AND l.match_method IN (
                'numeric_correlation_id',
                'prefixed_correlation_id'
            )
      )
),
source_candidates AS (
    SELECT
        i.ticket_id AS msolve_ticket_id,
        a.ticket_id AS alfa_ticket_id,
        i.created_on AS msolve_created_on,
        a.created_on AS alfa_created_on,
        a.source_sheet,
        a.source_row_number,
        a.subject
    FROM incidents_without_direct_match i
    JOIN alfa_ticket a
      ON LOWER(BTRIM(COALESCE(a.ticket_type, '')))
             IN ('incident', 'alert')
     AND NULLIF(BTRIM(a.ticket_id), '') IS NOT NULL
     AND NULLIF(BTRIM(a.subject), '') IS NOT NULL
     AND UPPER(a.subject) ~ (
         '(^|[^A-Z0-9])'
         || UPPER(BTRIM(i.ticket_id))
         || '([^A-Z0-9]|$)'
     )
),
candidate_pairs AS (
    SELECT
        msolve_ticket_id,
        alfa_ticket_id,
        MIN(
            ABS(EXTRACT(EPOCH FROM (
                msolve_created_on - alfa_created_on
            )))
        ) AS time_difference_seconds,
        JSONB_AGG(
            DISTINCT JSONB_BUILD_OBJECT(
                'source_sheet', source_sheet,
                'source_row_number', source_row_number,
                'subject', subject
            )
        ) AS matching_source_rows
    FROM source_candidates
    GROUP BY msolve_ticket_id, alfa_ticket_id
),
candidate_counts AS (
    SELECT
        msolve_ticket_id,
        COUNT(*) AS candidate_alfa_ticket_count
    FROM candidate_pairs
    GROUP BY msolve_ticket_id
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
    p.msolve_ticket_id,
    p.alfa_ticket_id,
    'incident_number_in_alfa_subject',
    'low',
    p.time_difference_seconds,
    JSONB_BUILD_OBJECT(
        'rule',
            'Standalone MSOLVE incident number found in Alfa Incident/Alert subject',
        'review_status',
            CASE
                WHEN c.candidate_alfa_ticket_count > 1
                    THEN 'ambiguous_multiple_alfa_matches'
                ELSE 'candidate_requires_review'
            END,
        'candidate_alfa_ticket_count',
            c.candidate_alfa_ticket_count,
        'matching_source_rows',
            p.matching_source_rows,
        'note',
            'Candidate only; not a confirmed duplicate'
    )
FROM candidate_pairs p
JOIN candidate_counts c
  ON c.msolve_ticket_id = p.msolve_ticket_id
ON CONFLICT (msolve_ticket_id, alfa_ticket_id) DO NOTHING;

-- Report Rule 3 results, including when no candidates are found.
SELECT
    COUNT(*) AS rule_3_links,
    COUNT(DISTINCT msolve_ticket_id) AS unique_incidents,
    COUNT(DISTINCT alfa_ticket_id) AS unique_alfa_tickets,
    COUNT(time_difference_seconds) AS lag_saved,
    COUNT(*) FILTER (
        WHERE evidence->>'review_status'
            = 'ambiguous_multiple_alfa_matches'
    ) AS ambiguous_candidate_links
FROM ticket_link
WHERE match_method = 'incident_number_in_alfa_subject';

COMMIT;
