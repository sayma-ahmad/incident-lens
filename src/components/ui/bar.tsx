import React from "react";

export interface BarProps extends React.HTMLAttributes<HTMLDivElement> {
  label: React.ReactNode;
  value?: React.ReactNode;
  percentage: number;
  barColor?: string;
  trackColor?: string;
  className?: string;
}

export function Bar({
  label,
  value,
  percentage,
  barColor = "bg-accent",
  trackColor = "bg-chip",
  className = "",
  ...props
}: BarProps) {
  const clamped = Math.max(0, Math.min(100, isNaN(percentage) ? 0 : percentage));

  return (
    <div className={`w-full space-y-1.5 ${className}`} {...props}>
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-heading truncate">{label}</span>
        {value !== undefined && (
          <span className="font-semibold text-body ml-2 shrink-0">{value}</span>
        )}
      </div>
      <div
        className={`h-2.5 w-full overflow-hidden rounded-full ${trackColor}`}
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={`h-full rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
