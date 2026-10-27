CREATE OR REPLACE VIEW ticket_view AS
WITH incident_links AS (
    SELECT
        msolve_ticket_id,
        STRING_AGG(DISTINCT alfa_ticket_id, ', ' ORDER BY alfa_ticket_id)
            AS linked_ticket_id,
        STRING_AGG(DISTINCT match_method, ', ' ORDER BY match_method)
            AS match_method,
        COUNT(*) AS link_count
    FROM ticket_link
    GROUP BY msolve_ticket_id
),
alfa_links AS (
    SELECT
        alfa_ticket_id,
        STRING_AGG(DISTINCT msolve_ticket_id, ', ' ORDER BY msolve_ticket_id)
            AS linked_ticket_id,
        STRING_AGG(DISTINCT match_method, ', ' ORDER BY match_method)
            AS match_method,
        COUNT(*) AS link_count
    FROM ticket_link
    GROUP BY alfa_ticket_id
)

-- MSOLVE incidents
SELECT
    'MSOLVE Incident'::TEXT AS source,
    i.source_row_id,
    i.ticket_id,
    i.created_on,
    i.subject,
    i.assignment_group AS team,
    i.state AS status,
    il.linked_ticket_id,
    il.match_method,
    FALSE AS is_cross_tool_copy,
    FALSE AS is_duplicate,
    COALESCE(il.link_count, 0) AS linked_ticket_count,
    NULL::TEXT AS source_sheet,
    i.priority,
    i.source_record
FROM msolve_incident i
LEFT JOIN incident_links il
    ON il.msolve_ticket_id = i.ticket_id

UNION ALL

-- MSOLVE service requests
SELECT
    'MSOLVE Service Request'::TEXT AS source,
    sr.source_row_id,
    sr.ticket_id,
    NULL::TIMESTAMPTZ AS created_on,
    COALESCE(
        NULLIF(BTRIM(sr.request), ''),
        NULLIF(BTRIM(sr.catalog_item), ''),
        sr.ticket_id
    ) AS subject,
    sr.assignment_group AS team,
    sr.stage AS status,
    NULL::TEXT AS linked_ticket_id,
    NULL::TEXT AS match_method,
    FALSE AS is_cross_tool_copy,
    FALSE AS is_duplicate,
    0::BIGINT AS linked_ticket_count,
    NULL::TEXT AS source_sheet,
    NULL::TEXT AS priority,
    sr.source_record
FROM msolve_sr sr

UNION ALL

-- Alfa tickets: retain all source rows, including duplicate IDs
SELECT
    'Alfa'::TEXT AS source,
    a.source_row_id,
    a.ticket_id,
    a.created_on,
    a.subject,
    a.department AS team,
    a.status,
    al.linked_ticket_id,
    al.match_method,
    (al.link_count IS NOT NULL) AS is_cross_tool_copy,
    (al.link_count IS NOT NULL) AS is_duplicate,
    COALESCE(al.link_count, 0) AS linked_ticket_count,
    a.source_sheet,
    a.priority,
    a.source_record
FROM alfa_ticket a
LEFT JOIN alfa_links al
    ON al.alfa_ticket_id = a.ticket_id;