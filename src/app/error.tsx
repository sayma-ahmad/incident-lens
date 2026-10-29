"use client";

import { useEffect } from "react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <main className="mx-auto max-w-7xl p-6">
      <div className="rounded-xl border border-line bg-surface p-8 shadow-xs text-center max-w-xl mx-auto space-y-4">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-accent/10 text-accent">
          <svg
            className="size-6"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>

        <h2 className="text-xl font-bold text-heading">
          Something went wrong
        </h2>

        <p className="text-sm text-body leading-relaxed">
          {error?.message || "An unexpected error occurred while loading this page."}
        </p>

        <div className="pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex min-h-[40px] items-center justify-center rounded-lg bg-panel px-5 py-2 text-sm font-semibold text-on-panel transition hover:bg-panel/90 focus:outline-none focus:ring-2 focus:ring-accent"
          >
            Retry
          </button>
        </div>
      </div>
    </main>
  );
}
