"use client";

import { Dropdown } from "@/components/ui/Dropdown";
import type { Category } from "@/lib/catalog";

export function CategorySelect({
  categories,
  value,
  onChange,
  placeholder = "اختر التصنيف",
  className = "",
}: {
  categories: Category[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <Dropdown
      options={categories.map((c) => ({ value: c.id, label: c.name }))}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={className}
    />
  );
}
