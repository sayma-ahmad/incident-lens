"use client";

import { useEffect, useId, useRef, useState } from "react";

export type SelectOption = { value: string; label: string };

type SelectFieldProps = {
  label: string;
  options: SelectOption[];
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  emphasis?: boolean;
};

export function SelectField({ label, options, name, value, defaultValue = "", onChange, emphasis = false }: SelectFieldProps) {
  const [inner, setInner] = useState(defaultValue);
  const current = value ?? inner;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const labelId = useId();
  const selected = options.find((o) => o.value === current) ?? options[0];

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  function choose(v: string) {
    if (value === undefined) setInner(v);
    onChange?.(v);
    setOpen(false);
  }

  function openList() {
    setActive(Math.max(0, options.findIndex((o) => o.value === current)));
    setOpen(true);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      openList();
      return;
    }
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(options.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const o = options[active];
      if (o) choose(o.value);
    }
  }

  return (
    <div className="block text-sm" ref={rootRef}>
      <span id={labelId} className={`mb-1.5 block ${emphasis ? "font-bold text-heading" : "font-medium text-body"}`}>
        {label}
      </span>
      <div className="relative">
        {name && <input type="hidden" name={name} value={current} />}
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-labelledby={labelId}
          aria-controls={listId}
          onClick={() => (open ? setOpen(false) : openList())}
          onKeyDown={onKeyDown}
          className={`flex w-full items-center justify-between gap-2 rounded-lg border bg-surface px-3 py-2 text-left text-heading transition outline-none hover:border-muted ${
            open ? "border-accent" : emphasis ? "border-accent/40" : "border-line"
          }`}
        >
          <span className="truncate">{selected?.label}</span>
          <svg
            className={`size-4 shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
        {open && (
          <ul
            id={listId}
            role="listbox"
            aria-labelledby={labelId}
            className="absolute left-0 right-0 z-50 mt-1.5 max-h-64 overflow-auto rounded-xl border border-line bg-surface p-1.5 shadow-lg"
          >
            {options.map((o, i) => {
              const isSelected = o.value === current;
              return (
                <li
                  key={o.value || "all"}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    choose(o.value);
                  }}
                  className={`flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 ${
                    i === active ? "bg-chip text-heading" : "text-body"
                  } ${isSelected ? "font-semibold text-accent" : ""}`}
                >
                  <span className="truncate">{o.label}</span>
                  {isSelected && (
                    <svg className="size-4 shrink-0 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
