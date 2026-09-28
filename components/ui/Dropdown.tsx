"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

export type DropdownOption = { value: string; label: string };

const DEFAULT_TRIGGER =
  "bg-chip rounded-2xl px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-ink/20";

export function Dropdown({
  options,
  value,
  onChange,
  placeholder = "اختر",
  className = "",
  disabled = false,
  direction = "down",
}: {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  direction?: "down" | "up";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`${className || DEFAULT_TRIGGER} w-full flex items-center justify-between gap-2 text-right disabled:opacity-50`}
      >
        <span className={selected ? "truncate" : "truncate text-muted"}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown size={16} className={`shrink-0 text-ink/50 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          role="listbox"
          className={`absolute right-0 z-50 ${direction === "up" ? "bottom-full mb-2" : "top-full mt-2"} min-w-full w-max max-w-[calc(100vw-2rem)] max-h-64 overflow-y-auto rounded-2xl border border-line bg-card p-1.5 shadow-float`}
        >
          {options.map((o) => {
            const active = o.value === value;
            return (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-right text-sm transition-colors hover:bg-chip ${
                  active ? "bg-chip font-semibold" : ""
                }`}
              >
                {o.label}
                {active && <Check size={14} className="text-ink" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
