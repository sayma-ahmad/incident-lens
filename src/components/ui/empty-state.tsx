import React from "react";

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  message: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  message,
  action,
  icon,
  className = "",
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-xl border border-dashed border-line bg-surface p-8 text-center sm:p-12 ${className}`}
      {...props}
    >
      {icon ? (
        <div className="mb-4 inline-flex size-12 items-center justify-center rounded-full bg-chip text-muted">
          {icon}
        </div>
      ) : (
        <div className="mb-4 inline-flex size-12 items-center justify-center rounded-full bg-chip text-muted">
          <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
      )}
      <h3 className="text-base font-semibold text-heading">{title}</h3>
      <p className="mt-1.5 max-w-md text-sm text-muted leading-relaxed">
        {message}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
