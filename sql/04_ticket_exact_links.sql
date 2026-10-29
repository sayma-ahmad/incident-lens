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
        MAX(ticket_number) AS ticket_number,
        MIN(created_on) AS created_on,
        COUNT(DISTINCT created_on) AS distinct_created_timestamps
    FROM alfa_ticket
    WHERE NULLIF(BTRIM(ticket_id), '') IS NOT NULL
    GROUP BY UPPER(BTRIM(ticket_id))
),

exact_links AS (

    SELECT
        i.ticket_id AS msolve_ticket_id,
        a.ticket_id AS alfa_ticket_id,
        'numeric_correlation_id'::TEXT AS match_method,
        'high'::TEXT AS confidence,
        ABS(EXTRACT(EPOCH FROM (
            i.created_on - a.created_on
        ))) AS time_difference_seconds,
        jsonb_build_object(
            'correlation_id', BTRIM(i.correlation_id),
            'rule', 'Numeric correlation ID matches Alfa ticket number',
            'time_difference_seconds',
                ABS(EXTRACT(EPOCH FROM (
                    i.created_on - a.created_on
                ))),
            'alfa_timestamp_policy', 'MIN(created_on)',
            'alfa_distinct_created_timestamps',
                a.distinct_created_timestamps
        ) AS evidence
    FROM msolve_incident i
    JOIN alfa_ids a
      ON a.ticket_number = BTRIM(i.correlation_id)
    WHERE BTRIM(i.correlation_id) ~ '^[0-9]+$'

    UNION ALL

    SELECT
        i.ticket_id AS msolve_ticket_id,
        a.ticket_id AS alfa_ticket_id,
        'prefixed_correlation_id'::TEXT AS match_method,
        'high'::TEXT AS confidence,
        ABS(EXTRACT(EPOCH FROM (
            i.created_on - a.created_on
        ))) AS time_difference_seconds,
        jsonb_build_object(
            'correlation_id', BTRIM(i.correlation_id),
            'rule', 'Full prefixed correlation ID matches Alfa ticket ID',
            'time_difference_seconds',
                ABS(EXTRACT(EPOCH FROM (
                    i.created_on - a.created_on
                ))),
            'alfa_timestamp_policy', 'MIN(created_on)',
            'alfa_distinct_created_timestamps',
                a.distinct_created_timestamps
        ) AS evidence
    FROM msolve_incident i
    JOIN alfa_ids a
      ON a.normalized_ticket_id = UPPER(BTRIM(i.correlation_id))
    WHERE BTRIM(i.correlation_id) ~* '^[A-Za-z]+[0-9]+$'

    UNION ALL

    SELECT
        sr.ticket_id AS msolve_ticket_id,
        a.ticket_id AS alfa_ticket_id,
        'service_request_numeric_correlation_id'::TEXT AS match_method,
        'high'::TEXT AS confidence,
        NULL::NUMERIC AS time_difference_seconds,
        jsonb_build_object(
            'correlation_id', BTRIM(sr.correlation_id),
            'rule', 'Numeric service-request correlation ID matches Alfa ticket number',
            'time_lag_status',
                'Unavailable: source has no created_on timestamp',
            'alfa_timestamp_policy', 'MIN(created_on)',
            'alfa_distinct_created_timestamps',
                a.distinct_created_timestamps
        ) AS evidence
    FROM msolve_sr sr
    JOIN alfa_ids a
      ON a.ticket_number = BTRIM(sr.correlation_id)
    WHERE BTRIM(sr.correlation_id) ~ '^[0-9]+$'

    UNION ALL

    SELECT
        sr.ticket_id AS msolve_ticket_id,
        a.ticket_id AS alfa_ticket_id,
        'service_request_prefixed_correlation_id'::TEXT AS match_method,
        'high'::TEXT AS confidence,
        NULL::NUMERIC AS time_difference_seconds,
        jsonb_build_object(
            'correlation_id', BTRIM(sr.correlation_id),
            'rule', 'Prefixed service-request correlation ID matches Alfa ticket ID',
            'time_lag_status',
                'Unavailable: source has no created_on timestamp',
            'alfa_timestamp_policy', 'MIN(created_on)',
            'alfa_distinct_created_timestamps',
                a.distinct_created_timestamps
        ) AS evidence
    FROM msolve_sr sr
    JOIN alfa_ids a
      ON a.normalized_ticket_id = UPPER(BTRIM(sr.correlation_id))
    WHERE BTRIM(sr.correlation_id) ~* '^[A-Za-z]+[0-9]+$'
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
    match_method,
    confidence,
    time_difference_seconds,
    evidence
FROM exact_links
ON CONFLICT (msolve_ticket_id, alfa_ticket_id) DO NOTHING;

SELECT
    match_method,
    COUNT(*) AS link_count,
    COUNT(DISTINCT msolve_ticket_id) AS unique_msolve_tickets,
    COUNT(DISTINCT alfa_ticket_id) AS unique_alfa_tickets,
    COUNT(time_difference_seconds) AS lag_saved,
    COUNT(*) - COUNT(time_difference_seconds) AS lag_missing
FROM ticket_link
WHERE match_method IN (
    'numeric_correlation_id',
    'prefixed_correlation_id',
    'service_request_numeric_correlation_id',
    'service_request_prefixed_correlation_id'
)
GROUP BY match_method
ORDER BY match_method;

COMMIT;
