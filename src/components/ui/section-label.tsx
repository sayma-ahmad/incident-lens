import React from "react";

export interface SectionLabelProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
}

export function SectionLabel({ children, className = "", ...props }: SectionLabelProps) {
  return (
    <span
      className={`text-xs font-bold uppercase tracking-wider text-accent ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
