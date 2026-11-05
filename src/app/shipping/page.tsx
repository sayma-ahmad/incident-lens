"use client";

import { AlertAnalysisDashboard } from "@/components/alert-correlation/alert-analysis-dashboard";

export default function ShippingPage() {
  return (
    <AlertAnalysisDashboard
      sectionLabel="SHIPPING · ALERT ANALYSIS & CORRELATION"
      title="Shipping Alert Analysis"
      description="Operational shipping view: inspect distinct alert tickets, detect upstream failure triggers, and correlate cascading anomalies across sites and dependent network devices."
    />
  );
}
