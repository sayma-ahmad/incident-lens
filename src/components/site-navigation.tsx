"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAVIGATION_LINKS = [
  { label: "Home", href: "/" },
  { label: "1 Tickets", href: "/tickets" },
  { label: "2 Data check", href: "/reports/data" },
  { label: "3 Baseline", href: "/reports/baseline" },
  { label: "4 Incidents", href: "/incidents" },
  { label: "5 AI Insights", href: "/ai-insights" },
  { label: "6 Scorecard", href: "/scorecard" },
];

const GLOSSARY_ITEMS = [
  {
    term: "Ticket",
    definition: "A record in MSOLVE (ServiceNow) or AlfaNow.",
  },
  {
    term: "Alert",
    definition: "An automatic AlfaNow ticket raised by monitoring when a device has a problem.",
  },
  {
    term: "Link / copy",
    definition: "The same issue recorded in both MSOLVE and AlfaNow.",
  },
  {
    term: "Incident (group)",
    definition: "Alerts from the same site close together in time, grouped as one probable problem.",
  },
  {
    term: "Probable cause (root alert)",
    definition: "The alert in a group most likely to be the starting point.",
  },
  {
    term: "Repeat",
    definition: "The same device reporting the same problem again within 10 minutes.",
  },
  {
    term: "Confidence",
    definition: "How strong the evidence for a group is, shown as High, Medium, or Low.",
  },
  {
    term: "Site code",
    definition: "The short code in a device name, such as NAGP1. Full site names are not currently available.",
  },
  {
    term: "Shadow mode",
    definition: "The POC only reads data and provides suggestions. People make the final decisions.",
  },
];

export function SiteNavigation() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const glossaryRef = useRef<HTMLDivElement>(null);

  // Close menus on path change
  useEffect(() => {
    setMobileMenuOpen(false);
    setGlossaryOpen(false);
  }, [pathname]);

  // Close glossary on outside click or Escape
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setGlossaryOpen(false);
        setMobileMenuOpen(false);
      }
    }

    function handleClickOutside(event: MouseEvent) {
      if (
        glossaryRef.current &&
        !glossaryRef.current.contains(event.target as Node)
      ) {
        setGlossaryOpen(false);
      }
    }

    if (glossaryOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [glossaryOpen]);

  function isLinkActive(href: string) {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur-xs">
      <nav
        aria-label="Primary navigation"
        className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6"
      >
        {/* Brand wordmark with red square mark */}
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-base font-bold tracking-tight text-heading hover:opacity-90 transition focus:outline-none focus:ring-2 focus:ring-accent rounded-sm"
          >
            <span
              className="size-2.5 rounded-[2px] bg-accent"
              aria-hidden="true"
            />
            <span>Incident Lens</span>
          </Link>

          {/* Desktop links */}
          <div className="hidden lg:flex items-center gap-1 xl:gap-2">
            {NAVIGATION_LINKS.map((link) => {
              const active = isLinkActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-2.5 py-1.5 text-xs xl:text-sm font-medium transition ${
                    active
                      ? "text-accent border-b-2 border-accent font-semibold"
                      : "text-body hover:text-heading border-b-2 border-transparent"
                  } focus:outline-none focus:ring-2 focus:ring-accent rounded-sm`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Right side items */}
        <div className="flex items-center gap-3">
          {/* Shadow mode pill with tooltip */}
          <div className="relative group">
            <span
              tabIndex={0}
              aria-label="Shadow mode: Nothing is written back to ServiceNow"
              className="inline-flex items-center gap-1.5 rounded-full bg-chip px-2.5 py-1 text-xs font-semibold text-muted border border-line cursor-help focus:outline-none focus:ring-2 focus:ring-accent select-none"
            >
              <span className="size-1.5 rounded-full bg-muted" aria-hidden="true" />
              <span>Shadow mode</span>
            </span>
            <div
              role="tooltip"
              className="pointer-events-none absolute right-0 top-full mt-2 hidden w-56 rounded-lg bg-panel p-2.5 text-center text-xs text-on-panel shadow-lg group-hover:block group-focus-within:block z-50 border border-panel"
            >
              Nothing is written back to ServiceNow
            </div>
          </div>

          {/* Glossary popover trigger */}
          <div className="relative" ref={glossaryRef}>
            <button
              type="button"
              onClick={() => setGlossaryOpen((prev) => !prev)}
              aria-expanded={glossaryOpen}
              aria-haspopup="dialog"
              aria-label="Glossary of terms"
              title="Glossary of terms"
              className="inline-flex size-8 items-center justify-center rounded-full border border-line bg-surface text-xs font-bold text-heading hover:bg-chip hover:text-accent transition focus:outline-none focus:ring-2 focus:ring-accent"
            >
              ?
            </button>

            {glossaryOpen && (
              <div
                role="dialog"
                aria-label="Incident Lens Glossary"
                className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-xl border border-line bg-surface p-5 shadow-xl z-50 text-left"
              >
                <div className="flex items-center justify-between border-b border-line pb-3">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-accent" aria-hidden="true" />
                    <h3 className="text-sm font-bold text-heading tracking-tight">
                      Glossary of terms
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setGlossaryOpen(false)}
                    aria-label="Close glossary"
                    className="rounded-md p-1 text-muted hover:bg-chip hover:text-heading focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>

                <dl className="mt-3 max-h-[70vh] overflow-y-auto divide-y divide-line pr-1 space-y-2.5 text-xs">
                  {GLOSSARY_ITEMS.map((item) => (
                    <div key={item.term} className="pt-2.5 first:pt-0">
                      <dt className="font-semibold text-heading">{item.term}</dt>
                      <dd className="mt-0.5 text-body leading-relaxed">{item.definition}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </div>

          {/* Mobile hamburger button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle navigation menu"
            className="lg:hidden inline-flex size-9 items-center justify-center rounded-lg border border-line bg-surface text-heading hover:bg-chip focus:outline-none focus:ring-2 focus:ring-accent"
          >
            {mobileMenuOpen ? (
              <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            )}
          </button>
        </div>
      </nav>

      {/* Collapsible mobile navigation menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-line bg-surface px-4 py-4 space-y-1 shadow-lg">
          {NAVIGATION_LINKS.map((link) => {
            const active = isLinkActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`block rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-accent/10 text-accent font-semibold"
                    : "text-body hover:bg-chip hover:text-heading"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
