UPDATE alert_event
SET host = NULL, ip = NULL, subnet = NULL, site = NULL,
    device_type = NULL, tier = NULL, symptom = NULL, symptom_rank = NULL;

UPDATE alert_event
SET host = upper(regexp_replace(h, '[_-]\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}.*$', ''))
FROM (
  SELECT id AS hid, substring(subject FROM '^(\S+?)\s*(?: - | : |:)') AS h
  FROM alert_event
) x
WHERE alert_event.id = x.hid
  AND x.h ~ '[-_]';

UPDATE alert_event
SET ip = substring(subject FROM '(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})');

UPDATE alert_event
SET subnet = substring(ip FROM '^(\d{1,3}\.\d{1,3}\.\d{1,3})\.')
WHERE ip IS NOT NULL;

UPDATE alert_event
SET site = substring(host FROM '^MM-([A-Z0-9]+)-')
WHERE host IS NOT NULL;

UPDATE alert_event
SET site = 'NET-' || subnet
WHERE site IS NULL AND subnet IS NOT NULL;

UPDATE alert_event
SET (device_type, tier) = (
  SELECT d.device_type, d.tier FROM (VALUES (1)) v(x),
  LATERAL (SELECT CASE
      WHEN subject ILIKE '%EDG-SDW%' OR subject ILIKE '%SDWAN%' OR subject ILIKE '%FortiGate%' THEN 'sdwan_firewall'
      WHEN subject ILIKE '%Nexus%' OR subject ILIKE '%CSW%' OR subject ILIKE '%DSW%' OR subject ILIKE '%CORE%' THEN 'core_switch'
      WHEN subject ILIKE '%ASW%' OR subject ILIKE '%Aruba%' OR subject ~* '([-_]SW|SWITCH)' THEN 'access_switch'
      WHEN subject ~* '(^|[-_ ])AP([-_0-9 ]|s )' OR subject ILIKE '%AP_DISCONNECTED%' OR subject ILIKE '%Meraki%' THEN 'access_point'
      WHEN subject ILIKE '%\_WIN\_%' OR subject ILIKE '%Windows%' THEN 'windows_server'
      WHEN subject ILIKE '%Linux%' THEN 'linux_server'
      WHEN subject ILIKE '%storage%' THEN 'storage'
      ELSE 'other'
    END AS device_type) t,
  LATERAL (SELECT t.device_type, CASE t.device_type
      WHEN 'sdwan_firewall' THEN 1
      WHEN 'core_switch' THEN 1
      WHEN 'access_switch' THEN 2
      WHEN 'access_point' THEN 3
      WHEN 'windows_server' THEN 4
      WHEN 'linux_server' THEN 4
      WHEN 'storage' THEN 4
      ELSE 5
    END AS tier) d
);

UPDATE alert_event
SET (symptom, symptom_rank) = (
  SELECT s.symptom, s.symptom_rank FROM (VALUES (1)) v(x),
  LATERAL (SELECT CASE
      WHEN subject ILIKE '%Link down%' OR subject ILIKE '%Link status is down%' THEN 'link_down'
      WHEN subject ILIKE '%Unavailable by ICMP ping%' OR subject ILIKE '%unreachable%' THEN 'unreachable'
      WHEN subject ILIKE '%restarted%' OR subject ILIKE '%rebooted%' OR subject ILIKE '%DISCONNECTED%' THEN 'restart'
      WHEN subject ILIKE '%Zabbix agent is not available%' THEN 'agent_down'
      WHEN subject ILIKE '%CPU%' OR subject ILIKE '%memory%' OR subject ILIKE '%SNMP%' THEN 'resource'
      WHEN subject ILIKE '%Link status is up%' THEN 'link_up'
      ELSE 'other'
    END AS symptom) t,
  LATERAL (SELECT t.symptom, CASE t.symptom
      WHEN 'link_down' THEN 1
      WHEN 'unreachable' THEN 2
      WHEN 'restart' THEN 3
      WHEN 'agent_down' THEN 4
      WHEN 'resource' THEN 5
      ELSE 6
    END AS symptom_rank) s
);

CREATE INDEX IF NOT EXISTS alert_event_site_created_idx ON alert_event (site, created_at);

SELECT count(*) AS total,
       count(host) AS with_host,
       count(ip) AS with_ip,
       count(site) AS with_site,
       count(*) FILTER (WHERE site NOT LIKE 'NET-%') AS with_site_code,
       count(*) FILTER (WHERE device_type <> 'other') AS with_device_type,
       count(*) FILTER (WHERE symptom <> 'other') AS with_symptom
FROM alert_event;

SELECT device_type, tier, count(*) AS row_count FROM alert_event GROUP BY device_type, tier ORDER BY tier, row_count DESC;

SELECT symptom, symptom_rank, count(*) AS row_count FROM alert_event GROUP BY symptom, symptom_rank ORDER BY symptom_rank, row_count DESC;

SELECT alert_id, site, host, ip, device_type, symptom
FROM alert_event
WHERE site = 'NAGP1'
  AND created_at BETWEEN timestamptz '2026-10-11 10:15:00+05:30' AND timestamptz '2026-10-11 10:30:00+05:30'
ORDER BY created_at
LIMIT 5;
