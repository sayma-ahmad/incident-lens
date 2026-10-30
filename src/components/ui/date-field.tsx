"use client";

import { useEffect, useId, useRef, useState } from "react";

type DateFieldProps = {
  label: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  emphasis?: boolean;
};

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function parse(v: string): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!match) return null;
  return { y: Number(match[1]), m: Number(match[2]) - 1, d: Number(match[3]) };
}

function iso(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function todayIso() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  return parts;
}

function display(v: string) {
  const p = parse(v);
  if (!p) return "";
  return `${String(p.d).padStart(2, "0")} ${MONTHS[p.m]!.slice(0, 3)} ${p.y}`;
}

export function DateField({ label, name, value, defaultValue = "", onChange, placeholder = "Any date", emphasis = false }: DateFieldProps) {
  const [inner, setInner] = useState(defaultValue);
  const current = value ?? inner;
  const [open, setOpen] = useState(false);
  const start = parse(current) ?? parse(todayIso())!;
  const [view, setView] = useState({ y: start.y, m: start.m });
  const rootRef = useRef<HTMLDivElement>(null);
  const labelId = useId();
  const today = todayIso();

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function set(v: string) {
    if (value === undefined) setInner(v);
    onChange?.(v);
    setOpen(false);
  }

  function toggle() {
    if (!open) {
      const p = parse(current) ?? parse(today)!;
      setView({ y: p.y, m: p.m });
    }
    setOpen(!open);
  }

  function shift(delta: number) {
    setView((v) => {
      const m = v.m + delta;
      return { y: v.y + Math.floor(m / 12), m: ((m % 12) + 12) % 12 };
    });
  }

  const first = new Date(Date.UTC(view.y, view.m, 1)).getUTCDay();
  const offset = (first + 6) % 7;
  const daysInMonth = new Date(Date.UTC(view.y, view.m + 1, 0)).getUTCDate();
  const cells: (number | null)[] = [...Array<null>(offset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="block text-sm" ref={rootRef}>
      <span id={labelId} className={`mb-1.5 block ${emphasis ? "font-bold text-heading" : "font-medium text-body"}`}>
        {label}
      </span>
      <div className="relative">
        {name && <input type="hidden" name={name} value={current} />}
        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-labelledby={labelId}
          onClick={toggle}
          className={`flex w-full items-center justify-between gap-2 rounded-lg border bg-surface px-3 py-2 text-left transition outline-none hover:border-muted ${
            open ? "border-accent" : emphasis ? "border-accent/40" : "border-line"
          }`}
        >
          <span className={current ? "text-heading font-medium" : "text-muted"}>{current ? display(current) : placeholder}</span>
          <svg className="size-4 shrink-0 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
        </button>
        {open && (
          <div role="dialog" aria-labelledby={labelId} className="absolute left-0 z-50 mt-1.5 w-72 rounded-xl border border-line bg-surface p-4 shadow-lg">
            <div className="mb-3 flex items-center justify-between">
              <button type="button" aria-label="Previous month" onClick={() => shift(-1)} className="flex size-8 items-center justify-center rounded-lg text-body hover:bg-chip outline-none">
                <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m15 18-6-6 6-6" />
                </svg>
              </button>
              <span className="text-sm font-bold text-heading">
                {MONTHS[view.m]} {view.y}
              </span>
              <button type="button" aria-label="Next month" onClick={() => shift(1)} className="flex size-8 items-center justify-center rounded-lg text-body hover:bg-chip outline-none">
                <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center">
              {DAYS.map((d) => (
                <span key={d} className="py-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
                  {d}
                </span>
              ))}
              {cells.map((d, i) => {
                if (d == null) return <span key={`e${i}`} />;
                const v = iso(view.y, view.m, d);
                const isSelected = v === current;
                const isToday = v === today;
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => set(v)}
                    aria-pressed={isSelected}
                    className={`flex h-8 items-center justify-center rounded-lg text-sm outline-none transition ${
                      isSelected
                        ? "bg-accent font-bold text-white"
                        : isToday
                        ? "border border-accent font-semibold text-accent hover:bg-chip"
                        : "text-heading hover:bg-chip"
                    }`}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-line pt-3 text-xs font-semibold">
              <button type="button" onClick={() => set("")} className="rounded-md px-2 py-1 text-muted hover:bg-chip hover:text-heading outline-none">
                Clear
              </button>
              <button type="button" onClick={() => set(today)} className="rounded-md px-2 py-1 text-accent hover:bg-chip outline-none">
                Today
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
