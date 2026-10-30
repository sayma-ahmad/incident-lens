import React from "react";

export interface ConfidenceBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  confidence: string | null | undefined;
  className?: string;
  showSuffix?: boolean;
}

export function ConfidenceBadge({
  confidence,
  className = "",
  showSuffix = false,
  ...props
}: ConfidenceBadgeProps) {
  const raw = (confidence ?? "low").toLowerCase().trim();
  const normalized = raw === "high" || raw === "medium" || raw === "low" ? raw : "low";

  const displayWord =
    normalized === "high" ? "High" : normalized === "medium" ? "Medium" : "Low";
  const displayText = showSuffix ? `${displayWord} confidence` : displayWord;

  const styleByLevel: Record<"high" | "medium" | "low", string> = {
    high: "bg-accent text-white border border-accent",
    medium: "bg-surface text-accent border border-accent",
    low: "bg-chip text-muted border border-line",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${styleByLevel[normalized]} ${className}`}
      {...props}
    >
      {displayText}
    </span>
  );
}
