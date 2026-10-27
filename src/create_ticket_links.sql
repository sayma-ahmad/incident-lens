BEGIN;

CREATE TABLE IF NOT EXISTS ticket_link (
    link_id BIGSERIAL PRIMARY KEY,
    msolve_ticket_id TEXT NOT NULL,
    alfa_ticket_id TEXT NOT NULL,
    match_method TEXT NOT NULL,
    confidence TEXT NOT NULL CHECK (
        confidence IN ('high', 'medium', 'low')
    ),
    time_difference_seconds NUMERIC,
    evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_ticket_link_pair
        UNIQUE (msolve_ticket_id, alfa_ticket_id)
);

CREATE INDEX IF NOT EXISTS idx_ticket_link_msolve_id
    ON ticket_link(msolve_ticket_id);

CREATE INDEX IF NOT EXISTS idx_ticket_link_alfa_id
    ON ticket_link(alfa_ticket_id);

WITH alfa_ids AS (
    SELECT
        UPPER(BTRIM(ticket_id)) AS normalized_ticket_id,
        MIN(BTRIM(ticket_id)) AS ticket_id,
        MAX(ticket_number) AS ticket_number
    FROM alfa_ticket
    WHERE NULLIF(BTRIM(ticket_id), '') IS NOT NULL
    GROUP BY UPPER(BTRIM(ticket_id))
),
exact_links AS (
    -- Rule 1: Numeric correlation ID matches Alfa ticket number
    SELECT
        i.ticket_id AS msolve_ticket_id,
        a.ticket_id AS alfa_ticket_id,
        'numeric_correlation_id'::TEXT AS match_method,
        'high'::TEXT AS confidence,
        jsonb_build_object(
            'correlation_id', BTRIM(i.correlation_id),
            'rule', 'Numeric correlation ID matches Alfa ticket number'
        ) AS evidence
    FROM msolve_incident i
    JOIN alfa_ids a
      ON a.ticket_number = BTRIM(i.correlation_id)
    WHERE BTRIM(i.correlation_id) ~ '^[0-9]+$'

    UNION ALL

    -- Rule 2: Full prefixed correlation ID matches Alfa ticket ID
    SELECT
        i.ticket_id AS msolve_ticket_id,
        a.ticket_id AS alfa_ticket_id,
        'prefixed_correlation_id'::TEXT AS match_method,
        'high'::TEXT AS confidence,
        jsonb_build_object(
            'correlation_id', BTRIM(i.correlation_id),
            'rule', 'Full prefixed correlation ID matches Alfa ticket ID'
        ) AS evidence
    FROM msolve_incident i
    JOIN alfa_ids a
      ON a.normalized_ticket_id = UPPER(BTRIM(i.correlation_id))
    WHERE BTRIM(i.correlation_id) ~* '^[A-Za-z]+[0-9]+$'
)
INSERT INTO ticket_link (
    msolve_ticket_id,
    alfa_ticket_id,
    match_method,
    confidence,
    evidence
)
SELECT
    msolve_ticket_id,
    alfa_ticket_id,
    match_method,
    confidence,
    evidence
FROM exact_links
ON CONFLICT (msolve_ticket_id, alfa_ticket_id) DO NOTHING;

-- Report links by matching rule
SELECT
    match_method,
    COUNT(*) AS link_count,
    COUNT(DISTINCT msolve_ticket_id) AS unique_msolve_tickets,
    COUNT(DISTINCT alfa_ticket_id) AS unique_alfa_tickets
FROM ticket_link
WHERE match_method IN (
    'numeric_correlation_id',
    'prefixed_correlation_id'
)
GROUP BY match_method
ORDER BY match_method;

COMMIT;