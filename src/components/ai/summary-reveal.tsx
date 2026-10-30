"use client";

import { useEffect, useState } from "react";

type SummaryRevealProps = {
  site: string;
  alerts: number;
  children: React.ReactNode;
};

const STEP_MS = 1400;

export function SummaryReveal({ site, alerts, children }: SummaryRevealProps) {
  const steps = [
    `Reading ${alerts.toLocaleString("en-IN")} alerts from ${site}`,
    "Ordering events by time and device layer",
    "Selecting the probable starting alert",
    "Writing the summary",
  ];
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setStep(steps.length);
      return;
    }
    const timer = window.setInterval(() => {
      setStep((s) => {
        if (s >= steps.length) {
          window.clearInterval(timer);
          return s;
        }
        return s + 1;
      });
    }, STEP_MS);
    return () => window.clearInterval(timer);
  }, [steps.length]);

  if (step >= steps.length) {
    return <div className="animate-summary-in">{children}</div>;
  }

  return (
    <section aria-live="polite" aria-busy="true" className="rounded-xl border border-line bg-surface p-6 shadow-xs">
      <div className="flex items-center gap-3">
        <span className="relative flex size-10 items-center justify-center rounded-full bg-accent/10 text-accent">
          <span className="absolute inset-0 animate-ping rounded-full bg-accent/15" />
          <svg className="relative size-5 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3z" />
          </svg>
        </span>
        <div>
          <p className="text-base font-bold text-heading">
            Preparing incident summary
            <span className="ml-1 inline-flex gap-0.5 align-middle" aria-hidden="true">
              <span className="size-1 animate-bounce rounded-full bg-accent [animation-delay:-0.3s]" />
              <span className="size-1 animate-bounce rounded-full bg-accent [animation-delay:-0.15s]" />
              <span className="size-1 animate-bounce rounded-full bg-accent" />
            </span>
          </p>
          <p className="text-xs text-muted">Looking at how these alerts relate to each other</p>
        </div>
      </div>

      <ul className="mt-5 space-y-3">
        {steps.map((label, i) => {
          const state = i < step ? "done" : i === step ? "active" : "pending";
          return (
            <li key={label} className="flex items-center gap-3 text-sm">
              {state === "done" ? (
                <span className="flex size-5 items-center justify-center rounded-full bg-accent text-white">
                  <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </span>
              ) : state === "active" ? (
                <span className="size-5 animate-spin rounded-full border-2 border-line border-t-accent" />
              ) : (
                <span className="size-5 rounded-full border-2 border-line" />
              )}
              <span className={state === "pending" ? "text-muted" : state === "active" ? "font-semibold text-heading" : "text-body"}>
                {label}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="mt-6 space-y-2.5" aria-hidden="true">
        <div className="h-3 w-11/12 animate-pulse rounded-full bg-chip" />
        <div className="h-3 w-full animate-pulse rounded-full bg-chip" />
        <div className="h-3 w-3/4 animate-pulse rounded-full bg-chip" />
      </div>
    </section>
  );
}
