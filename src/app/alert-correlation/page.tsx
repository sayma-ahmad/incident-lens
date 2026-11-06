"use client";

import { AlertAnalysisDashboard } from "@/components/alert-correlation/alert-analysis-dashboard";

export default function AlertCorrelationPage() {
  return (
    <AlertAnalysisDashboard
      sectionLabel="STEP 3 · ANALYZE"
      title="Alert Analysis"
      description="Inspect distinct alert tickets across physical sites, network layers, explicit device hostnames, and interfaces with multi-stage upstream correlation and verified team routing."
    />
  );
}
