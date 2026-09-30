"use client"

import Link from "next/link"
import { Wallet } from "lucide-react"
import { useStore, formatIQD, toArabicNumber } from "@/components/store/store-context"

export function DebtsSummary() {
  const { debtors } = useStore()
  const active = debtors.filter((d) => !d.paid)
  const overdue = active.filter((d) => d.overdue)
  const total = active.reduce((s, d) => s + d.amount, 0)

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-full bg-orange-100 text-orange-700">
            <Wallet aria-hidden="true" className="size-4" />
          </span>
          <h2 className="text-lg font-semibold">ملخص الديون</h2>
        </div>
        <Link href="/dashboard/debts" className="text-xs text-muted underline">
          عرض الكل
        </Link>
      </div>

      {active.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">لا توجد ديون مسجّلة حالياً.</p>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted">إجمالي الديون النشطة</span>
            <span className="text-lg font-semibold">{formatIQD(total)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted">الزبائن المتأخرون</span>
            <span
              className={`rounded-full px-3 py-1 text-[11px] ${
                overdue.length ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"
              }`}
            >
              {toArabicNumber(overdue.length)}
            </span>
          </div>
        </div>
      )}
    </section>
  )
}
