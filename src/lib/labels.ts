const MATCH_METHOD_LABELS: Record<string, string> = {
  numeric_correlation_id: "Incident: correlation ID = Alfa number",
  prefixed_correlation_id: "Incident: correlation ID = full Alfa ID",
  service_request_numeric_correlation_id: "Service request: correlation ID = Alfa number",
  service_request_prefixed_correlation_id: "Service request: correlation ID = full Alfa ID",
  incident_number_in_alfa_subject: "Incident number found in Alfa subject (candidate)",
  exact_subject_time_within_10m: "Same subject, created within 10 min (candidate)",
};

const REASON_LABELS: Record<string, string> = {
  SAME_SITE: "Same site",
  SAME_SUBNET: "Same subnet",
  TIME_WINDOW: "Within 15-min window",
  DOWNSTREAM_TIER: "Downstream device",
  REPEAT: "Repeat alert",
};

const CONFIDENCE_LABELS: Record<string, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

function humanize(value: string) {
  const text = value.replace(/_/g, " ").toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function matchMethodLabel(value: string | null | undefined) {
  if (!value) return "—";
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean)
    .map((v) => MATCH_METHOD_LABELS[v] ?? humanize(v))
    .join("; ");
}

export function reasonLabel(value: string) {
  return REASON_LABELS[value] ?? humanize(value);
}

export function confidenceLabel(value: string | null | undefined) {
  if (!value) return "—";
  return CONFIDENCE_LABELS[value.toLowerCase()] ?? humanize(value);
}
