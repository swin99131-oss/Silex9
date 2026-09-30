"use client"

import Link from "next/link"
import { AlertTriangle } from "lucide-react"
import { useStore, toArabicNumber } from "@/components/store/store-context"

export function LowStock() {
  const { products } = useStore()
  const items = products.filter((p) => p.stock > 0 && p.stock <= 10).slice(0, 4)

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-full bg-orange-100 text-orange-700">
            <AlertTriangle aria-hidden="true" className="size-4" />
          </span>
          <h2 className="text-lg font-semibold">قاربت على النفاد</h2>
        </div>
        <Link href="/dashboard/inventory" className="text-xs text-muted underline">
          المخازن
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">لا توجد منتجات قاربت النفاد.</p>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((item) => (
            <li key={item.name} className="flex items-center justify-between gap-3 py-3">
              <span className="min-w-0 truncate text-sm font-medium">{item.name}</span>
              <span className="shrink-0 rounded-full bg-orange-100 px-3 py-1 text-[11px] text-orange-700">
                {toArabicNumber(item.stock)} وحدة
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
