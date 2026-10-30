import React from "react";

export interface ProbableNoticeProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  children?: React.ReactNode;
}

export function ProbableNotice({
  className = "",
  children,
  ...props
}: ProbableNoticeProps) {
  return (
    <div
      role="note"
      className={`inline-flex items-center gap-2 rounded-lg border border-line bg-chip px-3 py-1.5 text-xs font-medium text-body ${className}`}
      {...props}
    >
      <span className="size-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
      <span>
        {children ??
          "Probable, needs engineer confirmation."}
      </span>
    </div>
  );
}
