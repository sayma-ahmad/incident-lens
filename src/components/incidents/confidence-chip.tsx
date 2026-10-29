import { ConfidenceBadge } from "@/components/ui/confidence-badge";

export { ConfidenceBadge };

export function ConfidenceChip({ confidence }: { confidence: string | null }) {
  return <ConfidenceBadge confidence={confidence} />;
}
