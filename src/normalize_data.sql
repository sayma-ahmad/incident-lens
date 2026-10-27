BEGIN;
SET LOCAL TIME ZONE 'Asia/Kolkata';

-- 1. Clean MSOLVE incidents
CREATE TABLE msolve_incident (
    source_row_id BIGINT PRIMARY KEY,
    source_file TEXT,
    source_row_number INTEGER,
    ticket_id TEXT NOT NULL,
    correlation_id TEXT,
    created_on TIMESTAMPTZ NOT NULL,
    priority TEXT,
    caller_id TEXT,
    caller_company TEXT,
    caller_location TEXT,
    contact_type TEXT,
    subject TEXT,
    description TEXT,
    business_impact TEXT,
    impacted_stakeholders_locations TEXT,
    state TEXT,
    category TEXT,
    subcategory TEXT,
    assignment_group TEXT,
    assigned_to TEXT,
    assignment_coe TEXT,
    assignment_vertical TEXT,
    resolved_at TIMESTAMPTZ,
    close_code TEXT,
    close_notes TEXT,
    closed_at TIMESTAMPTZ,
    source_record JSONB NOT NULL
);

INSERT INTO msolve_incident
SELECT
    row_id,
    source_file,
    source_row_number,
    NULLIF(BTRIM(record_json->>'number'), ''),
    NULLIF(BTRIM(record_json->>'correlation_id'), ''),
    to_timestamp(
        NULLIF(BTRIM(record_json->>'sys_created_on'), ''),
        'DD-MM-YYYY HH24:MI:SS'
    ),
    NULLIF(BTRIM(record_json->>'priority'), ''),
    NULLIF(BTRIM(record_json->>'caller_id'), ''),
    NULLIF(BTRIM(record_json->>'caller_id.company'), ''),
    NULLIF(BTRIM(record_json->>'caller_id.location'), ''),
    NULLIF(BTRIM(record_json->>'contact_type'), ''),
    NULLIF(
        regexp_replace(
            BTRIM(COALESCE(record_json->>'short_description', '')),
            '[[:space:]]+', ' ', 'g'
        ), ''
    ),
    NULLIF(BTRIM(record_json->>'description'), ''),
    NULLIF(BTRIM(record_json->>'business_impact'), ''),
    NULLIF(BTRIM(record_json->>'u_impacted_stake_holders_and_locations'), ''),
    NULLIF(BTRIM(record_json->>'state'), ''),
    NULLIF(BTRIM(record_json->>'category'), ''),
    NULLIF(BTRIM(record_json->>'subcategory'), ''),
    NULLIF(BTRIM(record_json->>'assignment_group'), ''),
    NULLIF(BTRIM(record_json->>'assigned_to'), ''),
    NULLIF(BTRIM(record_json->>'assignment_group.u_coe'), ''),
    NULLIF(BTRIM(record_json->>'assignment_group.u_vertical'), ''),
    to_timestamp(
        NULLIF(BTRIM(record_json->>'resolved_at'), ''),
        'DD-MM-YYYY HH24:MI:SS'
    ),
    NULLIF(BTRIM(record_json->>'close_code'), ''),
    NULLIF(BTRIM(record_json->>'close_notes'), ''),
    to_timestamp(
        NULLIF(BTRIM(record_json->>'closed_at'), ''),
        'DD-MM-YYYY HH24:MI:SS'
    ),
    record_json
FROM raw_msolve_incidents;

-- 2. Clean MSOLVE service requests
CREATE TABLE msolve_sr (
    source_row_id BIGINT PRIMARY KEY,
    source_file TEXT,
    source_row_number INTEGER,
    ticket_id TEXT NOT NULL,
    correlation_id TEXT,
    catalog_item TEXT,
    stage TEXT,
    request TEXT,
    assignment_cluster TEXT,
    requested_for TEXT,
    requested_for_username TEXT,
    request_opened_by TEXT,
    due_date TIMESTAMPTZ,
    quantity TEXT,
    request_requested_for TEXT,
    requested_for_location TEXT,
    opened_by TEXT,
    opened_by_location TEXT,
    assigned_to TEXT,
    assignment_group TEXT,
    source_record JSONB NOT NULL
);

INSERT INTO msolve_sr
SELECT
    row_id,
    source_file,
    source_row_number,
    NULLIF(BTRIM(record_json->>'number'), ''),
    NULLIF(BTRIM(record_json->>'correlation_id'), ''),
    NULLIF(BTRIM(record_json->>'cat_item'), ''),
    NULLIF(BTRIM(record_json->>'stage'), ''),
    NULLIF(BTRIM(record_json->>'request'), ''),
    NULLIF(BTRIM(record_json->>'assignment_group.u_cluster'), ''),
    NULLIF(BTRIM(record_json->>'requested_for'), ''),
    NULLIF(BTRIM(record_json->>'requested_for.user_name'), ''),
    NULLIF(BTRIM(record_json->>'request.opened_by'), ''),
    to_timestamp(
        NULLIF(BTRIM(record_json->>'due_date'), ''),
        'DD-MM-YYYY HH24:MI:SS'
    ),
    NULLIF(BTRIM(record_json->>'quantity'), ''),
    NULLIF(BTRIM(record_json->>'request.requested_for'), ''),
    NULLIF(BTRIM(record_json->>'requested_for.location'), ''),
    NULLIF(BTRIM(record_json->>'opened_by'), ''),
    NULLIF(BTRIM(record_json->>'opened_by.u_location1'), ''),
    NULLIF(BTRIM(record_json->>'assigned_to'), ''),
    NULLIF(BTRIM(record_json->>'assignment_group'), ''),
    record_json
FROM raw_msolve_service_requests;

-- 3. Combine and clean all three Alfa datasets
CREATE TABLE alfa_ticket (
    source_row_id BIGINT PRIMARY KEY,
    source_file TEXT,
    source_sheet TEXT NOT NULL,
    source_row_number INTEGER,
    ticket_id TEXT NOT NULL,
    ticket_prefix TEXT,
    ticket_number TEXT,
    subject TEXT,
    created_on TIMESTAMPTZ NOT NULL,
    closed_on TIMESTAMPTZ,
    execution_status TEXT,
    priority TEXT,
    department TEXT,
    ticket_type TEXT,
    ticket_owner TEXT,
    created_by TEXT,
    resolved_hours TEXT,
    sla_target_minutes TEXT,
    sla_met TEXT,
    status TEXT,
    closed_by TEXT,
    sla_resolved TEXT,
    source_record JSONB NOT NULL
);

INSERT INTO alfa_ticket
SELECT
    row_id,
    source_file,
    source_sheet,
    source_row_number,
    NULLIF(BTRIM(record_json->>'Ticket ID'), ''),
    substring(
        NULLIF(BTRIM(record_json->>'Ticket ID'), '')
        FROM '^([A-Za-z]+)[0-9]+$'
    ),
    substring(
        NULLIF(BTRIM(record_json->>'Ticket ID'), '')
        FROM '^[A-Za-z]+([0-9]+)$'
    ),
    NULLIF(
        regexp_replace(
            BTRIM(COALESCE(record_json->>'Subject', '')),
            '[[:space:]]+', ' ', 'g'
        ), ''
    ),
    CASE
        WHEN source_sheet = 'Closed Tickets_Oct 26'
            THEN NULLIF(BTRIM(record_json->>'Created On'), '')::TIMESTAMPTZ
        ELSE (
            NULLIF(BTRIM(record_json->>'Created On'), '')::TIMESTAMP
            AT TIME ZONE 'Asia/Kolkata'
        )
    END,
    CASE
        WHEN source_sheet = 'Closed Tickets_Oct 26'
        THEN (
            NULLIF(BTRIM(record_json->>'Closed On'), '')::TIMESTAMP
            AT TIME ZONE 'Asia/Kolkata'
        )
        ELSE NULL::TIMESTAMPTZ
    END,
    NULLIF(BTRIM(record_json->>'Execution Status'), ''),
    NULLIF(BTRIM(record_json->>'Priority'), ''),
    NULLIF(BTRIM(record_json->>'Department'), ''),
    NULLIF(BTRIM(record_json->>'Ticket Type'), ''),
    NULLIF(BTRIM(record_json->>'Ticket Owner'), ''),
    NULLIF(BTRIM(record_json->>'Created By'), ''),
    NULLIF(BTRIM(record_json->>'ResolvedHours(HH:MM)'), ''),
    NULLIF(BTRIM(record_json->>'SLA Target(minutes)'), ''),
    NULLIF(BTRIM(record_json->>'SLA Met'), ''),
    COALESCE(
        NULLIF(BTRIM(record_json->>'Status'), ''),
        CASE source_sheet
            WHEN 'Open Tickets_Oct 26' THEN 'Open'
            WHEN 'Resolved Tickets_Oct 26' THEN 'Resolved'
            WHEN 'Closed Tickets_Oct 26' THEN 'Closed'
        END
    ),
    NULLIF(BTRIM(record_json->>'Closed By'), ''),
    NULLIF(BTRIM(record_json->>'SLA Resolved'), ''),
    record_json
FROM raw_alfa_tickets;

-- Indexes for common ticket lookups and mapping
CREATE INDEX idx_msolve_incident_ticket_id
    ON msolve_incident(ticket_id);
CREATE INDEX idx_msolve_incident_correlation_id
    ON msolve_incident(correlation_id);
CREATE INDEX idx_msolve_incident_created_on
    ON msolve_incident(created_on);

CREATE INDEX idx_msolve_sr_ticket_id
    ON msolve_sr(ticket_id);
CREATE INDEX idx_msolve_sr_correlation_id
    ON msolve_sr(correlation_id);

CREATE INDEX idx_alfa_ticket_ticket_id
    ON alfa_ticket(ticket_id);
CREATE INDEX idx_alfa_ticket_prefix_number
    ON alfa_ticket(ticket_prefix, ticket_number);
CREATE INDEX idx_alfa_ticket_created_on
    ON alfa_ticket(created_on);
CREATE INDEX idx_alfa_ticket_subject
    ON alfa_ticket(subject);

-- Report normalized row counts
SELECT 'msolve_incident' AS table_name, COUNT(*) AS row_count
FROM msolve_incident
UNION ALL
SELECT 'msolve_sr', COUNT(*) FROM msolve_sr
UNION ALL
SELECT 'alfa_ticket', COUNT(*) FROM alfa_ticket
ORDER BY table_name;

COMMIT;
