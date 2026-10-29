TRUNCATE alert_open_raw, alert_resolved_raw, alert_closed_raw;

\copy alert_open_raw FROM '../data-csv/alert_open.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8')
\copy alert_resolved_raw FROM '../data-csv/alert_resolved.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8')
\copy alert_closed_raw FROM '../data-csv/alert_closed.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8')

SELECT 'alert_open_raw' AS table_name, count(*) AS row_count, CASE WHEN count(*) = 183 THEN 'OK' ELSE 'FAIL' END AS check FROM alert_open_raw
UNION ALL
SELECT 'alert_resolved_raw', count(*), CASE WHEN count(*) = 892 THEN 'OK' ELSE 'FAIL' END FROM alert_resolved_raw
UNION ALL
SELECT 'alert_closed_raw', count(*), CASE WHEN count(*) = 55638 THEN 'OK' ELSE 'FAIL' END FROM alert_closed_raw;
