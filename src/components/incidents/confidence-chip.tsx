const STYLES: Record<string, string> = {
  high: "bg-green-100 text-green-800 ring-green-300",
  medium: "bg-amber-100 text-amber-800 ring-amber-300",
  low: "bg-gray-100 text-gray-700 ring-gray-300",
};

export function ConfidenceChip({ confidence }: { confidence: string | null }) {
  const value = confidence ?? "low";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ring-1 ${STYLES[value] ?? STYLES.low}`}>
      {value}
    </span>
  );
}
