import React from "react";

export interface ChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export function Chip({
  children,
  icon,
  className = "",
  ...props
}: ChipProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-chip px-2.5 py-0.5 text-xs font-medium text-heading ${className}`}
      {...props}
    >
      {icon && <span className="shrink-0 size-3.5 inline-flex items-center justify-center">{icon}</span>}
      <span>{children}</span>
    </span>
  );
}
