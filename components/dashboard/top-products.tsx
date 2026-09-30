"use client"

import Link from "next/link"
import { Star } from "lucide-react"
import { useStore, formatIQD, toArabicNumber } from "@/components/store/store-context"

export function TopProducts() {
  const { topProducts } = useStore()

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Star aria-hidden="true" className="size-4" />
          </span>
          <h2 className="text-lg font-semibold">المنتجات الأكثر مبيعاً</h2>
        </div>
        <Link href="/dashboard/analytics" className="text-xs text-muted underline">
          التحليل
        </Link>
      </div>

      {topProducts.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">لا توجد مبيعات مسجّلة بعد.</p>
      ) : (
        <ul className="divide-y divide-border">
          {topProducts.map((p, i) => (
            <li key={p.name} className="flex items-center justify-between gap-3 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-chip text-xs font-semibold">
                  {toArabicNumber(i + 1)}
                </span>
                <span className="truncate text-sm font-medium">{p.name}</span>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="text-xs text-muted">{toArabicNumber(p.quantity)} وحدة</span>
                <span className="text-sm font-semibold text-emerald-700">{formatIQD(p.total)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
