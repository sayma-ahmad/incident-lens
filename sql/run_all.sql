\set ON_ERROR_STOP on
\ir 01_ticket_raw_tables.sql
\ir 02_ticket_load.sql
\ir 03_ticket_normalize.sql
\ir 04_ticket_exact_links.sql
\ir 05_ticket_subject_links.sql
\ir 06_ticket_fallback_links.sql
\ir 07_ticket_view.sql
\ir 08_ticket_validate.sql
\ir 09_alert_raw_tables.sql
\ir 10_alert_load.sql
\ir 11_alert_event.sql
\ir 12_alert_extract.sql
\ir 13_alert_dedupe.sql
\ir 14_incident_group.sql
\ir 15_incident_recommend.sql
\ir 16_incident_template.sql
\ir 17_incident_feedback.sql
