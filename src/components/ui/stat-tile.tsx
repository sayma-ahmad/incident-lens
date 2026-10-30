import React from "react";

export interface StatTileProps extends React.HTMLAttributes<HTMLDivElement> {
  value: React.ReactNode;
  label: React.ReactNode;
  explanation?: React.ReactNode;
  className?: string;
}

export function StatTile({
  value,
  label,
  explanation,
  className = "",
  ...props
}: StatTileProps) {
  return (
    <div
      className={`rounded-xl border border-line bg-surface p-6 shadow-xs ${className}`}
      {...props}
    >
      <div className="text-3xl sm:text-4xl font-bold tracking-tight text-heading">
        {value}
      </div>
      <div className="mt-1 text-sm font-medium text-body">{label}</div>
      {explanation && (
        <div className="mt-1 text-xs text-muted leading-relaxed">
          {explanation}
        </div>
      )}
    </div>
  );
}
