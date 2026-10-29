"use client";

import React, { useState } from "react";

export interface DisclosureProps {
  title?: string;
  openLabel?: string;
  closeLabel?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
  badge?: React.ReactNode;
}

export function Disclosure({
  title,
  openLabel = "Show details",
  closeLabel = "Hide details",
  defaultOpen = false,
  children,
  className = "",
  badge,
}: DisclosureProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`rounded-xl border border-line bg-surface overflow-hidden ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between px-5 py-3.5 text-left text-sm font-medium text-heading hover:bg-chip/50 transition focus:outline-none focus:ring-2 focus:ring-accent"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-semibold">{title ? title : isOpen ? closeLabel : openLabel}</span>
          {badge && <span className="shrink-0">{badge}</span>}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted">
          <span>{title ? (isOpen ? closeLabel : openLabel) : null}</span>
          <svg
            className={`size-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>
      {isOpen && (
        <div className="border-t border-line px-5 py-4">
          {children}
        </div>
      )}
    </div>
  );
}
