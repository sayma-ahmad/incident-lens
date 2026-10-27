CREATE VIEW ticket_view_previous AS
SELECT * FROM ticket_view;

CREATE OR REPLACE VIEW ticket_view AS
SELECT
    source,
    source_row_id,
    ticket_id,
    CASE
        WHEN source = 'MSOLVE Service Request'
            THEN NULL::TIMESTAMPTZ
        ELSE created_on
    END AS created_on,
    subject,
    team,
    status,
    linked_ticket_id,
    match_method,
    is_cross_tool_copy,
    is_duplicate,
    linked_ticket_count,
    source_sheet,
    priority,
    source_record
FROM ticket_view_previous;

DROP VIEW ticket_view_previous;

SELECT source, COUNT(*) AS row_count,
       COUNT(*) FILTER (WHERE created_on IS NULL) AS missing_created_on
FROM ticket_view
GROUP BY source
ORDER BY source;