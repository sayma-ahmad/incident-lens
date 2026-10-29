"use client";

import React, { useState } from "react";
import { SectionLabel } from "./section-label";

export interface PageHeaderProps {
  sectionLabel?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  howToRead?: string[] | React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  sectionLabel,
  title,
  description,
  howToRead,
  actions,
  className = "",
}: PageHeaderProps) {
  const [showHowToRead, setShowHowToRead] = useState(false);

  const hasHowToRead = Boolean(howToRead && (Array.isArray(howToRead) ? howToRead.length > 0 : true));

  return (
    <header className={`space-y-4 pb-6 border-b border-line ${className}`}>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1.5 min-w-0 flex-1">
          {sectionLabel && (
            <div>
              <SectionLabel>{sectionLabel}</SectionLabel>
            </div>
          )}
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-heading">
            {title}
          </h1>
          {description && (
            <p className="text-sm sm:text-base text-body leading-relaxed max-w-3xl">
              {description}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {hasHowToRead && (
            <button
              type="button"
              onClick={() => setShowHowToRead((prev) => !prev)}
              aria-expanded={showHowToRead}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-body hover:bg-chip hover:text-heading transition focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <svg
                className="size-4 text-accent"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <span>How to read this page</span>
              <svg
                className={`size-3.5 transition-transform duration-200 ${showHowToRead ? "rotate-180" : ""}`}
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
            </button>
          )}
          {actions}
        </div>
      </div>

      {hasHowToRead && showHowToRead && (
        <div className="rounded-xl border border-line bg-chip/60 p-4 sm:p-5 text-sm transition-all duration-200">
          <div className="flex items-center gap-2 font-semibold text-heading mb-2">
            <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
            <span>How to read this page</span>
          </div>
          {Array.isArray(howToRead) ? (
            <ul className="list-disc space-y-1.5 pl-5 text-body text-xs sm:text-sm">
              {howToRead.map((bullet, idx) => (
                <li key={idx} className="leading-relaxed">
                  {bullet}
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-body text-xs sm:text-sm">{howToRead}</div>
          )}
        </div>
      )}
    </header>
  );
}
