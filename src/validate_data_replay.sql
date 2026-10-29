-- Incident Lens POC
-- Developer 1 - D1.13: Data validation
-- Read-only checks; does not update or delete data.
-- Incident matching counts deliberately exclude service-request links.

WITH incident_match_methods AS (
    SELECT unnest(ARRAY[
        'numeric_correlation_id',
        'prefixed_correlation_id',
        'exact_subject_time_within_10m',
        'incident_number_in_alfa_subject'
    ]::TEXT[]) AS match_method
),
checks AS (
    SELECT
        'Raw MSOLVE incidents' AS check_name,
        '2573' AS expected,
        COUNT(*)::text AS actual,
        CASE WHEN COUNT(*) = 2573 THEN 'PASS' ELSE 'FAIL' END AS status,
        'Original incident row count' AS notes
    FROM raw_msolve_incidents

    UNION ALL
    SELECT
        'Raw MSOLVE service requests',
        '641',
        COUNT(*)::text,
        CASE WHEN COUNT(*) = 641 THEN 'PASS' ELSE 'FAIL' END,
        'Original service request row count'
    FROM raw_msolve_service_requests

    UNION ALL
    SELECT
        'Raw Alfa tickets',
        '56713',
        COUNT(*)::text,
        CASE WHEN COUNT(*) = 56713 THEN 'PASS' ELSE 'FAIL' END,
        'Combined Alfa source rows'
    FROM raw_alfa_tickets

    UNION ALL
    SELECT
        'Prepared Open tickets',
        '183',
        COUNT(*)::text,
        CASE WHEN COUNT(*) = 183 THEN 'PASS' ELSE 'FAIL' END,
        'Open sheet row count'
    FROM alfa_ticket
    WHERE source_sheet = 'Open Tickets_Oct 26'

    UNION ALL
    SELECT
        'Prepared Resolved tickets',
        '892',
        COUNT(*)::text,
        CASE WHEN COUNT(*) = 892 THEN 'PASS' ELSE 'FAIL' END,
        'Resolved sheet row count'
    FROM alfa_ticket
    WHERE source_sheet = 'Resolved Tickets_Oct 26'

    UNION ALL
    SELECT
        'Prepared Closed tickets',
        '55638',
        COUNT(*)::text,
        CASE WHEN COUNT(*) = 55638 THEN 'PASS' ELSE 'FAIL' END,
        'Closed sheet row count'
    FROM alfa_ticket
    WHERE source_sheet = 'Closed Tickets_Oct 26'

    UNION ALL
    SELECT
        'Normalized MSOLVE incidents',
        '2573',
        COUNT(*)::text,
        CASE WHEN COUNT(*) = 2573 THEN 'PASS' ELSE 'FAIL' END,
        'Clean incident table'
    FROM msolve_incident

    UNION ALL
    SELECT
        'Normalized MSOLVE service requests',
        '641',
        COUNT(*)::text,
        CASE WHEN COUNT(*) = 641 THEN 'PASS' ELSE 'FAIL' END,
        'Clean service request table'
    FROM msolve_sr

    UNION ALL
    SELECT
        'Normalized Alfa tickets',
        '56713',
        COUNT(*)::text,
        CASE WHEN COUNT(*) = 56713 THEN 'PASS' ELSE 'FAIL' END,
        'Clean Alfa table'
    FROM alfa_ticket

    UNION ALL
    SELECT
        'Combined ticket view',
        '59927',
        COUNT(*)::text,
        CASE WHEN COUNT(*) = 59927 THEN 'PASS' ELSE 'FAIL' END,
        'All three sources combined'
    FROM ticket_view

    UNION ALL
    SELECT
        'Alfa missing ticket IDs',
        '0',
        COUNT(*)::text,
        CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
        'Missing IDs must be investigated'
    FROM alfa_ticket
    WHERE NULLIF(BTRIM(ticket_id), '') IS NULL

    UNION ALL
    SELECT
        'Alfa missing creation timestamps',
        '0',
        COUNT(*)::text,
        CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
        'Missing creation timestamps must be investigated'
    FROM alfa_ticket
    WHERE created_on IS NULL

    UNION ALL
    SELECT
        'Alfa ticket IDs with duplicates',
        '31 (known; review)',
        COUNT(*)::text,
        CASE WHEN COUNT(*) = 31 THEN 'REVIEW' ELSE 'INVESTIGATE' END,
        'Preserve duplicate source rows; do not delete automatically'
    FROM (
        SELECT ticket_id
        FROM alfa_ticket
        GROUP BY ticket_id
        HAVING COUNT(*) > 1
    ) d

    UNION ALL
    SELECT
        'Duplicate link pairs',
        '0',
        COUNT(*)::text,
        CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
        'Each MSOLVE-Alfa pair should occur once'
    FROM (
        SELECT msolve_ticket_id, alfa_ticket_id
        FROM ticket_link
        GROUP BY msolve_ticket_id, alfa_ticket_id
        HAVING COUNT(*) > 1
    ) d

    UNION ALL
    SELECT
        'MSOLVE incidents with missing resolved_at',
        '62',
        COUNT(*)::text,
        CASE WHEN COUNT(*) = 62 THEN 'PASS' ELSE 'REVIEW' END,
        'Preserve source missing values; do not invent dates'
    FROM msolve_incident
    WHERE resolved_at IS NULL

    UNION ALL
    SELECT
        'MSOLVE incidents with missing closed_at',
        '277',
        COUNT(*)::text,
        CASE WHEN COUNT(*) = 277 THEN 'PASS' ELSE 'REVIEW' END,
        'Preserve source missing values; do not invent dates'
    FROM msolve_incident
    WHERE closed_at IS NULL

    UNION ALL
    SELECT
        'Service requests with unavailable created_on',
        '641',
        COUNT(*)::text,
        CASE WHEN COUNT(*) = 641 THEN 'PASS' ELSE 'REVIEW' END,
        'Source has due_date but no creation timestamp; view must not substitute due_date'
    FROM ticket_view
    WHERE source = 'MSOLVE Service Request'
      AND created_on IS NULL

    UNION ALL
    SELECT
        'Matched MSOLVE incidents',
        '2382',
        COUNT(DISTINCT l.msolve_ticket_id)::text,
        CASE
            WHEN COUNT(DISTINCT l.msolve_ticket_id) = 2382
                THEN 'PASS'
            ELSE 'REVIEW'
        END,
        'Incident links only; excludes service-request mapping methods'
    FROM ticket_link l
    JOIN incident_match_methods m
      ON m.match_method = l.match_method

    UNION ALL
    SELECT
        'Unmatched MSOLVE incidents',
        '191',
        COUNT(*)::text,
        CASE WHEN COUNT(*) = 191 THEN 'PASS' ELSE 'REVIEW' END,
        'Incidents without an incident link; service-request links do not count'
    FROM msolve_incident i
    WHERE NOT EXISTS (
        SELECT 1
        FROM ticket_link l
        JOIN incident_match_methods m
          ON m.match_method = l.match_method
        WHERE l.msolve_ticket_id = i.ticket_id
    )
)
SELECT check_name, expected, actual, status, notes
FROM checks
ORDER BY
    CASE status
        WHEN 'FAIL' THEN 1
        WHEN 'INVESTIGATE' THEN 2
        WHEN 'REVIEW' THEN 3
        ELSE 4
    END,
    check_name;