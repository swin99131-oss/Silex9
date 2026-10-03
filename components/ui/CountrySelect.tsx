"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";

export type CountryOption = {
  value: string;
  label: string;
  shortLabel?: string;
};

export function CountrySelect({
  options,
  value,
  onChange,
  placeholder = "اختر الدولة",
  searchPlaceholder = "ابحث عن دولة...",
  className = "",
  triggerDir = "rtl",
}: {
  options: CountryOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  triggerDir?: "rtl" | "ltr";
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const selected = options.find((option) => option.value === value);
  const filtered = options.filter((option) =>
    `${option.label} ${option.shortLabel ?? ""} ${option.value}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  );

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    searchRef.current?.focus();
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  return (
    <div ref={rootRef} className="relative min-w-0">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        dir={triggerDir}
        className={`flex w-full items-center justify-between gap-2 ${triggerDir === "ltr" ? "text-left" : "text-right"} ${className || "rounded-xl border border-line/40 bg-chip px-4 py-2.5 text-sm"}`}
      >
        <span className={selected ? "truncate" : "truncate text-muted"}>
          {selected ? selected.shortLabel ?? selected.label : placeholder}
        </span>
        <ChevronDown size={16} className={`shrink-0 text-ink/50 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-line/60 bg-card p-2 shadow-float">
          <label className="flex h-10 items-center gap-2 rounded-xl border border-line/50 bg-paper px-3">
            <Search size={15} className="shrink-0 text-muted" />
            <input
              ref={searchRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && filtered[0]) {
                  event.preventDefault();
                  onChange(filtered[0].value);
                  setOpen(false);
                }
              }}
              placeholder={searchPlaceholder}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
            />
          </label>
          <div role="listbox" className="mt-2 max-h-64 overflow-y-auto">
            {filtered.length ? filtered.map((option) => {
              const active = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={`flex min-h-10 w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-right text-sm transition-colors hover:bg-chip ${active ? "bg-chip font-semibold" : ""}`}
                >
                  <span className="truncate">{option.label}</span>
                  {active && <Check size={15} className="shrink-0 text-primary" />}
                </button>
              );
            }) : (
              <p className="px-3 py-5 text-center text-xs text-muted">لا توجد دولة بهذا الاسم</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
